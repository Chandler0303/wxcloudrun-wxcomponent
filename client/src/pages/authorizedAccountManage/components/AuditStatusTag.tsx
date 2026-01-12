import { Tag } from "tdesign-react";

type AuditVersion = {
    status: number
    userVersion: string
    userDesc: string
    submitAuditTime: number
}
export default function AuditStatusTag({ auditVersion }: { auditVersion: AuditVersion }) {
    if (!auditVersion) return null;
    return (
        <>
            {auditVersion.status === 0 && <Tag theme="success">审核通过</Tag>}
            {auditVersion.status === 1 && <Tag theme="danger">审核不通过</Tag>}
            {auditVersion.status === 2 && <Tag theme="warning">审核中</Tag>}
            {auditVersion.status === 3 && <Tag theme="primary">已撤回</Tag>}
            {auditVersion.status === 4 && <Tag theme="warning">审核延后</Tag>}
        </>
    )
}