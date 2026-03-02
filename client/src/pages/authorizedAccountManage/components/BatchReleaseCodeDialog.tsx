import { Dialog, Button, MessagePlugin } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { batchReleaseCodeRequest } from '../../../utils/apis';

interface BatchReleaseCodeDialogProps {
    visible: boolean;
    appids: (string | number)[];
    selectedRows: { appid: string; nickName: string }[];
    onClose: () => void;
    onSuccess?: () => void;
}

export default function BatchReleaseCodeDialog({
    visible,
    appids,
    selectedRows,
    onClose,
    onSuccess
}: BatchReleaseCodeDialogProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: string[]; failed: { appid: string; errMsg: string }[] } | null>(null);

    useEffect(() => {
        if (visible) {
            setResult(null);
        }
    }, [visible]);

    const handleRelease = async () => {
        setLoading(true);
        setResult(null);
        try {
            const resp = await request({
                request: batchReleaseCodeRequest,
                data: { appids: appids.map(String) }
            });
            if (resp.code === 0 && resp.data) {
                setResult({
                    success: resp.data.success || [],
                    failed: resp.data.failed || []
                });
                const successCount = (resp.data.success || []).length;
                const failedCount = (resp.data.failed || []).length;
                if (failedCount === 0) {
                    MessagePlugin.success(`全部发布成功，共 ${successCount} 个`);
                    onSuccess?.();
                } else if (successCount > 0) {
                    MessagePlugin.warning(`成功 ${successCount} 个，失败 ${failedCount} 个`);
                } else {
                    MessagePlugin.error('全部失败');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            header="批量发布"
            visible={visible}
            onClose={onClose}
            width={560}
            footer={null}
        >
            <div>
                <p className="desc">将已通过审核的版本发布为线上版，共选择 {appids.length} 个小程序。</p>
                <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px' }}>
                    {selectedRows.map((row) => (
                        <div key={row.appid} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                            {row.nickName}（{row.appid}）
                        </div>
                    ))}
                </div>
                {!result ? (
                    <div>
                        <Button theme="primary" loading={loading} onClick={handleRelease} style={{ marginRight: 10 }}>
                            确认发布
                        </Button>
                        <Button onClick={onClose}>取消</Button>
                    </div>
                ) : (
                    <div>
                        {result.success.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <p className="desc">成功 ({result.success.length})：</p>
                                <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                                    {result.success.map((appid) => (
                                        <div key={appid} style={{ color: '#52c41a', padding: '2px 0' }}>{appid}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.failed.length > 0 && (
                            <div>
                                <p className="desc">失败 ({result.failed.length})：</p>
                                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                    {result.failed.map((item) => (
                                        <div key={item.appid} style={{ color: '#ff4d4f', padding: '4px 0', fontSize: '12px' }}>
                                            {item.appid}: {item.errMsg}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Button theme="primary" onClick={onClose} style={{ marginTop: '12px' }}>关闭</Button>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
