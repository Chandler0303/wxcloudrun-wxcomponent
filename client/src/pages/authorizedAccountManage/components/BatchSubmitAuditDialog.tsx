import {
    Dialog,
    Form,
    Select,
    Input,
    Textarea,
    Button,
    MessagePlugin,
} from 'tdesign-react';
import { useState, useEffect, useRef } from 'react';
import { request } from '../../../utils/axios';
import { batchSubmitAuditRequest, getCategoryRequest } from '../../../utils/apis';

const { FormItem } = Form;
const { Option } = Select;

type ICategory = {
    firstClass: string;
    secondClass: string;
    thirdClass?: string;
    firstId: number;
    secondId: number;
    thirdId?: number;
};

interface BatchSubmitAuditDialogProps {
    visible: boolean;
    appids: (string | number)[];
    selectedRows: { appid: string; nickName: string }[];
    onClose: () => void;
    onSuccess?: () => void;
}

export default function BatchSubmitAuditDialog({
    visible,
    appids,
    selectedRows,
    onClose,
    onSuccess,
}: BatchSubmitAuditDialogProps) {
    const formRef = useRef() as any;
    const [loading, setLoading] = useState(false);
    const [categoryList, setCategoryList] = useState<ICategory[]>([]);
    const [result, setResult] = useState<{
        success: string[];
        failed: { appid: string; errMsg: string }[];
    } | null>(null);

    useEffect(() => {
        if (visible) {
            setResult(null);
            if (appids.length > 0) {
                getCategoryList(String(appids[0]));
            }
        }
    }, [visible, appids]);

    const getCategoryList = async (appid: string) => {
        const resp = await request({
            request: getCategoryRequest,
            data: { appid },
        });
        if (resp.code === 0 && resp.data?.categoryList) {
            setCategoryList(resp.data.categoryList);
        }
    };

    const handleSubmit = async (e: { validateResult: any }) => {
        if (e.validateResult !== true) return;
        const { templateId, versionDesc } = formRef.current.getAllFieldsValue();

        if (templateId === undefined || templateId === null) {
            MessagePlugin.warning('请选择小程序类目');
            return;
        }

        const mainCategory = categoryList[templateId];
        if (!mainCategory || !mainCategory.firstId) {
            MessagePlugin.warning('请选择有效的小程序类目');
            return;
        }

        const itemList = [
            {
                address: '',
                tag: '',
                firstClass: mainCategory.firstClass,
                secondClass: mainCategory.secondClass,
                thirdClass: mainCategory.thirdClass || '',
                firstId: mainCategory.firstId,
                secondId: mainCategory.secondId,
                thirdId: mainCategory.thirdId || 0,
                title: '',
            },
        ];

        const auditConfig = {
            itemList,
            previewInfo: { videoIdList: [], picIdList: [] },
            versionDesc: versionDesc || '',
            feedbackInfo: '',
            feedbackStuff: '',
            ugcDeclare: {
                scene: [0],
                otherSceneDesc: '',
                method: [],
                hasAuditTeam: 0,
                auditDesc: '',
            },
        };

        setLoading(true);
        setResult(null);
        try {
            const resp = await request({
                request: batchSubmitAuditRequest,
                data: {
                    appids: appids.map(String),
                    auditConfig,
                },
            });
            if (resp.code === 0 && resp.data) {
                setResult({
                    success: resp.data.success || [],
                    failed: resp.data.failed || [],
                });
                const successCount = (resp.data.success || []).length;
                const failedCount = (resp.data.failed || []).length;
                if (failedCount === 0) {
                    MessagePlugin.success(`全部成功，共 ${successCount} 个`);
                    onSuccess?.();
                    onClose();
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
            header="批量提交审核"
            visible={visible}
            onClose={onClose}
            width={600}
            footer={null}
        >
            <div>
                <p className="desc">已选择 {appids.length} 个小程序</p>
                <div style={{ maxHeight: '80px', overflowY: 'auto', marginBottom: '16px' }}>
                    {selectedRows.map((row) => (
                        <div key={row.appid} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                            {row.nickName}（{row.appid}）
                        </div>
                    ))}
                </div>
                {!result ? (
                    <Form ref={formRef} onSubmit={handleSubmit} labelWidth={120}>
                        <FormItem
                            name="templateId"
                            label="小程序类目"
                            rules={[{ required: true, message: '请选择类目', type: 'error' }]}
                        >
                            <Select style={{ width: '100%' }} placeholder="请选择类目">
                                {categoryList.map((i, index) => (
                                    <Option
                                        key={`${i.firstClass}-${i.secondClass}-${i.thirdClass || ''}`}
                                        value={index}
                                        label={`${i.firstClass} - ${i.secondClass}${i.thirdClass ? ` - ${i.thirdClass}` : ''}`}
                                    />
                                ))}
                            </Select>
                        </FormItem>
                        <FormItem name="versionDesc" label="版本描述">
                            <Textarea placeholder="如登录小程序需要帐号密码" />
                        </FormItem>
                        <FormItem statusIcon={false}>
                            <Button theme="primary" type="submit" loading={loading} style={{ marginRight: 10 }}>
                                提交
                            </Button>
                            <Button onClick={onClose}>关闭</Button>
                        </FormItem>
                    </Form>
                ) : (
                    <div>
                        {result.success.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                                <p className="desc">成功 ({result.success.length})：</p>
                                <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                                    {result.success.map((appid) => (
                                        <div key={appid} style={{ color: '#52c41a', padding: '2px 0' }}>
                                            {appid}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.failed.length > 0 && (
                            <div>
                                <p className="desc">失败 ({result.failed.length})：</p>
                                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                                    {result.failed.map((item) => (
                                        <div
                                            key={item.appid}
                                            style={{ color: '#ff4d4f', padding: '4px 0', fontSize: '12px' }}
                                        >
                                            {item.appid}: {item.errMsg}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Button theme="primary" onClick={onClose} style={{ marginTop: '12px' }}>
                            关闭
                        </Button>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
