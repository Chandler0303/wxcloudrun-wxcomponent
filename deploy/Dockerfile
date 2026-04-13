# deploy/Dockerfile
# 前端已在 CI 中预先构建（client/dist 已存在），此处只编译 Go 二进制

# ---- Go 编译阶段 ----
FROM golang:1.17.1-alpine3.14 AS builder
WORKDIR /app
COPY . /app/
RUN GOPROXY="https://goproxy.cn" CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o main .

# ---- 运行时镜像 ----
FROM alpine:3.13
WORKDIR /wxcloudrun-wxcomponent

# 从编译阶段拷贝产物
COPY --from=builder /app/main                        ./
COPY --from=builder /app/comm/config/server.conf     ./comm/config/

# 拷贝 CI 阶段预构建的前端产物
COPY client/dist ./client/dist

# 时区 + CA 证书（调用微信 HTTPS 接口需要）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories && \
    apk update && \
    apk add --no-cache tzdata ca-certificates && \
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata && \
    rm -rf /var/cache/apk/*

ENV GIN_MODE=release

CMD ["/wxcloudrun-wxcomponent/main"]
