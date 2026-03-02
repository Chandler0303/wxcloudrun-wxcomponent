# wxcloudrun-wxcomponent 代码说明

本文档描述微信云托管第三方平台管理工具（微管家）的代码结构、模块职责与主要接口，便于二次开发与维护。

---

## 一、项目概述

- **用途**：第三方平台后端服务 + 微管家管理后台，可部署到微信云托管。
- **技术栈**：后端 Go（Gin）、前端 React + TypeScript（Vite）、数据库 MySQL。
- **命名约定**：
  - 微信开放平台接口：下划线
  - 微管家前后端交互：小驼峰
  - 微信回调消息：大驼峰

---

## 二、目录结构

```
.
├── api/                    # 后端 API
│   ├── admin/              # 管理后台接口（需 JWT）
│   ├── authpage/           # 授权页接口（无鉴权）
│   ├── innerservice/       # 内部服务（如 token 查询）
│   ├── proxy/              # 代理
│   └── wxcallback/         # 接收微信推送（ticket/授权/消息）
├── client/                 # 前端 SPA
│   └── src/
│       ├── config/         # 路由、菜单
│       ├── pages/          # 页面
│       └── utils/          # 请求封装、API 定义
├── comm/                   # 公共模块
│   ├── config/             # 配置
│   ├── encrypt/            # 加解密
│   ├── errno/              # 错误码
│   ├── wx/                 # 微信 API 封装（token、请求）
│   └── ...
├── db/
│   ├── dao/                # 数据访问
│   └── model/              # 数据模型
├── middleware/             # 中间件（JWT、日志、微信来源）
├── routers/                # 路由注册
├── main.go                 # 入口（外部 :80 + 内部 127.0.0.1:8081）
└── .air.toml               # Air 热重载配置
```

---

## 三、服务与路由

### 3.1 进程与端口

- **外部服务**：`:80`，对外提供微管家页面与 `/wxcomponent` 下所有 API。
- **内部服务**：`127.0.0.1:8081`，仅内网调用的内部接口（如 token 查询）。

根路由在 `routers/routers.go` 中注册：微信回调、微管家（admin + authpage）、静态资源、NoRoute 走 proxy。

### 3.2 基础路径

- 微管家前后端统一前缀：`/wxcomponent`。
- 管理后台接口：`/wxcomponent/admin/*`，除登录外均需 JWT（`middleware.JWTMiddleWare`）。

---

## 四、管理后台 API（api/admin）

以下为 `api/admin/routers.go` 中注册的接口说明。

### 4.1 认证与 Token

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | /auth | 登录，获取 JWT |
| GET | /admin/refresh-auth | 刷新 JWT（需带原 Token） |
| GET | /admin/ticket | 获取 component_verify_ticket |
| GET | /admin/component-access-token | 第三方 component_access_token |
| GET | /admin/authorizer-access-token | 授权者 authorizer_access_token（query: appid） |
| GET | /admin/cloudbase-access-token | 云托管开放接口 access_token |

### 4.2 消息与事件

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/wx-component-records | 授权事件 URL 推送记录 |
| GET | /admin/wx-biz-records | 消息与事件 URL 推送记录 |
| GET | /admin/callback-config | 回调配置 |
| GET/POST/PUT/DELETE | /admin/callback-proxy-rule(-list) | 消息转发规则 CRUD |
| POST | /admin/callback-test | 测试转发规则 |

### 4.3 授权账号

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /admin/pull-authorizer-list | 拉取授权列表（同步到库） |
| GET | /admin/authorizer-list | 查询授权账号列表 |

### 4.4 代开发小程序管理（核心业务）

**列表与信息**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/dev-weapp-list | 代开发小程序列表（支持 appid/name/regionType 筛选） |
| POST | /admin/update-dev-weapp | 更新代开发小程序（局点 regionType、extJsonConfig） |

**代码与版本**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/dev-versions | 版本详情（体验版/正式版等） |
| POST | /admin/commit-code | 提交代码（单小程序） |
| POST | /admin/batch-commit-code | 批量提交代码（最多 20 个，各用库中 extJson） |
| POST | /admin/release-code | 发布代码 |
| POST | /admin/rollback-release-version | 回滚发布版本 |

**审核**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /admin/submit-audit | 提交审核（单） |
| POST | /admin/batch-submit-audit | 批量提交审核（最多 20 个） |
| POST | /admin/revoke-audit | 撤回审核 |
| POST | /admin/speed-up-audit | 加急审核 |

**模板与草稿**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/template-list | 模板列表 |
| POST | /admin/del-template | 删除模板（body: templateId） |
| GET | /admin/template-draft-list | 模板草稿列表 |
| POST | /admin/add-template-draft | 草稿添加到模板库（body: draftId） |

**其它能力**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/qrcode | 正式版小程序码 |
| GET | /admin/exp-qrcode | 体验版二维码 |
| GET | /admin/page-list | 小程序页面列表 |
| GET | /admin/category | 类目 |
| POST | /admin/upload-media | 上传素材 |
| POST | /admin/change-visit-status | 修改服务状态（访客开关等） |
| GET/POST | /admin/privacy-setting | 获取/设置隐私协议（含 owner 联系方式校验） |
| GET/POST | /admin/modify-domain | 获取/设置服务器域名（request/upload/download 等） |
| GET/POST | /admin/modify-webview-domain | 获取/设置业务域名（action: get/set/add/delete） |
| POST | /admin/jump-domain-confirm-file | 获取业务域名校验文件内容 |

### 4.5 设置与用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | /admin/secret | 查询/设置第三方 Secret |
| POST | /admin/componentinfo | 设置第三方平台信息 |
| POST | /admin/username | 修改管理员用户名 |
| POST | /admin/userpwd | 修改管理员密码 |
| GET/POST | /admin/proxy | 代理配置 |

---

## 五、微信回调（api/wxcallback）

- **授权事件 URL**：接收 ticket、授权/取消授权等；处理逻辑在 `api/wxcallback/component.go`。
  - 授权成功：写入/更新 `authorizers`，含 `RegionType` 等。
  - 取消授权：删除授权记录并调用 `wx.InvalidateAuthorizerToken(appid)` 使授权者 token 失效。
- **消息与事件 URL**：业务消息在 `api/wxcallback/biz.go`，可落库、转发等。

---

## 六、数据库与模型（db）

### 6.1 主要表

| 表名 | 说明 |
|------|------|
| authorizers | 授权账号（appid、昵称、refresh_token、funcinfo、regiontype、extjson 等） |
| wxtoken | component_access_token、authorizer_access_token 缓存 |
| wxcallback_component | 授权事件 URL 推送记录 |
| wxcallback_biz | 消息与事件 URL 推送记录 |
| wxcallback_rules | 消息转发规则 |
| user | 管理后台用户 |
| comm | ticket、第三方信息等 |
| counter | 登录失败计数等 |

### 6.2 代开发相关字段（authorizers）

- `regiontype`：局点（如国内/海外）。
- `extjson`：JSON 字符串，内部含 `config`（或兼容字段 `remark`），用于发版时 ext_json；前端展示为 `extJsonConfig`，由后端 `parseExtJsonConfig` 解析。

DAO 层在 `db/dao/authorzer.go`，如 `GetDevWeAppRecords(offset, count, appid, name, regionType)`、`UpdateAuthorizerInfo`、`GetAuthorizerRecords` 等。

---

## 七、前端结构（client）

### 7.1 技术栈

- React、TypeScript、Vite、TDesign（tdesign-react）。
- 请求封装与 API 定义：`client/src/utils/axios.ts`、`client/src/utils/apis.ts`。
- 开发时代理：请求前缀 `/api/wxcomponent` 代理到后端，生产使用 `/wxcomponent`。

### 7.2 路由与菜单

- 路由配置：`client/src/config/route.tsx`。
- 菜单配置：`client/src/config/menu.tsx`（可在此隐藏/展示子项）。

主要页面路由示例：

| 路径 | 页面 | 说明 |
|------|------|------|
| /home | Home | 首页 |
| /authorizedAccountManage | AuthorizedAccountManage | 授权帐号（代开发）管理 |
| /authorizedAccountManage/miniProgramVersion | MiniProgramVersion | 版本管理 |
| /authorizedAccountManage/submitAudit | SubmitAudit | 提交审核 |
| /templateLibraryManage | TemplateLibraryManage | 模板库管理 |
| /authPageManage | AuthPageManage | 授权链接生成 |
| /passwordManage | PasswordManage | Secret 与密码 |
| /developTools | DevelopTools | 开发调试（Token、消息） |
| /proxyConfig | ProxyConfig | 代理配置 |

### 7.3 代开发相关组件（部分）

- `AuditStatusTag`：展示审核状态（通过/不通过/审核中/已撤回/延后）。
- `BatchSubmitAuditDialog`：批量提交审核弹窗（选小程序 + 审核配置）。
- `BatchCommitCodeDialog`：批量发体验版（选模板、版本号、描述，extJson 用各小程序库内配置）。
- `ExtJsonConfigDialog`：编辑 extJson 配置。
- `DomainSettingDialog`：服务器域名配置。
- `WebviewDomainSettingDialog`：业务域名配置。
- `PrivacySettingDialog`：隐私协议与联系方式。
- `RegionTypeDialog`：局点设置。

---

## 八、公共模块（comm）

- **comm/wx**：调用微信 API（component token、authorizer token、带 token 的 GET/POST、长超时 commit 等）、ticket 处理、授权者 token 失效。
- **comm/errno**：统一错误码与响应结构。
- **comm/config**：服务配置、数据库、是否使用云托管 token 等。
- **comm/encrypt**：消息加解密（如需）。

---

## 九、开发与部署

- **本地**：复制 `.env.example` 为 `.env`，配置数据库与 `WX_APPID`，执行 `go run main` 或使用 `air` 热重载。
- **热重载**：根目录执行 `air`，由 `.air.toml` 指定监听 go/tpl/tmpl/html、排除 client 等。
- **云托管**：部署后需在「系统管理 - Secret与密码管理」配置第三方 Secret，并在开放平台配置授权事件 URL、消息与事件 URL；若自建部署，需在服务中配置 MYSQL_*、WX_APPID 等环境变量，并按要求配置开放接口服务与接口白名单。

---

## 十、扩展与二开提示

1. **新增管理后台接口**：在 `api/admin` 增加 handler，在 `api/admin/routers.go` 注册；若需新 API 定义，在 `client/src/utils/apis.ts` 增加并给对应 method/url。
2. **新增页面**：在 `client/src/config/route.tsx` 增加路由，在 `client/src/config/menu.tsx` 中挂到对应菜单下；如需隐藏菜单项，可使用 `hideItem`。
3. **微信新能力**：在 `comm/wx` 中封装新接口（注意命名与 token 类型），在 `api/admin` 中增加对应 handler 与路由。
4. **数据表**：在 `db/model` 增加结构体，在 `db/dao` 增加方法，必要时在 `db/init.go` 或迁移中处理表结构。

以上为当前仓库的代码说明，便于快速定位与扩展功能。
