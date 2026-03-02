# Bug 追踪与修复记录

本文档集中记录项目中的已知问题与修复方案，供后续开发与大模型参考。新问题请按下方格式追加到文档末尾。

---

## 1. 40001 invalid credential 在取消授权后再次扫码授权仍报错

### 问题描述

- **现象**：用户扫码授权绑定小程序代开发 → 取消授权 → 再次扫码授权后，调用该小程序相关接口（如获取版本、提交代码等）时返回：
  ```json
  { "errcode": 40001, "errmsg": "invalid credential, access_token is invalid or not latest", "rid": "..." }
  ```
- **影响**：再次授权后无法正常使用代开发能力，需重启服务或等待旧 token 过期才能恢复。
- **复现路径**：授权 → 取消授权（触发 `unauthorized` 回调）→ 再次扫码授权（触发 `authorized`）→ 任意需 authorizer_access_token 的接口调用。

### 根因分析

1. 取消授权时的处理（`api/wxcallback/component.go` 的 `unAuthHander`）仅调用了 `dao.DelAuthorizerRecord(appid)`，删除了 `authorizers` 表中的授权记录（含 `refresh_token`）。
2. 未清理的内容：
   - **内存缓存**：`comm/wx/token.go` 中 `getAccessToken` 会先从 `db.GetCache()` 读取 token，取消授权后该 appid 的 authorizer_access_token 仍留在缓存中。
   - **数据库**：`wxtoken` 表中该 appid、类型为 `WXTOKENTYPE_AUTH` 的 access_token 记录未被删除。
3. 再次授权后：`newAuthHander` 会写入新的 `refresh_token` 到 `authorizers`，但下一次接口请求取 token 时若命中缓存或从 DB 读到未过期的旧 token，就会使用已失效的 access_token → 40001。

**结论**：取消授权时没有使该小程序的 authorizer_access_token（缓存 + DB）失效。

### 修复方案

在收到微信「取消授权」回调时，除删除授权记录外，同时清除该 appid 的 authorizer_access_token 的缓存与数据库记录。

| 文件 | 变更说明 |
|------|----------|
| `api/wxcallback/component.go` | `unAuthHander` 中在 `DelAuthorizerRecord` 后调用 `wx.InvalidateAuthorizerToken(record.AuthorizerAppid)` |
| `comm/wx/token.go` | 新增 `InvalidateAuthorizerToken(appid)`：清缓存 + 调用 `dao.DelAccessToken(appid, model.WXTOKENTYPE_AUTH)` |
| `db/dao/wxtoken.go` | 新增 `DelAccessToken(appid, tokenType)`，按 appid 与类型删除 wxtoken 记录 |

### 相关逻辑（供参考）

- Token 获取顺序（`getAccessToken`）：先读内存缓存 → 再读 `wxtoken` 表 → 若无或已过期则用 `refresh_token` 调微信接口刷新并写回缓存与 DB。
- 取消授权：微信推送 `InfoType=unauthorized`，含 `AuthorizerAppid`，由 `unAuthHander` 处理。
- 再次授权：推送 `authorized`，由 `newAuthHander` 处理并写入新 refresh_token；首次请求因缓存/DB 已清空会走刷新逻辑，拿到新 token。

---

## 后续问题模板（追加时复制使用）

```markdown
## N. 问题简短标题

### 问题描述
- 现象、影响、复现路径

### 根因分析
- 原因说明

### 修复方案
- 涉及文件与变更要点

### 相关逻辑（可选）
- 便于大模型/后续维护的说明
```
