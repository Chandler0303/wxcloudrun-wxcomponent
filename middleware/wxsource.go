package middleware

import (
	"fmt"
	"net/http"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/errno"

	"github.com/gin-gonic/gin"
)

// WXSourceMiddleWare 中间件 判断是否来源于微信
// 支持两种路径：
//   - 云托管：请求头含 x-wx-source（由云托管平台注入）
//   - 自建服务器：URL 含 msg_signature（由微信签名，在 handler 内验证）
func WXSourceMiddleWare(c *gin.Context) {
	_, hasCloudHeader := c.Request.Header[http.CanonicalHeaderKey("x-wx-source")]
	hasMsgSig := c.Query("msg_signature") != ""

	if hasCloudHeader {
		fmt.Println("[WXSourceMiddleWare]from wx cloud hosting")
		c.Next()
	} else if hasMsgSig {
		fmt.Println("[WXSourceMiddleWare]from wx self-hosted (msg_signature)")
		c.Next()
	} else {
		c.Abort()
		c.JSON(http.StatusUnauthorized, errno.ErrNotAuthorized)
	}
}
