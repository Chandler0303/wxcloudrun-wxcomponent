import { Dialog, Form, Select, Input, Textarea, Button, MessagePlugin } from 'tdesign-react';

const { FormItem } = Form;
import { useState, useEffect, useRef } from 'react';
import { request } from '../../../utils/axios';
import { batchCommitCodeRequest, getTemplateListRequest } from '../../../utils/apis';
import { truncate } from 'lodash';

const { Option } = Select;

type ITemplateItem = {
    templateId: number;
    userVersion: string;
    userDesc: string;
};

interface BatchCommitCodeDialogProps {
    visible: boolean;
    appids: (string | number)[];
    selectedRows: { appid: string; nickName: string }[];
    onClose: () => void;
    onSuccess?: () => void;
}

export default function BatchCommitCodeDialog({
    visible,
    appids,
    selectedRows,
    onClose,
    onSuccess
}: BatchCommitCodeDialogProps) {
    const formRef = useRef() as any;
    const [loading, setLoading] = useState(false);
    const [templateList, setTemplateList] = useState<ITemplateItem[]>([]);
    const [result, setResult] = useState<{ success: string[]; failed: { appid: string; errMsg: string }[] } | null>(null);

    useEffect(() => {
        if (visible) {
            setResult(null);
            getTemplateList();
        }
    }, [visible]);

    const getTemplateList = async () => {
        const resp = await request({
            request: getTemplateListRequest,
            data: { templateType: 0 }
        });
        if (resp.code === 0 && resp.data?.templateList) {
            setTemplateList(resp.data.templateList);
        }
    };

    const handleSubmit = async (e: { validateResult: any }) => {
        if (e.validateResult !== true) return;
        const { templateId, userVersion, userDesc } = formRef.current.getAllFieldsValue();
        if (!templateId) {
            MessagePlugin.warning('请选择模板');
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const resp = await request({
                request: batchCommitCodeRequest,
                data: {
                    appids: appids.map(String),
                    templateId: String(templateId),
                    userVersion,
                    userDesc
                }
            });
            if (resp.code === 0 && resp.data) {
                setResult({
                    success: resp.data.success || [],
                    failed: resp.data.failed || []
                });
                const successCount = (resp.data.success || []).length;
                const failedCount = (resp.data.failed || []).length;
                if (failedCount === 0) {
                    MessagePlugin.success(`全部成功，共 ${successCount} 个`);
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
            header="批量发体验版"
            visible={visible}
            onClose={onClose}
            width={600}
            footer={null}
        >
            <div>
                <p className="desc">已选择 {appids.length} 个小程序，extJson 将使用各小程序在数据库中的配置</p>
                <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px' }}>
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
                            label="模板ID"
                            rules={[{ required: true, message: '请选择模板', type: 'error' }]}
                        >
                            <Select style={{ width: '100%' }} placeholder="请选择模板">
                                {templateList.map((i) => (
                                    <Option key={i.templateId} value={i.templateId} label={`ID：${i.templateId}`}>
                                        <div className="normal_flex">
                                            <span style={{ width: '80px' }}>{i.templateId}</span>
                                            <span style={{ width: '80px' }}>{i.userVersion}</span>
                                            <span style={{ flex: 1 }}>{truncate(i.userDesc, { length: 20 })}</span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </FormItem>
                        <FormItem
                            name="userVersion"
                            label="代码版本号"
                            rules={[{ required: true, message: '请输入版本号', type: 'error' }]}
                        >
                            <Input placeholder="长度不超过64字符" />
                        </FormItem>
                        <FormItem
                            name="userDesc"
                            label="版本描述"
                            rules={[{ required: true, message: '请输入版本描述', type: 'error' }]}
                        >
                            <Textarea placeholder="版本描述" />
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
