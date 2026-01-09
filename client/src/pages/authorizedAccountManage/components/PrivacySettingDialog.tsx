import { Dialog, Form, Input, Button, MessagePlugin } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { setPrivacySettingRequest } from '../../../utils/apis';

const { FormItem } = Form;

interface PrivacySetting {
    privacyKey: string;
    privacyText: string;
}

interface OwnerSetting {
    contactPhone: string;
    contactEmail: string;
    contactQQ: string;
    contactWeixin: string;
    extFileMediaID: string;
    noticeMethod: string;
    storeExpireTimestamp: string;
}

interface PrivacySettingInfo {
    privacyList: string[];
    settingList: PrivacySetting[];
    ownerSetting?: OwnerSetting;
}

interface PrivacySettingDialogProps {
    visible: boolean;
    appid: string;
    privacyData?: PrivacySettingInfo;
    onClose: () => void;
    onSuccess?: () => void;
}

// 隐私接口中文名称映射
const privacyNameMap: Record<string, string> = {
    'PhoneNumber': '手机号',
    'Location': '位置信息',
    'Album': '相册',
    'Camera': '摄像头',
    'Record': '麦克风',
    'UserInfo': '用户信息',
    'Address': '通讯地址',
    'Invoice': '发票',
    'Run': '运动数据',
    'Bluetooth': '蓝牙',
    'Clipboard': '剪贴板',
    'Calendar': '日历',
    'Email': '邮箱',
};

export default function PrivacySettingDialog({
    visible,
    appid,
    privacyData,
    onClose,
    onSuccess
}: PrivacySettingDialogProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (privacyData && visible) {
            // 初始化表单数据
            const initialData: Record<string, string> = {};
            privacyData.settingList.forEach(item => {
                initialData[item.privacyKey] = item.privacyText || '';
            });
            
            // 初始化 owner 数据
            if (privacyData.ownerSetting) {
                Object.keys(privacyData.ownerSetting).forEach(key => {
                    initialData[key] = (privacyData.ownerSetting as any)[key] || '';
                });
            }
            console.log('初始化表单数据:', formData);
            setFormData(initialData);
        }
    }, [privacyData, visible]);

    const handleSubmit = async () => {
        // 验证至少填写一个联系方式
        const hasContact = formData.contactPhone || formData.contactEmail || 
                          formData.contactQQ || formData.contactWeixin;
        
        if (!hasContact) {
            MessagePlugin.warning('请至少填写一个联系方式（手机号、邮箱、QQ或微信）');
            return;
        }

        // 验证通知方式必填
        if (!formData.noticeMethod) {
            MessagePlugin.warning('请填写通知方式');
            return;
        }

        setLoading(true);
        try {
            const resp = await request({
                request: {
                    url: `${setPrivacySettingRequest.url}?appid=${appid}`,
                    method: setPrivacySettingRequest.method
                },
                data: {
                    privacyList: privacyData?.privacyList || [],
                    settingList: privacyData?.settingList.map(item => ({
                        privacyKey: item.privacyKey,
                        privacyText: formData[item.privacyKey] || ''
                    })) || [],
                    ownerSetting: {
                        contactPhone: formData.contactPhone,
                        contactEmail: formData.contactEmail,
                        contactQQ: formData.contactQQ,
                        contactWeixin: formData.contactWeixin,
                        extFileMediaID: formData.extFileMediaID,
                        noticeMethod: formData.noticeMethod,
                        storeExpireTimestamp: formData.storeExpireTimestamp
                    }
                }
            });

            if (resp.code === 0) {
                MessagePlugin.success('隐私设置保存成功');
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <Dialog
            visible={visible}
            onClose={onClose}
            header="隐私协议设置"
            width={700}
            confirmBtn={null}
            cancelBtn={null}
            destroyOnClose
        >
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px 0' }}>
                {privacyData && privacyData.privacyList.length > 0 ? (
                    <>
                        <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                            <p style={{ marginBottom: '8px' }}>
                                检测到您的小程序使用了以下隐私接口，请填写对应的用途说明：
                            </p>
                            <p style={{ color: '#e34d59' }}>
                                * 请如实填写接口用途，不填写或填写不当可能导致审核不通过
                            </p>
                        </div>

                        <Form labelWidth={150}>
                            {privacyData.privacyList.map(key => (
                                <FormItem
                                    key={key}
                                    label={`${privacyNameMap[key] || key}`}
                                    name={key}
                                    initialData={formData[key]}
                                    help={`接口标识：${key}`}
                                >
                                    <Input
                                        value={formData[key]}
                                        onChange={(value) => handleInputChange(key, String(value))}
                                        placeholder={`请输入${privacyNameMap[key] || key}的使用说明`}
                                        maxLength={200}
                                    />
                                </FormItem>
                            ))}
                        </Form>

                        <div style={{ marginTop: '30px', marginBottom: '20px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '4px', borderLeft: '4px solid #1890ff' }}>
                            <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                开发者联系方式配置
                            </p>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '0' }}>
                                用于用户隐私保护指引中展示开发者联系方式（至少填写一项）
                            </p>
                        </div>

                        <Form labelWidth={150}>
                            <FormItem label="联系手机号" name="contactPhone" help="至少填写一个联系方式" initialData={formData.contactPhone}>
                                <Input
                                    value={formData.contactPhone}
                                    onChange={(value) => handleInputChange('contactPhone', String(value))}
                                    placeholder="请输入联系手机号"
                                />
                            </FormItem>
                            <FormItem label="联系邮箱" name="contactEmail" initialData={formData.contactEmail}>
                                <Input
                                    value={formData.contactEmail}
                                    onChange={(value) => handleInputChange('contactEmail', String(value))}
                                    placeholder="请输入联系邮箱"
                                />
                            </FormItem>
                            <FormItem label="联系QQ" name="contactQQ" initialData={formData.contactQQ}>
                                <Input
                                    value={formData.contactQQ}
                                    onChange={(value) => handleInputChange('contactQQ', String(value))}
                                    placeholder="请输入联系QQ"
                                />
                            </FormItem>
                            <FormItem label="联系微信" name="contactWeixin" initialData={formData.contactWeixin}>
                                <Input
                                    value={formData.contactWeixin}
                                    onChange={(value) => handleInputChange('contactWeixin', String(value))}
                                    placeholder="请输入联系微信号"
                                />
                            </FormItem>
                            <FormItem label="通知方式" name="noticeMethod" help="联系方式的通知方式，必填" initialData={formData.noticeMethod}>
                                <Input
                                    value={formData.noticeMethod}
                                    onChange={(value) => handleInputChange('noticeMethod', String(value))}
                                    placeholder="请输入通知方式（必填）"
                                />
                            </FormItem>
                            <FormItem label="存储期限" name="storeExpireTimestamp" help="信息的存储期限，选填，如果不填则展示为【开发者承诺，除法律法规另有规定，开发者对你的信息保存期限应当为实现处理目的所必要的最短时间】" initialData={formData.storeExpireTimestamp}>
                                <Input
                                    value={formData.storeExpireTimestamp}
                                    onChange={(value) => handleInputChange('storeExpireTimestamp', String(value))}
                                    placeholder="请输入存储期限时间戳"
                                />
                            </FormItem>
                        </Form>

                        {privacyData.settingList.length > 0 && (
                            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    当前隐私接口配置：
                                </p>
                                {privacyData.settingList.map(item => (
                                    <div key={item.privacyKey} style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                        • {privacyNameMap[item.privacyKey] || item.privacyKey}: {item.privacyText || '未填写'}
                                    </div>
                                ))}
                            </div>
                        )}

                        {privacyData.ownerSetting && (
                            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    当前联系方式配置：
                                </p>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {privacyData.ownerSetting.contactPhone && (
                                        <div style={{ marginBottom: '4px' }}>• 联系手机号: {privacyData.ownerSetting.contactPhone}</div>
                                    )}
                                    {privacyData.ownerSetting.contactEmail && (
                                        <div style={{ marginBottom: '4px' }}>• 联系邮箱: {privacyData.ownerSetting.contactEmail}</div>
                                    )}
                                    {privacyData.ownerSetting.contactQQ && (
                                        <div style={{ marginBottom: '4px' }}>• 联系QQ: {privacyData.ownerSetting.contactQQ}</div>
                                    )}
                                    {privacyData.ownerSetting.contactWeixin && (
                                        <div style={{ marginBottom: '4px' }}>• 联系微信: {privacyData.ownerSetting.contactWeixin}</div>
                                    )}
                                    {privacyData.ownerSetting.noticeMethod && (
                                        <div style={{ marginBottom: '4px' }}>• 通知方式: {privacyData.ownerSetting.noticeMethod}</div>
                                    )}
                                    {privacyData.ownerSetting.storeExpireTimestamp && (
                                        <div style={{ marginBottom: '4px' }}>• 存储期限: {privacyData.ownerSetting.storeExpireTimestamp}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                        <p>未检测到隐私接口使用</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>
                            您的小程序当前版本未使用需要声明的隐私接口
                        </p>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
                <Button onClick={onClose} style={{ marginRight: '10px' }}>
                    取消
                </Button>
                <Button
                    theme="primary"
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!privacyData}
                >
                    保存设置
                </Button>
            </div>
        </Dialog>
    );
}
