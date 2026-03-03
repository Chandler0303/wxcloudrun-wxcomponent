# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

微信第三方平台管理工具（微管家），为微信第三方平台提供后端服务和管理界面。

- 后端：Go 1.17 + Gin + GORM + MySQL
- 前端：React 17 + Vite + TypeScript + TDesign React
- 部署：微信云托管

## 开发命令

### 后端开发

```bash
# 热重载开发（推荐）
air

# 直接运行
go run main.go

# 构建
go build -o ./tmp/main.exe .
```

### 前端开发

```bash
cd client

# 安装依赖
yarn
# 或
npm install

# 启动开发服务器
yarn dev
# 或
npm run dev

# 构建生产版本
yarn build
# 或
npm run build
```

### 环境配置

复制 `.env.example` 为 `.env` 并配置：
- `MYSQL_USERNAME`: 数据库用户名
- `MYSQL_PASSWORD`: 数据库密码
- `MYSQL_ADDRESS`: 数据库地址
- `WX_APPID`: 微信 AppID

## 架构说明

### 双服务架构

应用启动两个独立的 HTTP 服务（main.go）：
- **内部服务**：127.0.0.1:8081 - 提供内部接口
- **外部服务**：:80 - 对外提供服务

### 目录结构

```
api/
├── admin/          # 管理工具接口（需 JWT 认证）
├── authpage/       # 授权页面接口（无鉴权）
├── innerservice/   # 内部服务接口
├── proxy/          # 代理接口
└── wxcallback/     # 微信回调接口

client/
├── src/
│   ├── custom/     # 二次开发代码区（升级时保留）
│   ├── pages/      # 页面组件
│   ├── components/ # 公共组件
│   └── utils/      # 工具函数

comm/
├── config/         # 配置管理
├── encrypt/        # 加密工具
├── wx/             # 微信 API 封装
└── inits/          # 初始化逻辑

db/
├── dao/            # 数据访问层
└── model/          # 数据模型

middleware/         # 中间件（JWT、日志、微信来源验证）
routers/            # 路由配置
```

### 数据库表

- `authorizers`: 授权账号信息
- `comm`: ticket、第三方平台信息
- `user`: 用户表
- `wxcallback_biz`: 消息与事件 URL 推送消息
- `wxcallback_component`: 授权事件 URL 推送消息
- `wxcallback_rules`: 消息转发规则
- `wxtoken`: component_access_token 和 authorizer_access_token
- `counter`: 登录失败计数

### 认证机制

- 使用 JWT 进行身份验证（middleware/jwt.go）
- 管理接口需要 JWT token
- 授权页面和微信回调接口无需认证

### 微信云托管特性

- 微信推送消息走内网，无需加解密
- 通过 header 中的 `x-wx-source` 判断是否为微信来源
- 需开启云托管开放接口服务开关才能免鉴权调用微信开放 API
- `comm/config/server.conf` 中 `UseCloudBaseAccessToken` 应为 true

## 命名规范

- **微信开放平台接口**：下划线（snake_case）
- **微管家前后端交互**：小驼峰（camelCase）
- **微信回调消息**：大驼峰（PascalCase）

## 前端二次开发

前端支持在 `client/src/custom/` 目录进行二次开发，升级时可保留自定义代码：

- `custom/config/route.tsx`: 自定义路由配置
- `custom/config/menu.tsx`: 自定义导航菜单
- `custom/utils/apis.ts`: 自定义接口
- `custom/utils/common.ts`: 自定义工具函数

## 重要配置文件

- `.air.toml`: Air 热重载配置（排除 client 目录）
- `client/vite.config.ts`: Vite 配置（包含代理设置）
- `comm/config/server.conf`: 服务配置
- `container.config.json`: 微信云托管初始化配置

## 开发注意事项

1. 前端开发时需修改 `vite.config.ts` 中的 proxy.target 为后端地址
2. 使用 Air 进行后端热重载开发时，会自动排除 client 目录
3. 部署前需在「系统管理-Secret与密码管理」配置第三方平台 Secret
4. 微信第三方平台需配置授权事件 URL 和消息与事件 URL
