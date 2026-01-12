import { Dialog, Select, MessagePlugin } from 'tdesign-react';
import { useState, useEffect } from 'react';
import { request } from '../../../utils/axios';
import { updateDevWeAppRequest } from '../../../utils/apis';
import { regionType } from '../enum';

interface RegionTypeDialogProps {
    visible: boolean;
    appid: string;
    initialRegionType?: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function RegionTypeDialog({
    visible,
    appid,
    initialRegionType,
    onClose,
    onSuccess
}: RegionTypeDialogProps) {
    const [currentRegionType, setCurrentRegionType] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setCurrentRegionType(initialRegionType || '');
        }
    }, [visible, initialRegionType]);

    const handleConfirm = async () => {
        if (!currentRegionType) {
            MessagePlugin.warning('请选择局点类型');
            return;
        }
        setLoading(true);
        try {
            const resp = await request({
                request: updateDevWeAppRequest,
                data: {
                    appid: appid,
                    regionType: currentRegionType
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
            header="编辑局点类型"
            visible={visible}
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmBtn={{ loading: loading }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80px' }}>局点类型：</div>
                <Select
                    value={currentRegionType}
                    onChange={(val) => setCurrentRegionType(val as string)}
                    options={Object.keys(regionType).map(key => ({
                        label: regionType[Number(key)],
                        value: key
                    }))}
                    style={{ width: '300px' }}
                />
            </div>
        </Dialog>
    );
}
