package wxcallback

import (
	"io/ioutil"
	"net/http"
	"time"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/config"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/errno"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/log"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/wx/msgcrypt"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/dao"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/model"
	"github.com/gin-gonic/gin"
)

type wxCallbackBizRecord struct {
	CreateTime int64  `json:"CreateTime" xml:"CreateTime"`
	ToUserName string `json:"ToUserName" xml:"ToUserName"`
	MsgType    string `json:"MsgType" xml:"MsgType"`
	Event      string `json:"Event" xml:"Event"`
}

func bizHandler(c *gin.Context) {
	rawBody, _ := ioutil.ReadAll(c.Request.Body)

	// 解析消息：云托管收到明文JSON，自建服务器收到加密XML
	var record wxCallbackBizRecord
	var plainBody []byte

	if c.GetHeader("x-wx-source") != "" {
		// 云托管路径：body 是明文 JSON
		plainBody = rawBody
		if err := bindBody(rawBody, &record); err != nil {
			c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
			return
		}
	} else {
		// 自建服务器路径：body 是加密 XML，需验签 + AES 解密
		decrypted, err := msgcrypt.ParseAndDecrypt(
			rawBody,
			config.WxCallbackConf.Token,
			c.Query("timestamp"),
			c.Query("nonce"),
			c.Query("msg_signature"),
			config.WxCallbackConf.EncodingAESKey,
		)
		if err != nil {
			log.Errorf("biz decrypt failed: %v", err)
			c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
			return
		}
		plainBody = decrypted
		if err := bindBody(decrypted, &record); err != nil {
			c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
			return
		}
	}

	// 记录到数据库
	r := model.WxCallbackBizRecord{
		CreateTime:  time.Unix(record.CreateTime, 0),
		ReceiveTime: time.Now(),
		Appid:       c.Param("appid"),
		ToUserName:  record.ToUserName,
		MsgType:     record.MsgType,
		Event:       record.Event,
		PostBody:    string(plainBody),
	}
	if record.CreateTime == 0 {
		r.CreateTime = time.Unix(1, 0)
	}
	if err := dao.AddBizCallBackRecord(&r); err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	// 转发到用户配置的地址
	proxyOpen, err := proxyCallbackMsg("", record.MsgType, record.Event, string(plainBody), c)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if !proxyOpen {
		c.String(http.StatusOK, "success")
	}
}
