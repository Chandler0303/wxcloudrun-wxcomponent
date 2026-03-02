import { Dialog, Button, MessagePlugin, Textarea } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { getModifyWebviewDomainRequest, setModifyWebviewDomainRequest, getJumpDomainConfirmFileRequest } from '../../../utils/apis';

interface ModifyWebviewDomainResp {
    webviewDomain?: string[];
    invalidWebviewDomain?: string[];
}

interface WebviewDomainSettingDialogProps {
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

export default function WebviewDomainSettingDialog({
    visible,
    appid,
    onClose,
    onSuccess
}: WebviewDomainSettingDialogProps) {
    const [formData, setFormData] = useState('');
    const [loading, setLoading] = useState(false);
    const [invalidInfo, setInvalidInfo] = useState<string[] | null>(null);
    const [loadingConfirmFile, setLoadingConfirmFile] = useState(false);

    useEffect(() => {
        if (visible && appid) {
            getDomainSetting();
        }
    }, [visible, appid]);

    const getDomainSetting = async () => {
        try {
            const resp = await request({
                request: getModifyWebviewDomainRequest,
                data: { appid }
            });
            if (resp.code === 0 && resp.data) {
                const data = resp.data as ModifyWebviewDomainResp;
                const list = data.webviewDomain ?? (data as any).webviewdomain;
                setFormData(toTextareaValue(list));
                setInvalidInfo(null);
            }
        } catch (error) {
            console.error('获取业务域名配置失败:', error);
            MessagePlugin.error('获取业务域名配置失败');
        }
    };

    const downloadConfirmFile = async () => {
        setLoadingConfirmFile(true);
        try {
            const resp = await request({
                request: { url: `${getJumpDomainConfirmFileRequest.url}?appid=${appid}`, method: getJumpDomainConfirmFileRequest.method }
            });

            if (resp.code === 0 && resp.data) {
                const fileContent = resp.data.file_content || '';
                const fileName = resp.data.file_name || '';

                if (!fileContent) {
                    MessagePlugin.warning('校验文件内容为空');
                    return;
                }

                const element = document.createElement('a');
                const file = new Blob([fileContent], { type: 'text/plain' });
                element.href = URL.createObjectURL(file);
                element.download = fileName;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
                URL.revokeObjectURL(element.href);
                MessagePlugin.success('校验文件已下载');
            }
        } catch (error) {
            console.error('获取校验文件失败:', error);
            MessagePlugin.error('获取校验文件失败');
        } finally {
            setLoadingConfirmFile(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setInvalidInfo(null);
        try {
            const domains = fromTextareaValue(formData);
            if (domains.length === 0) {
                MessagePlugin.warning('请至少填写一个域名');
                setLoading(false);
                return;
            }

            const resp = await request({
                request: { url: `${setModifyWebviewDomainRequest.url}?appid=${appid}`, method: setModifyWebviewDomainRequest.method },
                data: { action: 'set', webviewdomain: domains },
            });

            if (resp.code === 0 && resp.data) {
                const data = resp.data as ModifyWebviewDomainResp;
                const invalid = data.invalidWebviewDomain ?? (data as any).invalid_webviewdomain;

                if (Array.isArray(invalid) && invalid.length > 0) {
                    setInvalidInfo(invalid);
                    MessagePlugin.warning('部分域名设置失败，请查看下方不合法域名');
                } else {
                    MessagePlugin.success('业务域名配置保存成功');
                    onSuccess?.();
                    onClose();
                }
            }
        } catch (error) {
            console.error('保存业务域名配置失败:', error);
            MessagePlugin.error('保存业务域名配置失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            visible={visible}
            onClose={onClose}
            header="配置业务域名"
            width={600}
            confirmBtn={null}
            cancelBtn={null}
            destroyOnClose
        >
            <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 0' }}>
                <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                    配置小程序的 webview 业务域名，用于内嵌网页等场景。域名需先在第三方平台中登记，仅支持 https，不能含有端口号。最多可添加 300 个。
                </p>

                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f3f3f3', borderRadius: '4px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                        <strong>域名校验文件：</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                        下载校验文件并将其放在域名根目录下，用于验证域名所有权。
                    </p>
                    <Button
                        size="small"
                        onClick={downloadConfirmFile}
                        disabled={loadingConfirmFile}
                        loading={loadingConfirmFile}
                    >
                        {loadingConfirmFile ? '加载中...' : '下载校验文件'}
                    </Button>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: 'rgba(0,0,0,0.9)' }}>
                        业务域名（webview）
                    </label>
                    <Textarea
                        value={formData}
                        onChange={(value) => setFormData(String(value ?? ''))}
                        placeholder="每行一个域名，如 https://www.example.com"
                        autosize={{ minRows: 4, maxRows: 10 }}
                        style={{ width: '100%' }}
                    />
                </div>

                {invalidInfo && invalidInfo.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fff2f0', borderRadius: '4px', borderLeft: '4px solid #e34d59' }}>
                        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e34d59' }}>
                            以下域名不合法，请修正后重新提交：
                        </p>
                        <div style={{ fontSize: '12px', color: '#e34d59' }}>
                            {invalidInfo.join(', ')}
                        </div>
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
