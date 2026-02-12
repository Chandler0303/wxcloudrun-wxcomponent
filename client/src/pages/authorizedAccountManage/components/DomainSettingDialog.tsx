import { Dialog, Button, MessagePlugin, Textarea } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { getModifyDomainRequest, setModifyDomainRequest } from '../../../utils/apis';

/** 域名配置项 */
const DOMAIN_FIELDS = [
    { key: 'requestDomain', label: 'request 合法域名', placeholder: '每行一个域名，如 https://api.example.com' },
    { key: 'wsRequestDomain', label: 'socket 合法域名', placeholder: '每行一个域名，如 wss://ws.example.com' },
    { key: 'uploadDomain', label: 'uploadFile 合法域名', placeholder: '每行一个域名' },
    { key: 'downloadDomain', label: 'downloadFile 合法域名', placeholder: '每行一个域名' },
    { key: 'udpDomain', label: 'udp 合法域名', placeholder: '每行一个域名' },
    { key: 'tcpDomain', label: 'tcp 合法域名', placeholder: '每行一个域名' },
] as const;

type DomainKey = (typeof DOMAIN_FIELDS)[number]['key'];

interface ModifyDomainResp {
    requestDomain: string[];
    wsRequestDomain: string[];
    uploadDomain: string[];
    downloadDomain: string[];
    udpDomain: string[];
    tcpDomain: string[];
    invalidRequestDomain?: string[];
    invalidWsRequestDomain?: string[];
    invalidUploadDomain?: string[];
    invalidDownloadDomain?: string[];
    invalidUdpDomain?: string[];
    invalidTcpDomain?: string[];
    noIcpDomain?: string[];
}

interface DomainSettingDialogProps {
    visible: boolean;
    appid: string;
    onClose: () => void;
    onSuccess?: () => void;
}

function toTextareaValue(arr: string[] | undefined): string {
    return Array.isArray(arr) ? arr.filter(Boolean).join('\n') : '';
}

function fromTextareaValue(str: string): string[] {
    return str
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function DomainSettingDialog({
    visible,
    appid,
    onClose,
    onSuccess
}: DomainSettingDialogProps) {
    const [formData, setFormData] = useState<Record<DomainKey, string>>({
        requestDomain: '',
        wsRequestDomain: '',
        uploadDomain: '',
        downloadDomain: '',
        udpDomain: '',
        tcpDomain: '',
    });
    const [loading, setLoading] = useState(false);
    const [invalidInfo, setInvalidInfo] = useState<ModifyDomainResp | null>(null);

    useEffect(() => {
        if (visible && appid) {
            getDomainSetting();
        }
    }, [visible, appid]);

    const getDomainSetting = async () => {
        try {
            const resp = await request({
                request: getModifyDomainRequest,
                data: { appid }
            });
            if (resp.code === 0 && resp.data) {
                const data = resp.data as ModifyDomainResp;
                setFormData({
                    requestDomain: toTextareaValue(data.requestDomain),
                    wsRequestDomain: toTextareaValue(data.wsRequestDomain),
                    uploadDomain: toTextareaValue(data.uploadDomain),
                    downloadDomain: toTextareaValue(data.downloadDomain),
                    udpDomain: toTextareaValue(data.udpDomain),
                    tcpDomain: toTextareaValue(data.tcpDomain),
                });
                setInvalidInfo(null);
            }
        } catch (error) {
            console.error('获取域名配置失败:', error);
            MessagePlugin.error('获取域名配置失败');
        }
    };

    const handleInputChange = (key: DomainKey, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setInvalidInfo(null);
        try {
            const req = {
                action: 'set',
                requestdomain: fromTextareaValue(formData.requestDomain),
                wsrequestdomain: fromTextareaValue(formData.wsRequestDomain),
                uploaddomain: fromTextareaValue(formData.uploadDomain),
                downloaddomain: fromTextareaValue(formData.downloadDomain),
                udpdomain: fromTextareaValue(formData.udpDomain),
                tcpdomain: fromTextareaValue(formData.tcpDomain),
            };

            const resp = await request({
                request: { url: `${setModifyDomainRequest.url}?appid=${appid}`, method: setModifyDomainRequest.method },
                data: req,
            });

            if (resp.code === 0 && resp.data) {
                const data = resp.data as ModifyDomainResp;
                const hasInvalid =
                    (data.invalidRequestDomain?.length ?? 0) > 0 ||
                    (data.invalidWsRequestDomain?.length ?? 0) > 0 ||
                    (data.invalidUploadDomain?.length ?? 0) > 0 ||
                    (data.invalidDownloadDomain?.length ?? 0) > 0 ||
                    (data.invalidUdpDomain?.length ?? 0) > 0 ||
                    (data.invalidTcpDomain?.length ?? 0) > 0 ||
                    (data.noIcpDomain?.length ?? 0) > 0;

                if (hasInvalid) {
                    setInvalidInfo(data);
                    MessagePlugin.warning('部分域名设置失败，请查看下方不合法域名');
                } else {
                    MessagePlugin.success('域名配置保存成功');
                    onSuccess?.();
                    onClose();
                }
            }
        } catch (error) {
            console.error('保存域名配置失败:', error);
            MessagePlugin.error('保存域名配置失败');
        } finally {
            setLoading(false);
        }
    };

    const renderInvalidSection = (label: string, list: string[] | undefined) => {
        if (!list?.length) return null;
        return (
            <div key={label} style={{ marginBottom: '8px', fontSize: '12px', color: '#e34d59' }}>
                <strong>{label}：</strong>
                {list.join(', ')}
            </div>
        );
    };

    return (
        <Dialog
            visible={visible}
            onClose={onClose}
            header="配置服务器域名"
            width={600}
            confirmBtn={null}
            cancelBtn={null}
            destroyOnClose
        >
            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 0' }}>
                <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                    配置小程序的 request、socket、upload、download 等合法域名。授权给第三方的小程序，其服务器域名只可以为在第三方平台账号中配置的域名。
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {DOMAIN_FIELDS.map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'rgba(0,0,0,0.9)' }}>
                                {label}
                            </label>
                            <Textarea
                                value={formData[key] ?? ''}
                                onChange={(value) => handleInputChange(key, String(value ?? ''))}
                                placeholder={placeholder}
                                autosize={{ minRows: 2, maxRows: 6 }}
                                style={{ width: '100%' }}
                            />
                        </div>
                    ))}
                </div>

                {invalidInfo && (
                    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fff2f0', borderRadius: '4px', borderLeft: '4px solid #e34d59' }}>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e34d59' }}>
                            以下域名不合法或未备案，请修正后重新提交：
                        </p>
                        {renderInvalidSection('request 不合法', invalidInfo.invalidRequestDomain)}
                        {renderInvalidSection('socket 不合法', invalidInfo.invalidWsRequestDomain)}
                        {renderInvalidSection('upload 不合法', invalidInfo.invalidUploadDomain)}
                        {renderInvalidSection('download 不合法', invalidInfo.invalidDownloadDomain)}
                        {renderInvalidSection('udp 不合法', invalidInfo.invalidUdpDomain)}
                        {renderInvalidSection('tcp 不合法', invalidInfo.invalidTcpDomain)}
                        {renderInvalidSection('未 ICP 备案', invalidInfo.noIcpDomain)}
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e5e5' }}>
                <Button onClick={onClose} style={{ marginRight: '10px' }}>
                    取消
                </Button>
                <Button theme="primary" onClick={handleSubmit} loading={loading}>
                    保存
                </Button>
            </div>
        </Dialog>
    );
}
