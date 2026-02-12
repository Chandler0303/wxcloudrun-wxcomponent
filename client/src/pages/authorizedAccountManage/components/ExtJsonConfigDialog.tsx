import { Dialog, Textarea, MessagePlugin } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { updateDevWeAppRequest } from '../../../utils/apis';

interface ExtJsonConfigDialogProps {
    visible: boolean;
    appid: string;
    initialExtJsonConfig?: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ExtJsonConfigDialog({
    visible,
    appid,
    initialExtJsonConfig,
    onClose,
    onSuccess
}: ExtJsonConfigDialogProps) {
    const [extJsonConfig, setExtJsonConfig] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setExtJsonConfig(initialExtJsonConfig || '');
        }
    }, [visible, initialExtJsonConfig]);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const resp = await request({
                request: updateDevWeAppRequest,
                data: {
                    appid: appid,
                    extJsonConfig: extJsonConfig
                }
            });
            if (resp.code === 0) {
                MessagePlugin.success('设置成功');
                onSuccess?.();
                onClose();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            header="extJson配置"
            visible={visible}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmBtn={{ loading: loading }}
        >
            <Textarea
                    value={extJsonConfig}
                    onChange={(val) => setExtJsonConfig(val as string)}
                    placeholder="请输入extJson配置内容"
                    autosize={{ minRows: 4, maxRows: 10 }}
                    maxlength={500}
                    showLimitNumber
                />
        </Dialog>
    );
}
