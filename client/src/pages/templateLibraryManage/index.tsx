import React, { useEffect, useState } from 'react';
import { Table, Button, Input, MessagePlugin, Dialog, DialogPlugin } from 'tdesign-react';
import { request } from '../../utils/axios';
import { getTemplateDraftListRequest, getTemplateListRequest, delTemplateRequest, addTemplateDraftRequest } from '../../utils/apis';

export default function TemplateLibraryManage() {
  const [templateList, setTemplateList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleAdd, setVisibleAdd] = useState(false);
  const [draftList, setDraftList] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const resp = await request({
      request: getTemplateListRequest,
      data: { templateType: 0 },
    });
    if (resp.code === 0) {
      setTemplateList(resp.data.templateList || []);
    }
    setLoading(false);
  };

  // 获取草稿箱列表
  const fetchDrafts = async () => {
    setDraftLoading(true);
    const resp = await request({
      request: getTemplateDraftListRequest
    });
    if (resp.code === 0) {
      setDraftList(resp.data.draftList || []);
    }
    setDraftLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAdd = async (row) => {
    const resp = await request({
      request: addTemplateDraftRequest,
      data: { draftId: row.draftId },
    });
    if (resp.code === 0) {
      MessagePlugin.success('添加成功');
      setVisibleAdd(false);
      fetchTemplates();
    }
  };

  const handleDelete = async (row) => {
    const confirmDia  = DialogPlugin.confirm({
      header: '确认删除',
      body: `确定要删除模板ID：${row.templateId} 吗？`,
      onConfirm: async () => {
        const resp = await request({
          request: delTemplateRequest,
          data: { templateId: row.templateId },
        });
        if (resp.code === 0) {
          confirmDia.hide();
          MessagePlugin.success('删除成功');
          fetchTemplates();
        }
      },
      onClose: () => {
        confirmDia.hide();
      }
    });
  };

  const columns = [
    { colKey: 'templateId', title: '模板ID' },
    { colKey: 'userVersion', title: '版本号' },
    { colKey: 'userDesc', title: '模板描述' },
    {
      colKey: 'op',
      title: '操作',
      cell: ({ row }) => (
        <Button theme="danger" size="small" onClick={() => handleDelete(row)}>
          删除
        </Button>
      ),
    },
  ];

  const draftColumns = [
    { colKey: 'draftId', title: '草稿ID' },
    { colKey: 'userVersion', title: '版本号' },
    { colKey: 'userDesc', title: '草稿描述' },
    {
      colKey: 'op',
      title: '操作',
      cell: ({ row }) => (
        <Button theme="primary" size="small" onClick={() => handleAdd(row)}>
          添加到模板库
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button theme="primary" onClick={() => { setVisibleAdd(true); fetchDrafts(); }}>
          添加模板
        </Button>
      </div>
      <Table rowKey="templateId" columns={columns} data={templateList} loading={loading} />
      <Dialog visible={visibleAdd} header="草稿箱" onClose={() => setVisibleAdd(false)} confirmBtn={null} cancelBtn={null} width={700}>
        <Table rowKey="templateId" columns={draftColumns} data={draftList} loading={draftLoading} />
      </Dialog>
    </div>
  );
}
