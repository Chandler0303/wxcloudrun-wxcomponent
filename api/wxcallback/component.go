package wxcallback

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/config"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/errno"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/log"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/wx"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/wx/msgcrypt"

	wxbase "github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/wx/base"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/dao"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/model"
	"github.com/gin-gonic/gin"
)

type wxCallbackComponentRecord struct {
	CreateTime int64  `json:"CreateTime" xml:"CreateTime"`
	InfoType   string `json:"InfoType" xml:"InfoType"`
}

func componentHandler(c *gin.Context) {
	rawBody, _ := ioutil.ReadAll(c.Request.Body)

	// 解析消息：云托管收到明文JSON，自建服务器收到加密XML
	var record wxCallbackComponentRecord
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
			log.Errorf("component decrypt failed: %v", err)
			c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
			return
		}
		plainBody = decrypted
		if err := xml.Unmarshal(decrypted, &record); err != nil {
			c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
			return
		}
	}

	// 记录到数据库
	r := model.WxCallbackComponentRecord{
		CreateTime:  time.Unix(record.CreateTime, 0),
		ReceiveTime: time.Now(),
		InfoType:    record.InfoType,
		PostBody:    string(plainBody),
	}
	if record.CreateTime == 0 {
		r.CreateTime = time.Unix(1, 0)
	}
	if err := dao.AddComponentCallBackRecord(&r); err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	// 处理授权相关的消息
	var err error
	switch record.InfoType {
	case "component_verify_ticket":
		err = ticketHandler(&plainBody)
	case "authorized":
		fallthrough
	case "updateauthorized":
		err = newAuthHander(&plainBody)
	case "unauthorized":
		err = unAuthHander(&plainBody)
	}
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	// 转发到用户配置的地址
	var proxyOpen bool
	proxyOpen, err = proxyCallbackMsg(record.InfoType, "", "", string(plainBody), c)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if !proxyOpen {
		c.String(http.StatusOK, "success")
	}
}

type ticketRecord struct {
	ComponentVerifyTicket string `json:"ComponentVerifyTicket" xml:"ComponentVerifyTicket"`
}

func ticketHandler(body *[]byte) error {
	var record ticketRecord
	if err := bindBody(*body, &record); err != nil {
		return err
	}
	log.Info("[new ticket]" + record.ComponentVerifyTicket)
	if err := wxbase.SetTicket(record.ComponentVerifyTicket); err != nil {
		return err
	}
	return nil
}

type newAuthRecord struct {
	CreateTime                   int64  `json:"CreateTime" xml:"CreateTime"`
	AuthorizerAppid              string `json:"AuthorizerAppid" xml:"AuthorizerAppid"`
	AuthorizationCode            string `json:"AuthorizationCode" xml:"AuthorizationCode"`
	AuthorizationCodeExpiredTime int64  `json:"AuthorizationCodeExpiredTime" xml:"AuthorizationCodeExpiredTime"`
}

func newAuthHander(body *[]byte) error {
	var record newAuthRecord
	var err error
	var refreshtoken string
	var appinfo wx.AuthorizerInfoResp
	if err = bindBody(*body, &record); err != nil {
		return err
	}
	if refreshtoken, err = queryAuth(record.AuthorizationCode); err != nil {
		return err
	}
	if err = wx.GetAuthorizerInfo(record.AuthorizerAppid, &appinfo); err != nil {
		return err
	}
	if err = dao.CreateOrUpdateAuthorizerRecord(&model.Authorizer{
		Appid:         record.AuthorizerAppid,
		AppType:       appinfo.AuthorizerInfo.AppType,
		ServiceType:   appinfo.AuthorizerInfo.ServiceType.Id,
		RegionType:  "",
		NickName:      appinfo.AuthorizerInfo.NickName,
		UserName:      appinfo.AuthorizerInfo.UserName,
		HeadImg:       appinfo.AuthorizerInfo.HeadImg,
		QrcodeUrl:     appinfo.AuthorizerInfo.QrcodeUrl,
		PrincipalName: appinfo.AuthorizerInfo.PrincipalName,
		RefreshToken:  refreshtoken,
		FuncInfo:      appinfo.AuthorizationInfo.StrFuncInfo,
		VerifyInfo:    appinfo.AuthorizerInfo.VerifyInfo.Id,
		AuthTime:      time.Unix(record.CreateTime, 0),
		ExtJson:       `{"config":""}`,
	}); err != nil {
		return err
	}
	return nil
}

type queryAuthReq struct {
	ComponentAppid    string `wx:"component_appid"`
	AuthorizationCode string `wx:"authorization_code"`
}

type authorizationInfo struct {
	AuthorizerRefreshToken string `wx:"authorizer_refresh_token"`
}
type queryAuthResp struct {
	AuthorizationInfo authorizationInfo `wx:"authorization_info"`
}

func queryAuth(authCode string) (string, error) {
	req := queryAuthReq{
		ComponentAppid:    wxbase.GetAppid(),
		AuthorizationCode: authCode,
	}
	var resp queryAuthResp
	_, body, err := wx.PostWxJsonWithComponentToken("/cgi-bin/component/api_query_auth", "", req)
	if err != nil {
		return "", err
	}
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return "", err
	}
	return resp.AuthorizationInfo.AuthorizerRefreshToken, nil
}

type unAuthRecord struct {
	CreateTime      int64  `json:"CreateTime" xml:"CreateTime"`
	AuthorizerAppid string `json:"AuthorizerAppid" xml:"AuthorizerAppid"`
}

func unAuthHander(body *[]byte) error {
	var record unAuthRecord
	var err error
	if err = bindBody(*body, &record); err != nil {
		log.Errorf("bind err %v", err)
		return err
	}
	if err := dao.DelAuthorizerRecord(record.AuthorizerAppid); err != nil {
		log.Errorf("DelAuthorizerRecord err %v", err)
		return err
	}
	wx.InvalidateAuthorizerToken(record.AuthorizerAppid)
	return nil
}

// bindBody 自动判断 JSON（云托管）或 XML（自建服务器），解析到 v
func bindBody(body []byte, v interface{}) error {
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) > 0 && trimmed[0] == '<' {
		return xml.Unmarshal(body, v)
	}
	return json.Unmarshal(body, v)
}
