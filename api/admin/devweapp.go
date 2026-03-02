package admin

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/errno"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/httputils"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/log"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/wx"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/dao"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/model"
	"github.com/gin-gonic/gin"
)

type auditItem struct {
	Address     string `json:"address" wx:"address"`
	Tag         string `json:"tag" wx:"tag"`
	FirstClass  string `json:"firstClass" wx:"first_class"`
	SecondClass string `json:"secondClass" wx:"second_class"`
	ThirdClass  string `json:"thirdClass" wx:"third_class"`
	FirstId     int    `json:"firstId" wx:"first_id"`
	SecondId    int    `json:"secondId" wx:"second_id"`
	ThirdId     int    `json:"thirdId" wx:"third_id"`
	Title       string `json:"title" wx:"title"`
}

type previewInfo struct {
	VideoIdList []string `json:"videoIdList" wx:"video_id_list"`
	PicIdList   []string `json:"picIdList" wx:"pic_id_list"`
}

type ugcDeclare struct {
	Scene          []int  `json:"scene" wx:"scene"`
	OtherSceneDesc string `json:"otherSceneDesc" wx:"other_scene_desc"`
	Method         []int  `json:"method" wx:"method"`
	HasAuditTeam   int    `json:"hasAuditTeam" wx:"has_audit_team"`
	AuditDesc      string `json:"auditDesc" wx:"audit_desc"`
}

type submitAuditReq struct {
	ItemList      []auditItem `json:"itemList" wx:"item_list"`
	PreviewInfo   previewInfo `json:"previewInfo" wx:"preview_info"`
	VersionDesc   string      `json:"versionDesc" wx:"version_desc"`
	FeedbackInfo  string      `json:"feedbackInfo" wx:"feedback_info"`
	FeedbackStuff string      `json:"feedbackStuff" wx:"feedback_stuff"`
	UgcDeclare    ugcDeclare  `json:"ugcDeclare" wx:"ugc_declare"`
}

type submitAuditResp struct {
	AuditId int `json:"auditId" wx:"auditid"`
}

type getLatestAuditStatusResp struct {
	AuditId         int64  `json:"auditId" wx:"auditid"`
	Status          int    `json:"status" wx:"status"`
	Reason          string `json:"reason" wx:"reason"`
	ScreenShot      string `json:"screenShot" wx:"ScreenShot"`
	UserVersion     string `json:"userVersion" wx:"user_version"`
	UserDesc        string `json:"userDesc" wx:"user_desc"`
	SubmitAuditTime int64  `json:"submitAuditTime" wx:"submit_audit_time"`
}

type devVersionsResp struct {
	AuditVersion *getLatestAuditStatusResp `json:"auditInfo,omitempty"`
	getVersionInfoResp
}

type templateListResp struct {
	TemplateList []templateItem `json:"templateList" wx:"template_list"`
}

type delTemplateReq struct {
	TemplateId int `json:"templateId" wx:"template_id"`
}

type templateItem struct {
	CreateTime             int64          `json:"createTime" wx:"create_time"`
	UserVersion            string         `json:"userVersion" wx:"user_version"`
	UserDesc               string         `json:"userDesc" wx:"user_desc"`                              // 模板描述，开发者自定义字段
	TemplateId             int            `json:"templateId" wx:"template_id"`                          // 模板 id
	TemplateType           int            `json:"templateType" wx:"template_type"`                      // 0对应普通模板，1对应标准模板
	SourceMiniprogramAppid string         `json:"sourceMiniprogramAppid" wx:"source_miniprogram_appid"` // 开发小程序的appid
	SourceMiniprogram      string         `json:"sourceMiniprogram" wx:"source_miniprogram"`            // 开发小程序的名称
	CategoryList           []categoryItem `json:"categoryList" wx:"category_list"`                      // [标准模板的类目信息](#category_list标准模板类目信息)；如果是普通模板则值为空的数组
	AuditScene             int            `json:"auditScene" wx:"audit_scene"`                          // 标准模板的场景标签；普通模板不返回该值
	AuditStatus            int            `json:"auditStatus" wx:"audit_status"`                        // 标准模板的审核状态；普通模板不返回该值
	Reason                 string         `json:"reason" wx:"reason"`                                   // 标准模板的审核驳回的原因，；普通模板不返回该值
}

type templateDraftListResp struct {
	TemplateDraftItem []templateDraftItem `json:"draftList" wx:"draft_list"`
}
type templateDraftItem struct {
	CreateTime             int64          `json:"createTime" wx:"create_time"`
	UserVersion            string         `json:"userVersion" wx:"user_version"`
	UserDesc               string         `json:"userDesc" wx:"user_desc"`                              // 模板描述，开发者自定义字段
	DraftId                int            `json:"draftId" wx:"draft_id"`                                // 草稿 id
	SourceMiniprogramAppid string         `json:"sourceMiniprogramAppid" wx:"source_miniprogram_appid"` // 开发小程序的appid
	SourceMiniprogram      string         `json:"sourceMiniprogram" wx:"source_miniprogram"`            // 开发小程序的名称
	CategoryList           []categoryItem `json:"categoryList" wx:"category_list"`                      // [标准模板的类目信息](#category_list标准模板类目信息)；如果是普通模板则值为空的数组
	Developer              string         `json:"developer" wx:"developer"`                             // 开发者名称
}

type categoryItem struct {
	FirstClass  string `json:"firstClass" wx:"first_class"`   // 一级类目
	FirstId     int    `json:"firstId" wx:"first_id"`         // 一级类目id
	SecondClass string `json:"secondClass" wx:"second_class"` // 二级类目
	SecondId    int    `json:"secondId" wx:"second_id"`       // 二级类目id
}

type codeCommitReq struct {
	TemplateId  string `json:"templateId" wx:"template_id"`   // 代码库中的代码模板 ID，可通过[获取代码模板列表](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/api/ThirdParty/code_template/gettemplatelist.html)接口获取template_id <br>注意，如果该模板id为标准模板库的模板id，则ext_json可支持的参数为：{"extAppid":" ", "ext": {}, "window": {}}
	ExtJson     string `json:"extJson" wx:"ext_json"`         // 为了方便第三方平台的开发者引入 extAppid 的开发调试工作，引入[ext.json配置文件](https://developers.weixin.qq.com/miniprogram/dev/devtools/ext.html#%E5%B0%8F%E7%A8%8B%E5%BA%8F%E6%A8%A1%E6%9D%BF%E5%BC%80%E5%8F%91)概念，该参数则是用于控制ext.json配置文件的内容。关于该参数的补充说明请查看下方的"ext_json补充说明"。
	UserVersion string `json:"userVersion" wx:"user_version"` // 代码版本号，开发者可自定义（长度不要超过 64 个字符）
	UserDesc    string `json:"userDesc" wx:"user_desc"`       // 代码描述，开发者可自定义
}

type visitStatusResp struct {
	Status int `wx:"status"`
}

type releaseInfo struct {
	ReleaseTime    int64  `json:"releaseTime" wx:"release_time"`
	ReleaseVersion string `json:"releaseVersion" wx:"release_version"`
	ReleaseDesc    string `json:"releaseDesc" wx:"release_desc"`
	ReleaseQrCode  string `json:"releaseQrCode,omitempty"`
}

type privacySetting struct {
	PrivacyKey  string `json:"privacyKey" wx:"privacy_key"`
	PrivacyText string `json:"privacyText" wx:"privacy_text"`
}

type ownerSetting struct {
	ContactPhone         string `json:"contactPhone" wx:"contact_phone"`
	ContactEmail         string `json:"contactEmail" wx:"contact_email"`
	ContactQQ            string `json:"contactQQ" wx:"contact_qq"`
	ContactWeixin        string `json:"contactWeixin" wx:"contact_weixin"`
	ExtFileMediaID       string `json:"extFileMediaID" wx:"ext_file_media_id"`
	NoticeMethod         string `json:"noticeMethod" wx:"notice_method"`
	StoreExpireTimestamp string `json:"storeExpireTimestamp" wx:"store_expire_timestamp"`
}

// PrivacyDescItem 隐私项说明，用于接口返回与 SET 请求
type PrivacyDescItem struct {
	PrivacyKey  string `json:"privacyKey" wx:"privacy_key"`
	PrivacyDesc string `json:"privacyDesc" wx:"privacy_desc"`
}

// privacyDescListResp 返回给前端的 privacyDesc 结构，SET 时也按此结构发给微信
type privacyDescListResp struct {
	PrivacyDescList []PrivacyDescItem `json:"privacyDescList" wx:"privacy_desc_list"`
}

// privacySettingInfoRaw 用于解析微信返回（privacy_desc 可能为 map 或带 list 的对象）
type privacySettingInfoRaw struct {
	PrivacyList         []string         `json:"privacyList" wx:"privacy_list"`
	SettingList         []privacySetting `json:"settingList" wx:"setting_list"`
	OwnerSetting        ownerSetting     `json:"ownerSetting" wx:"owner_setting"`
	PrivacyDesc         map[string]interface{} `json:"privacyDesc" wx:"privacy_desc"`
	SdkPrivacyInfoList  []privacySetting `json:"sdkPrivacyInfoList" wx:"sdk_privacy_info_list"`
}

// privacySettingInfo 用于 SET 请求与统一响应
type privacySettingInfo struct {
	PrivacyList         []string         `json:"privacyList" wx:"privacy_list"`
	SettingList         []privacySetting `json:"settingList" wx:"setting_list"`
	OwnerSetting        ownerSetting     `json:"ownerSetting" wx:"owner_setting"`
	PrivacyDesc         privacyDescListResp `json:"privacyDesc" wx:"privacy_desc"`
	SdkPrivacyInfoList  []privacySetting `json:"sdkPrivacyInfoList" wx:"sdk_privacy_info_list"`
}

type expInfo struct {
	ExpTime    int64  `json:"expTime" wx:"exp_time"`
	ExpVersion string `json:"expVersion" wx:"exp_version"`
	ExpDesc    string `json:"expDesc" wx:"exp_desc"`
	ExpQrCode  string `json:"expQrCode,omitempty"`
}

type getVersionInfoResp struct {
	ReleaseInfo *releaseInfo `json:"releaseInfo,omitempty" wx:"release_info"`
	ExpInfo     *expInfo     `json:"expInfo,omitempty" wx:"exp_info"`
}

type getDevWeAppListResp struct {
	Appid         string `json:"appid"`
	NickName      string `json:"nickName"`
	RegionType    string `json:"regionType"`
	ExtJsonConfig string `json:"extJsonConfig"`
	FuncInfo      []int  `json:"funcInfo"`
	QrCodeUrl     string `json:"qrCodeUrl"`
	ServiceStatus int    `json:"serviceStatus"`
	getVersionInfoResp
	AuditVersion *getLatestAuditStatusResp `json:"auditVersion,omitempty"`
}

type uploadMediaResp struct {
	Type      string `json:"type" wx:"type"`
	MediaId   string `json:"mediaId" wx:"media_id"`
	CreatedAt int64  `json:"createdAt" wx:"created_at"`
}

type changeVisitStatusReq struct {
	Action string `json:"action"`
}

type pageList struct {
	PageList []string `json:"pageList" wx:"page_list"`
}

type category struct {
	FirstClass  string `json:"firstClass" wx:"first_class"`
	SecondClass string `json:"secondClass" wx:"second_class"`
	ThirdClass  string `json:"thirdClass" wx:"third_class"`
	FirstId     int    `json:"firstId" wx:"first_id"`
	SecondId    int    `json:"secondId" wx:"second_id"`
	ThirdId     int    `json:"thirdId" wx:"third_id"`
}
type categoryList struct {
	CategoryList []category `json:"categoryList" wx:"category_list"`
}

type addTemplateDraftReq struct {
	DraftId int `json:"draftId" wx:"draft_id"`
}

// modifyDomainReq 配置小程序服务器域名 请求体（action=get 时可不传域名数组）
type modifyDomainReq struct {
	Action           string   `json:"action" wx:"action"`
	RequestDomain    []string `json:"requestdomain,omitempty" wx:"requestdomain"`
	WsRequestDomain  []string `json:"wsrequestdomain,omitempty" wx:"wsrequestdomain"`
	UploadDomain     []string `json:"uploaddomain,omitempty" wx:"uploaddomain"`
	DownloadDomain   []string `json:"downloaddomain,omitempty" wx:"downloaddomain"`
	UdpDomain        []string `json:"udpdomain,omitempty" wx:"udpdomain"`
	TcpDomain        []string `json:"tcpdomain,omitempty" wx:"tcpdomain"`
}

// modifyWebviewDomainReq 配置小程序业务域名 请求体
type modifyWebviewDomainReq struct {
	Action        string   `json:"action" wx:"action"`
	WebviewDomain []string `json:"webviewdomain,omitempty" wx:"webviewdomain"`
}

// modifyWebviewDomainResp 配置小程序业务域名 返回
type modifyWebviewDomainResp struct {
	WebviewDomain        []string `json:"webviewDomain" wx:"webviewdomain"`
}

// modifyDomainResp 配置小程序服务器域名 返回（wx 用于解析微信响应，json 用于返回前端）
type modifyDomainResp struct {
	RequestDomain          []string `json:"requestDomain" wx:"requestdomain"`
	WsRequestDomain        []string `json:"wsRequestDomain" wx:"wsrequestdomain"`
	UploadDomain           []string `json:"uploadDomain" wx:"uploaddomain"`
	DownloadDomain         []string `json:"downloadDomain" wx:"downloaddomain"`
	UdpDomain              []string `json:"udpDomain" wx:"udpdomain"`
	TcpDomain              []string `json:"tcpDomain" wx:"tcpdomain"`
	InvalidRequestDomain   []string `json:"invalidRequestDomain" wx:"invalid_requestdomain"`
	InvalidWsRequestDomain []string `json:"invalidWsRequestDomain" wx:"invalid_wsrequestdomain"`
	InvalidUploadDomain    []string `json:"invalidUploadDomain" wx:"invalid_uploaddomain"`
	InvalidDownloadDomain  []string `json:"invalidDownloadDomain" wx:"invalid_downloaddomain"`
	InvalidUdpDomain       []string `json:"invalidUdpDomain" wx:"invalid_udpdomain"`
	InvalidTcpDomain       []string `json:"invalidTcpDomain" wx:"invalid_tcpdomain"`
	NoIcpDomain            []string `json:"noIcpDomain" wx:"no_icp_domain"`
}

func submitAudit(appid string, req *submitAuditReq) (int, error) {
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/submit_audit", "", *req)
	if err != nil {
		log.Error(err)
		return 0, err
	}
	var resp submitAuditResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return 0, err
	}
	return resp.AuditId, nil
}

func getLatestAuditStatus(appid string, resp *getLatestAuditStatusResp) (bool, error) {
	wxerr, body, err := wx.GetWxApiWithAuthToken(appid, "/wxa/get_latest_auditstatus", "")
	if err != nil {
		if wxerr != nil && wxerr.ErrCode == 85058 {
			return false, nil
		}
		return false, err
	}
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return false, err
	}
	return true, nil
}

func getVisitStatus(appid string) (int, error) {
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/getvisitstatus", "", gin.H{})
	if err != nil {
		log.Error(err)
		return 0, err
	}
	var resp visitStatusResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return 0, err
	}
	return resp.Status, nil
}

func getVersionInfo(appid string, resp *getVersionInfoResp) error {
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/getversioninfo", "", gin.H{})
	if err != nil {
		log.Error(err)
		return err
	}
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return err
	}
	return nil
}

func getImageResp(resp *http.Response, body []byte) (string, error) {
	if len(resp.Header["Content-Type"]) > 0 && resp.Header["Content-Type"][0] == "image/jpeg" {
		return base64.StdEncoding.EncodeToString(body), nil
	}
	var wxError wx.WxCommError
	if err := wx.WxJson.Unmarshal(body, &wxError); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		return "", err
	}
	if wxError.ErrCode != 0 {
		return "", fmt.Errorf("WxErrCode != 0, resp: %v", wxError)
	}
	return "", fmt.Errorf("unknown error, resp: %v", body)
}

func getReleaseQrCode(appid string) (string, error) {
	url, err := wx.GetAuthorizerWxApiUrl(appid, "/wxa/getwxacodeunlimit", "")
	if err != nil {
		log.Error(err)
		return "", err
	}
	jsonByte, _ := json.Marshal(gin.H{"scene": "wxcomponent"})
	resp, body, err := httputils.RawPost(url, jsonByte, "application/json")
	if err != nil {
		log.Error(err)
		return "", err
	}
	return getImageResp(resp, body)
}

func getExpQrCode(appid string) (string, error) {
	url, err := wx.GetAuthorizerWxApiUrl(appid, "/wxa/get_qrcode", "")
	if err != nil {
		log.Error(err)
		return "", err
	}
	resp, body, err := httputils.RawGet(url)
	if err != nil {
		log.Error(err)
		return "", err
	}
	return getImageResp(resp, body)
}

func getDevWeAppListHandler(c *gin.Context) {
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	count, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if count > 20 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam)
		return
	}
	appid := c.DefaultQuery("appid", "")
	name := c.DefaultQuery("name", "")
	regionType := c.DefaultQuery("regionType", "")

	// 获取账号列表
	records, total, err := dao.GetDevWeAppRecords(offset, count, appid, name, regionType)
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	// 并发请求
	wg := &sync.WaitGroup{}
	wg.Add(len(records))
	resp := make([]getDevWeAppListResp, len(records))
	for i, record := range records {
		go func(i int, record *model.Authorizer) {
			defer wg.Done()
			resp[i].Appid = record.Appid
			resp[i].NickName = record.NickName
			resp[i].QrCodeUrl = record.QrcodeUrl
			resp[i].RegionType = record.RegionType
			resp[i].ExtJsonConfig = parseExtJsonConfig(record.ExtJson)

			// 获取权限集列表
			strFuncInfoList := strings.Split(record.FuncInfo, "|")
			for _, v := range strFuncInfoList {
				id, err := strconv.Atoi(v)
				if err == nil {
					resp[i].FuncInfo = append(resp[i].FuncInfo, id)
				}
			}
			// 获取服务状态
			status, err := getVisitStatus(record.Appid)
			if err != nil {
				log.Error(err)
			} else {
				resp[i].ServiceStatus = status
			}

			// 获取版本信息
			var versionInfo getVersionInfoResp
			err = getVersionInfo(record.Appid, &versionInfo)
			if err != nil {
				log.Error(err)
			} else {
				resp[i].ReleaseInfo = versionInfo.ReleaseInfo
				resp[i].ExpInfo = versionInfo.ExpInfo
			}

			// 获取最近审核版本信息
			var auditInfo getLatestAuditStatusResp
			has, err := getLatestAuditStatus(record.Appid, &auditInfo)
			if err != nil {
				log.Error(err)
			}
			if has {
				resp[i].AuditVersion = &auditInfo
			}
		}(i, record)

	}
	wg.Wait()

	c.JSON(http.StatusOK, errno.OK.WithData(gin.H{"total": total, "records": resp}))
}

func submitAuditHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	var req submitAuditReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	auditId, err := submitAudit(appid, &req)
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(gin.H{"auditId": auditId}))
}

type batchSubmitAuditReq struct {
	Appids      []string       `json:"appids" binding:"required"`
	AuditConfig submitAuditReq `json:"auditConfig" binding:"required"`
}

type batchSubmitAuditFailedItem struct {
	Appid  string `json:"appid"`
	ErrMsg string `json:"errMsg"`
}

type batchSubmitAuditResp struct {
	Success []string                    `json:"success"`
	Failed  []batchSubmitAuditFailedItem `json:"failed"`
}

func batchSubmitAuditHandler(c *gin.Context) {
	var req batchSubmitAuditReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if len(req.Appids) == 0 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("appids 不能为空"))
		return
	}
	if len(req.Appids) > 20 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("单次最多支持 20 个小程序"))
		return
	}

	var success []string
	var failed []batchSubmitAuditFailedItem

	for _, appid := range req.Appids {
		_, err := submitAudit(appid, &req.AuditConfig)
		if err != nil {
			failed = append(failed, batchSubmitAuditFailedItem{Appid: appid, ErrMsg: err.Error()})
		} else {
			success = append(success, appid)
		}
	}

	c.JSON(http.StatusOK, errno.OK.WithData(batchSubmitAuditResp{Success: success, Failed: failed}))
}

func devVersionsHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	var resp devVersionsResp
	var wg sync.WaitGroup
	wg.Add(1)
	// 审核版本
	go func() {
		defer wg.Done()
		var auditInfo getLatestAuditStatusResp
		has, err := getLatestAuditStatus(appid, &auditInfo)
		if err != nil {
			log.Error(err.Error())
			c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
			return
		}
		if has {
			resp.AuditVersion = &auditInfo
		}
	}()

	// 线上版本和体验版
	var versionInfo getVersionInfoResp
	err := getVersionInfo(appid, &versionInfo)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if versionInfo.ExpInfo != nil {
		log.Info("get exp qrcode")
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp.ExpInfo = versionInfo.ExpInfo
			base64Image, err := getExpQrCode(appid)
			if err != nil {
				log.Error(err)
			} else {
				resp.ExpInfo.ExpQrCode = base64Image
			}
		}()
	}
	if versionInfo.ReleaseInfo != nil {
		log.Info("get release qrcode")
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp.ReleaseInfo = versionInfo.ReleaseInfo
			base64Image, err := getReleaseQrCode(appid)
			if err != nil {
				log.Error(err)
			} else {
				resp.ReleaseInfo.ReleaseQrCode = base64Image
			}
		}()
	}
	wg.Wait()
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func templateListHandler(c *gin.Context) {
	var resp templateListResp
	templateType := c.DefaultQuery("templateType", "")
	_, body, err := wx.GetWxApiWithComponentToken("/wxa/gettemplatelist", "template_type="+templateType)
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func templateDraftListHandler(c *gin.Context) {
	var resp templateDraftListResp
	_, body, err := wx.GetWxApiWithComponentToken("/wxa/gettemplatedraftlist", "")
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func addTemplateDraftHandler(c *gin.Context) {
	var req addTemplateDraftReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	_, _, err := wx.PostWxJsonWithComponentToken("/wxa/addtotemplate", "", req)
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func delTemplateHandler(c *gin.Context) {
	var req delTemplateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	_, _, err := wx.PostWxJsonWithComponentToken("/wxa/deletetemplate", "", req)
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func revokeAuditHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	_, _, err := wx.GetWxApiWithAuthToken(appid, "/wxa/undocodeaudit", "")
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func speedUpAuditHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	auditId, err := strconv.Atoi(c.DefaultQuery("auditId", "0"))
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	_, _, err = wx.PostWxJsonWithAuthToken(appid, "/wxa/speedupaudit", "", gin.H{"auditid": auditId})
	if err != nil {
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func commitCodeHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	var req codeCommitReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if _, _, err := wx.PostWxJsonWithAuthTokenLongTimeout(appid, "/wxa/commit", "", req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

type batchCommitCodeReq struct {
	Appids      []string `json:"appids" binding:"required"`
	TemplateId  string   `json:"templateId" binding:"required"`
	UserVersion string   `json:"userVersion" binding:"required"`
	UserDesc    string   `json:"userDesc" binding:"required"`
}

type batchCommitCodeFailedItem struct {
	Appid   string `json:"appid"`
	ErrMsg  string `json:"errMsg"`
}

type batchCommitCodeResp struct {
	Success []string                    `json:"success"`
	Failed  []batchCommitCodeFailedItem `json:"failed"`
}

func batchCommitCodeHandler(c *gin.Context) {
	var req batchCommitCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if len(req.Appids) == 0 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("appids 不能为空"))
		return
	}
	if len(req.Appids) > 20 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("单次最多支持 20 个小程序"))
		return
	}

	var success []string
	var failed []batchCommitCodeFailedItem

	for _, appid := range req.Appids {
		extJson := ""
		records, _, err := dao.GetAuthorizerRecords(appid, 0, 1)
		if err == nil && len(records) > 0 {
			extJson = parseExtJsonConfig(records[0].ExtJson)
		}
		if extJson == "" {
			extJson = "{}"
		}

		commitReq := codeCommitReq{
			TemplateId:  req.TemplateId,
			ExtJson:     extJson,
			UserVersion: req.UserVersion,
			UserDesc:    req.UserDesc,
		}
		_, _, err = wx.PostWxJsonWithAuthTokenLongTimeout(appid, "/wxa/commit", "", commitReq)
		if err != nil {
			failed = append(failed, batchCommitCodeFailedItem{Appid: appid, ErrMsg: err.Error()})
		} else {
			success = append(success, appid)
		}
	}

	c.JSON(http.StatusOK, errno.OK.WithData(batchCommitCodeResp{Success: success, Failed: failed}))
}

type batchReleaseCodeReq struct {
	Appids []string `json:"appids" binding:"required"`
}

type batchReleaseCodeFailedItem struct {
	Appid  string `json:"appid"`
	ErrMsg string `json:"errMsg"`
}

type batchReleaseCodeResp struct {
	Success []string                    `json:"success"`
	Failed  []batchReleaseCodeFailedItem `json:"failed"`
}

func batchReleaseCodeHandler(c *gin.Context) {
	var req batchReleaseCodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if len(req.Appids) == 0 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("appids 不能为空"))
		return
	}
	if len(req.Appids) > 20 {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("单次最多支持 20 个小程序"))
		return
	}

	var success []string
	var failed []batchReleaseCodeFailedItem

	for _, appid := range req.Appids {
		if _, _, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/release", "", gin.H{}); err != nil {
			failed = append(failed, batchReleaseCodeFailedItem{Appid: appid, ErrMsg: err.Error()})
		} else {
			success = append(success, appid)
		}
	}

	c.JSON(http.StatusOK, errno.OK.WithData(batchReleaseCodeResp{Success: success, Failed: failed}))
}

func releaseCodeHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	if _, _, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/release", "", gin.H{}); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func uploadMediaHandler(c *gin.Context) {
	mediaType := c.DefaultQuery("type", "")
	appid := c.DefaultQuery("appid", "")
	formFile, fileHeader, err := c.Request.FormFile("media")
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	_, body, err := wx.PostWxFormDataWithAuthToken(appid, "/cgi-bin/media/upload",
		"type="+mediaType, formFile, fileHeader.Filename, "media")
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	var resp uploadMediaResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func changeVisitStatusHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	var req changeVisitStatusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}
	if _, _, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/change_visitstatus",
		"", gin.H{"action": req.Action}); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func rollbackReleaseVersionHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	if _, _, err := wx.GetWxApiWithAuthToken(appid, "/wxa/revertcoderelease", ""); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK)
}

func getPageListHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	_, body, err := wx.GetWxApiWithAuthToken(appid, "/wxa/get_page", "")
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	var resp pageList
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func getCategoryHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	_, body, err := wx.GetWxApiWithAuthToken(appid, "/wxa/get_category", "")
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	var resp categoryList
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func getQRCodeHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	base64Image, err := getReleaseQrCode(appid)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(gin.H{"releaseQrCode": base64Image}))
}

func getExpQRCodeHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	base64Image, err := getExpQrCode(appid)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(gin.H{"expQrCode": base64Image}))
}

// snakeToCamel 将下划线命名转为驼峰，如 user_info -> userInfo
func snakeToCamel(s string) string {
	parts := strings.Split(s, "_")
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) > 0 {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}
	return strings.Join(parts, "")
}

// buildPrivacyDescList 将微信返回的 privacy_desc（map 或带 privacy_desc_list 的对象）转为 []PrivacyDescItem
func buildPrivacyDescList(m map[string]interface{}) []PrivacyDescItem {
	if len(m) == 0 {
		return nil
	}
	// 若为 { "privacy_desc_list": [ {...} ] } 则直接解析列表
	if list, ok := m["privacy_desc_list"]; ok {
		if arr, ok := list.([]interface{}); ok {
			out := make([]PrivacyDescItem, 0, len(arr))
			for _, it := range arr {
				if item, ok := it.(map[string]interface{}); ok {
					out = append(out, PrivacyDescItem{
						PrivacyKey:  getStr(item, "privacy_key", "privacyKey"),
						PrivacyDesc: getStr(item, "privacy_desc", "privacyDesc"),
					})
				}
			}
			return out
		}
	}
	// 否则按 key -> value 构建列表（key 转为驼峰）
	out := make([]PrivacyDescItem, 0, len(m))
	for k, v := range m {
		out = append(out, PrivacyDescItem{
			PrivacyKey:  snakeToCamel(k),
			PrivacyDesc: privacyDescValueToString(v),
		})
	}
	return out
}

func getStr(m map[string]interface{}, snake, camel string) string {
	if s, ok := m[snake].(string); ok {
		return s
	}
	if s, ok := m[camel].(string); ok {
		return s
	}
	return ""
}

func privacyDescValueToString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case []interface{}:
		var parts []string
		for _, e := range val {
			if s, ok := e.(string); ok {
				parts = append(parts, s)
			}
		}
		return strings.Join(parts, " ")
	}
	return ""
}

func getPrivacySettingHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/cgi-bin/component/getprivacysetting", "", gin.H{})
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	var raw privacySettingInfoRaw
	if err := wx.WxJson.Unmarshal(body, &raw); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	resp := privacySettingInfo{
		PrivacyList:        raw.PrivacyList,
		SettingList:        raw.SettingList,
		OwnerSetting:       raw.OwnerSetting,
		SdkPrivacyInfoList: raw.SdkPrivacyInfoList,
		PrivacyDesc: privacyDescListResp{
			PrivacyDescList: buildPrivacyDescList(raw.PrivacyDesc),
		},
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func setPrivacySettingHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")

	var req privacySettingInfo
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	// 验证 owner_setting 必须至少有一个联系方式
	hasContact := req.OwnerSetting.ContactPhone != "" ||
		req.OwnerSetting.ContactEmail != "" ||
		req.OwnerSetting.ContactQQ != "" ||
		req.OwnerSetting.ContactWeixin != ""

	if !hasContact {
		log.Error("owner_setting must have at least one contact field")
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("联系方式至少填写一项（手机号、邮箱、QQ或微信）"))
		return
	}

	_, _, err := wx.PostWxJsonWithAuthToken(appid, "/cgi-bin/component/setprivacysetting", "", req)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	c.JSON(http.StatusOK, errno.OK)
}

func getModifyDomainHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	reqBody := modifyDomainReq{Action: "get"}
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/modify_domain_directly", "", reqBody)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	var resp modifyDomainResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

func setModifyDomainHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")

	var req modifyDomainReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	if req.Action == "" {
		req.Action = "set"
	}
	if req.Action != "get" && req.Action != "set" {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("action 只能是 get 或 set"))
		return
	}

	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/modify_domain_directly", "", req)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	var resp modifyDomainResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

// getModifyWebviewDomainHandler 获取小程序业务域名配置
func getModifyWebviewDomainHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	reqBody := modifyWebviewDomainReq{Action: "get"}
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/setwebviewdomain_directly", "", reqBody)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if body == nil {
		body = []byte("{}")
	}

	var resp modifyWebviewDomainResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

// setModifyWebviewDomainHandler 配置小程序业务域名
func setModifyWebviewDomainHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")

	var req modifyWebviewDomainReq
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	if req.Action == "" {
		req.Action = "set"
	}
	if req.Action != "get" && req.Action != "set" && req.Action != "add" && req.Action != "delete" {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("action 只能是 get、set、add 或 delete"))
		return
	}
	if req.Action != "get" && (req.WebviewDomain == nil || len(req.WebviewDomain) == 0) {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData("action 为 set/add/delete 时 webviewdomain 不能为空"))
		return
	}

	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/setwebviewdomain_directly", "", req)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	if body == nil {
		body = []byte("{}")
	}

	var resp modifyWebviewDomainResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}

type updateDevWeAppReq struct {
	Appid         string  `json:"appid" binding:"required"`
	RegionType    string  `json:"regionType" binding:"omitempty"` // 可选，仅更新局点时需传
	ExtJsonConfig *string `json:"extJsonConfig,omitempty"`
}

func parseExtJsonConfig(extJson string) string {
	if extJson == "" {
		return ""
	}
	var data struct {
		Config  string `json:"config"`
		Remark  string `json:"remark"` // 兼容旧数据
	}
	if err := json.Unmarshal([]byte(extJson), &data); err != nil {
		return ""
	}
	if data.Config != "" {
		return data.Config
	}
	return data.Remark
}

func updateDevWeAppHandler(c *gin.Context) {
	var req updateDevWeAppReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, errno.ErrInvalidParam.WithData(err.Error()))
		return
	}

	updateMap := make(map[string]interface{})
	if req.RegionType != "" {
		updateMap["regiontype"] = req.RegionType
	}
	if req.ExtJsonConfig != nil {
		extData := map[string]interface{}{"config": *req.ExtJsonConfig}
		extBytes, _ := json.Marshal(extData)
		updateMap["extjson"] = string(extBytes)
	}

	if len(updateMap) > 0 {
		if err := dao.UpdateAuthorizerInfo(req.Appid, updateMap); err != nil {
			log.Error(err)
			c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
			return
		}
	}

	c.JSON(http.StatusOK, errno.OK)
}

type getJumpDomainConfirmFileResp struct {
	FileContent string `json:"file_content" wx:"file_content"`
	FileName    string `json:"file_name" wx:"file_name"`
}

// getJumpDomainConfirmFileHandler 获取业务域名校验文件
func getJumpDomainConfirmFileHandler(c *gin.Context) {
	appid := c.DefaultQuery("appid", "")
	_, body, err := wx.PostWxJsonWithAuthToken(appid, "/wxa/get_webviewdomain_confirmfile", "", gin.H{})
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}

	var resp getJumpDomainConfirmFileResp
	if err := wx.WxJson.Unmarshal(body, &resp); err != nil {
		log.Errorf("Unmarshal err, %v", err)
		c.JSON(http.StatusOK, errno.ErrSystemError.WithData(err.Error()))
		return
	}
	c.JSON(http.StatusOK, errno.OK.WithData(resp))
}
