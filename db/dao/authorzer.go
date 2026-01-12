package dao

import (
	"time"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/log"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db"
	"github.com/WeixinCloud/wxcloudrun-wxcomponent/db/model"
	"gorm.io/gorm/clause"
)

const authorizerTableName = "authorizers"

// CreateOrUpdateAuthorizerRecord 创建或更新授权账号信息
func CreateOrUpdateAuthorizerRecord(record *model.Authorizer) error {
	var err error
	cli := db.Get()
	if err = cli.Table(authorizerTableName).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "appid"}}, // 主键或唯一索引
        DoUpdates: clause.AssignmentColumns([]string{
            "AppType", "ServiceType", "NickName", "UserName", "HeadImg", "QrcodeUrl",
            "PrincipalName", "RefreshToken", "FuncInfo", "VerifyInfo", "AuthTime",
            // 不包含 "RegionType"
        }),
	}).Create(record).Error; err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// BatchCreateOrUpdateAuthorizerRecord 批量创建或更新授权账号信息
func BatchCreateOrUpdateAuthorizerRecord(record *[]model.Authorizer) error {
	var err error

	cli := db.Get()
	if err = cli.Table(authorizerTableName).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "appid"}}, // 主键或唯一索引
        DoUpdates: clause.AssignmentColumns([]string{
            "AppType", "ServiceType", "NickName", "UserName", "HeadImg", "QrcodeUrl",
            "PrincipalName", "RefreshToken", "FuncInfo", "VerifyInfo", "AuthTime",
            // 不包含 "RegionType"
        }),
	}).Create(record).Error; err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// ClearAuthorizerRecordsBefore 删除指定时间前的所有授权账号记录
func ClearAuthorizerRecordsBefore(time time.Time) error {
	var err error

	cli := db.Get()
	if err = cli.Table(authorizerTableName).
		Where("updatetime < ?", time).
		Delete(model.Authorizer{}).Error; err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// GetAuthorizerRecords 获取授权账号记录
func GetAuthorizerRecords(appid string, offset int, limit int) ([]*model.Authorizer, int64, error) {
	var records = []*model.Authorizer{}
	cli := db.Get()
	result := cli.Table(authorizerTableName)
	if appid != "" {
		result = result.Where("appid = ?", appid)
	}
	var count int64
	result = result.Count(&count).Offset(offset).Limit(limit).Find(&records)
	return records, count, result.Error
}

// DelAuthorizerRecord 删除授权账号记录
func DelAuthorizerRecord(appid string) error {
	var err error

	cli := db.Get()
	if err = cli.Table(authorizerTableName).
		Where("appid = ?", appid).Delete(model.Authorizer{}).Error; err != nil {
		log.Error(err)
		return err
	}
	return nil
}

// GetDevWeAppRecords 获取代开发小程序
func GetDevWeAppRecords(offset int, limit int, appid string, name string, regionType string) ([]*model.Authorizer, int64, error) {
	var records = []*model.Authorizer{}
	cli := db.Get()
	result := cli.Table(authorizerTableName)
	var count int64
	result = result.Where("apptype = ? AND funcinfo LIKE ?", 0, "%18%")
	if len(appid) != 0 {
		result = result.Where("appid = ?", appid)
	}
	if len(name) != 0 {
		result = result.Where("nickName LIKE ?", "%"+name+"%")
	}
	if len(regionType) != 0 {
		result = result.Where("regiontype = ?", regionType)
	}
	result = result.Count(&count).Offset(offset).Limit(limit).Find(&records)
	return records, count, result.Error
}

// UpdateAuthorizerInfo 更新账号信息（通用）
func UpdateAuthorizerInfo(appid string, info map[string]interface{}) error {
	cli := db.Get()
	return cli.Table(authorizerTableName).Where("appid = ?", appid).Updates(info).Error
}
