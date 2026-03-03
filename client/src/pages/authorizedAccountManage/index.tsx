import { Table, Input, Dialog, Tabs, MessagePlugin, Tag, Select, Dropdown, Button } from 'tdesign-react';
import { SearchIcon, Icon } from 'tdesign-icons-react'
import { useEffect, useState } from "react";
import { request } from "../../utils/axios";
import {
    changeServiceStatusRequest,
    getAuthAccessTokenRequest,
    getAuthorizedAccountRequest,
    getDevMiniProgramListRequest, getQrcodeRequest, getExpQrcodeRequest, updateDevWeAppRequest
} from "../../utils/apis";
import { PrimaryTableCol } from "tdesign-react/es/table/type";
import moment from "moment";
import { copyMessage } from "../../utils/common";
import {
    officialAccountAuthType,
    miniProgramAuthType,
    tokenColumn,
    tabs,
    serviceStatus,
    accountStatus, registerType, normalAccountStatus,
    regionType
} from './enum'
import { routes } from "../../config/route";
import PrivacySettingDialog from './components/PrivacySettingDialog';
import DomainSettingDialog from './components/DomainSettingDialog';
import WebviewDomainSettingDialog from './components/WebviewDomainSettingDialog';
import AuditStatusTag from './components/AuditStatusTag';
import RegionTypeDialog from './components/RegionTypeDialog';
import ExtJsonConfigDialog from './components/ExtJsonConfigDialog';
import BatchCommitCodeDialog from './components/BatchCommitCodeDialog';
import BatchSubmitAuditDialog from './components/BatchSubmitAuditDialog';
import BatchReleaseCodeDialog from './components/BatchReleaseCodeDialog';

const { TabPanel } = Tabs

export default function AuthorizedAccountManage() {

    const accountColumn: PrimaryTableCol[] = [
        {
            align: 'center',
            minWidth: 100,
            colKey: 'appid',
            title: 'AppID',
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'userName',
            title: '原始ID',
        },
        {
            align: 'center',
            minWidth: 120,
            colKey: 'nickName',
            title: '名称',
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'appType',
            title: '帐号类型',
            cell: ({ row }) => {
                return row.appType === 0 ? '小程序' : '公众号'
            }
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'authTime',
            title: '授权时间',
            render: ({ row }) => moment(row.authTime).format('YYYY-MM-DD HH:mm:ss')
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'principalName',
            title: '主体信息',
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'registerType',
            title: '注册类型',
            render: ({ row }) => registerType[row.registerType]
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'accountStatus',
            title: '帐号状态',
            render: ({ row }) => normalAccountStatus[row.accountStatus]
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'isPhoneConfigured',
            title: '已绑手机号',
            render: ({ row }) => row.basicConfig ? row.basicConfig.isPhoneConfigured ? '已绑定' : '未绑定' : '-'
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'isEmailConfigured',
            title: '已绑邮箱',
            render: ({ row }) => row.basicConfig ? row.basicConfig.isEmailConfigured ? '已绑定' : '未绑定' : '-'
        },
        {
            align: 'center',
            minWidth: 100,
            className: 'row',
            colKey: 'verifyInfo',
            title: '认证类型',
            cell: ({ row }) => {
                return row.appType === 0 ? miniProgramAuthType[String(row.verifyInfo)] : officialAccountAuthType[String(row.verifyInfo)]
            }
        },
        {
            align: 'center',
            minWidth: 100,
            className: 'row',
            colKey: 'funcInfo',
            title: '授权权限集ID',
        },
        {
            align: 'center',
            fixed: 'right',
            className: 'row',
            colKey: 'id',
            title: '操作',
            render({ row }) {
                if (row.accountStatus === 16) {
                    return (
                        <div style={{ width: '210px' }}>
                            <p className="desc">该帐号已封禁</p>
                        </div>
                    );
                } else {
                    const options = [
                        { content: '获取token', value: 'token' },
                        { content: '复制refresh_token', value: 'copy' },
                    ];
                    return (
                        <div style={{ width: '120px' }}>
                            <Dropdown
                                options={options}
                                maxColumnWidth={180}
                                onClick={(opt) => {
                                    if (opt.value === 'token') {
                                        if (window.confirm('从数据库获取 token，非重新生成token，不会导致上一个 token 被刷新而失效。确认获取？')) {
                                            createToken(row.appid);
                                        }
                                    } else if (opt.value === 'copy') {
                                        copyMessage(row.refreshToken);
                                    }
                                }}
                            >
                                <Button variant="text" theme="default" size="small"><Icon name="ellipsis" size="20" /></Button>
                            </Dropdown>
                        </div>
                    );
                }
            },
        },
    ]

    const miniProgramColumn: PrimaryTableCol[] = [
        {
            colKey: 'row-select',
            type: 'multiple',
            width: 50,
        },
        {
            align: 'center',
            width: 220,
            minWidth: 220,
            colKey: 'appid',
            title: '基本信息',
            render: ({ row }) => (
                <div style={{ width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span>名称：{row.nickName}</span>
                    <span>AppID：{row.appid}</span>
                </div>
            )
        },
        {
            align: 'center',
            minWidth: 100,
            colKey: 'regionType',
            title: '局点',
            render: ({ row }) => (
                <a className="a" onClick={() => openRegionTypeDialog(row)}>
                    {regionType[row.regionType] || '--'} <Icon name="edit-1" />
                </a>
            )
        },
        {
            align: 'center',
            width: 180,
            minWidth: 180,
            colKey: 'releaseInfo',
            title: '生产信息',
            render: ({ row }) => (
                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span>状态：{row.releaseInfo ? '已有上线版本' : '尚未发布'}</span>
                    <span>版本：{row.releaseInfo ? row.releaseInfo.releaseVersion : '--'}</span>
                    <span>服务：{serviceStatus[row.serviceStatus]}</span>
                </div>
            )
        },
        {
            align: 'center',
            width: 200,
            minWidth: 200,
            colKey: 'auditVersion',
            title: '审核信息',
            render: ({ row }) => {
                if (row.auditVersion) {
                    return <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <AuditStatusTag auditVersion={row.auditVersion} />
                        <span>版本：{row.auditVersion.userVersion}</span>
                        <span>时间：{moment(row.auditVersion.submitAuditTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                        {row.auditVersion.userDesc && <span>描述：{row.auditVersion.userDesc}</span>}
                    </div>
                } else {
                    return '--'
                }
            }
        },
        {
            align: 'center',
            width: 200,
            minWidth: 200,
            colKey: 'expInfo',
            title: '体验版信息',
            render: ({ row }) => {
                if (row.expInfo) {
                    return (
                        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span>版本：{row.expInfo.expVersion}</span>
                            <span>时间：{moment(row.expInfo.expTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                            {row.expInfo.expDesc && <span>描述：{row.expInfo.expDesc}</span>}
                        </div>
                    );
                }
                return '--';
            }
        },
        {
            align: 'center',
            fixed: 'right',
            width: 120,
            minWidth: 120,
            className: 'row',
            colKey: 'id',
            title: '操作',
            render({ row }) {
                const options = [
                    ...(row.releaseInfo && row.funcInfo?.includes?.(17) ? [{ content: '获取小程序码', value: 'qrcode' }] : []),
                    ...(row.expInfo ? [{ content: '获取体验版二维码', value: 'expQrcode' }] : []),
                    ...(row.serviceStatus === 0 ? [{ content: '恢复服务', value: 'restore' }] : []),
                    { content: '版本管理', value: 'version' },
                    { content: '完善用户协议', value: 'privacy' },
                    { content: '服务器域名', value: 'domain' },
                    { content: '业务域名', value: 'webviewDomain' },
                    { content: 'extJson配置', value: 'remark' },
                ].filter(Boolean);
                return (
                    <div style={{ width: '120px' }}>
                        <Dropdown
                            options={options}
                            maxColumnWidth={180}
                            onClick={(opt) => {
                                switch (opt.value) {
                                    case 'qrcode': getMiniProgramCode(row.appid); break;
                                    case 'expQrcode': getExpQrCode(row.appid); break;
                                    case 'restore': openServiceStatus(row.appid); break;
                                    case 'version': window.location.hash = `${routes.miniProgramVersion.path}?appId=${row.appid}`; break;
                                    case 'privacy': openPrivacyPolicy(row.appid); break;
                                    case 'domain': openDomainSetting(row.appid); break;
                                    case 'webviewDomain': openWebviewDomainSetting(row.appid); break;
                                    case 'remark': openExtJsonConfigDialog(row); break;
                                }
                            }}
                        >
                            <Button variant="text" theme="default" size="small"><Icon name="ellipsis" size="20" /></Button>
                        </Dropdown>
                    </div>
                );
            },
        },
    ]

    const pageSize = 15

    const [accountList, setAccountList] = useState([])
    const [miniProgramList, setMiniProgramList] = useState([])
    const [accountTotal, setAccountTotal] = useState(0)
    const [mpAccountTotal, setMpAccountTotal] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [mpCurrentPage, setMpCurrentPage] = useState(1)
    const [miniProgramAppIdInput, setMiniProgramAppIdInput] = useState<string | number>('')
    const [miniProgramNameInput, setMiniProgramNameInput] = useState<string | number>('')
    const [miniProgramRegionType, setMiniProgramRegionType] = useState<string>('')
    const [appIdInput, setAppIdInput] = useState<string | number>('')
    const [visibleTokenModal, setVisibleTokenModal] = useState(false)
    const [tokenData, setTokenData] = useState([{ token: '' }])
    const [selectedTab, setSelectedTab] = useState<string | number>(tabs[0].value)
    const [visibleQrcode, setVisibleQrcode] = useState(false)
    const [qrcode, setQrcode] = useState('')
    const [qrcodeDialogTitle, setQrcodeDialogTitle] = useState('获取小程序码')
    const [visiblePrivacyDialog, setVisiblePrivacyDialog] = useState(false)
    const [currentPrivacyAppId, setCurrentPrivacyAppId] = useState('')
    const [visibleRegionDialog, setVisibleRegionDialog] = useState(false)
    const [currentRegionAppId, setCurrentRegionAppId] = useState('')
    const [currentRegionType, setCurrentRegionType] = useState('')
    const [visibleDomainDialog, setVisibleDomainDialog] = useState(false)
    const [currentDomainAppId, setCurrentDomainAppId] = useState('')
    const [visibleWebviewDomainDialog, setVisibleWebviewDomainDialog] = useState(false)
    const [currentWebviewDomainAppId, setCurrentWebviewDomainAppId] = useState('')
    const [visibleExtJsonConfigDialog, setVisibleExtJsonConfigDialog] = useState(false)
    const [currentExtJsonConfigAppId, setCurrentExtJsonConfigAppId] = useState('')
    const [currentExtJsonConfig, setCurrentExtJsonConfig] = useState('')
    const [selectedMiniProgramKeys, setSelectedMiniProgramKeys] = useState<(string | number)[]>([])
    const [visibleBatchSubmitAuditDialog, setVisibleBatchSubmitAuditDialog] = useState(false)
    const [visibleBatchCommitCodeDialog, setVisibleBatchCommitCodeDialog] = useState(false)
    const [visibleBatchReleaseCodeDialog, setVisibleBatchReleaseCodeDialog] = useState(false)

    useEffect(() => {
        if (selectedTab === tabs[0].value) {
            getAccountList()
        }
    }, [currentPage, selectedTab])

    useEffect(() => {
        if (selectedTab === tabs[1].value) {
            getMiniProgramList()
        }
    }, [mpCurrentPage, selectedTab, miniProgramRegionType])

    useEffect(() => {
        if (selectedTab === tabs[1].value) {
            setSelectedMiniProgramKeys([])
        }
    }, [mpCurrentPage])

    const createToken = async (appId: string) => {
        const resp = await request({
            request: getAuthAccessTokenRequest,
            data: {
                appid: appId
            }
        })
        if (resp.code === 0) {
            setTokenData([{
                token: resp.data.token
            }])
            setVisibleTokenModal(true)
        }
    }

    const getAccountList = async () => {
        const resp = await request({
            request: getAuthorizedAccountRequest,
            data: {
                offset: (currentPage - 1) * pageSize,
                limit: pageSize,
                appid: appIdInput
            }
        })
        if (resp.code === 0) {
            setAccountList(resp.data.records)
            setAccountTotal(resp.data.total)
        }
    }

    const getMiniProgramList = async () => {
        const resp = await request({
            request: getDevMiniProgramListRequest,
            data: {
                offset: (mpCurrentPage - 1) * pageSize,
                limit: pageSize,
                appid: miniProgramAppIdInput,
                name: miniProgramNameInput,
                regionType: miniProgramRegionType
            }
        })
        if (resp.code === 0) {
            setMiniProgramList(resp.data.records)
            setMpAccountTotal(resp.data.total)
        }
    }

    const getMiniProgramCode = async (appId: string) => {
        const resp = await request({
            request: getQrcodeRequest,
            data: { appid: appId }
        })
        if (resp.code === 0) {
            setQrcode('data:image/png;base64,' + resp.data.releaseQrCode)
            setQrcodeDialogTitle('获取小程序码')
            setVisibleQrcode(true)
        }
    }

    const getExpQrCode = async (appId: string) => {
        const resp = await request({
            request: getExpQrcodeRequest,
            data: { appid: appId }
        })
        if (resp.code === 0) {
            setQrcode('data:image/png;base64,' + resp.data.expQrCode)
            setQrcodeDialogTitle('获取体验版二维码')
            setVisibleQrcode(true)
        }
    }

    const openServiceStatus = async (appId: string) => {
        const resp = await request({
            request: {
                url: `${changeServiceStatusRequest.url}?appid=${appId}`,
                method: changeServiceStatusRequest.method
            },
            data: {
                action: "open"
            }
        })
        if (resp.code === 0) {
            MessagePlugin.success('恢复服务状态成功')
            getMiniProgramList()
        }
    }

    const openPrivacyPolicy = (appId: string) => {
        setCurrentPrivacyAppId(appId)
        setVisiblePrivacyDialog(true)
    }

    const handlePrivacySuccess = () => {
        getMiniProgramList()
    }

    const openRegionTypeDialog = (row: any) => {
        setCurrentRegionAppId(row.appid)
        setCurrentRegionType(String(row.regionType || ''))
        setVisibleRegionDialog(true)
    }

    const handleRegionTypeSuccess = () => {
        getMiniProgramList()
    }

    const openDomainSetting = (appId: string) => {
        setCurrentDomainAppId(appId)
        setVisibleDomainDialog(true)
    }

    const handleDomainSuccess = () => {
        getMiniProgramList()
    }

    const openWebviewDomainSetting = (appId: string) => {
        setCurrentWebviewDomainAppId(appId)
        setVisibleWebviewDomainDialog(true)
    }

    const handleWebviewDomainSuccess = () => {
        getMiniProgramList()
    }

    const openExtJsonConfigDialog = (row: any) => {
        setCurrentExtJsonConfigAppId(row.appid)
        setCurrentExtJsonConfig(row.extJsonConfig || '')
        setVisibleExtJsonConfigDialog(true)
    }

    const handleExtJsonConfigSuccess = () => {
        getMiniProgramList()
    }

    const openBatchSubmitAuditDialog = () => {
        setVisibleBatchSubmitAuditDialog(true)
    }

    const handleBatchSubmitAuditClose = () => {
        setVisibleBatchSubmitAuditDialog(false)
    }

    const openBatchCommitCodeDialog = () => {
        setVisibleBatchCommitCodeDialog(true)
    }

    const handleBatchCommitCodeClose = () => {
        setVisibleBatchCommitCodeDialog(false)
        setSelectedMiniProgramKeys([])
        getMiniProgramList()
    }

    const handleBatchCommitCodeSuccess = () => {
        getMiniProgramList()
    }

    const openBatchReleaseCodeDialog = () => {
        setVisibleBatchReleaseCodeDialog(true)
    }

    const handleBatchReleaseCodeClose = () => {
        setVisibleBatchReleaseCodeDialog(false)
        setSelectedMiniProgramKeys([])
        getMiniProgramList()
    }

    const handleBatchReleaseCodeSuccess = () => {
        getMiniProgramList()
    }

    return (
        <div>
            <p className="text">授权帐号介绍</p>
            <div className="normal_flex">
                <div className="blue_circle" />
                <p className="desc"
                    style={{ margin: 0 }}>授权帐号指的是获得公众号或者小程序管理员授权的帐号，服务商可为授权帐号提供代开发、代运营等服务。</p>
            </div>
            <div className="normal_flex">
                <div className="blue_circle" />
                <p className="desc">代开发小程序指的是小程序管理员将权限集id为18的"小程序开发与数据分析"权限授权给该第三方，服务商可代小程序提交代码、发布上线等</p>
            </div>
            <Tabs value={selectedTab} placement={'top'} size="medium" theme="normal"
                onChange={val => setSelectedTab(val)}>
                <TabPanel value={tabs[0].value} label={tabs[0].label}>
                    <Input value={appIdInput} onChange={setAppIdInput} style={{ width: '250px', margin: '10px 0' }} placeholder="请输入 AppID，不支持模糊搜索" suffixIcon={<a className="a" onClick={getAccountList}><SearchIcon /></a>} />
                    <Table
                        data={accountList}
                        columns={accountColumn}
                        rowKey="id"
                        tableLayout="auto"
                        verticalAlign="middle"
                        size="small"
                        hover
                        // 与pagination对齐
                        pagination={{
                            total: accountTotal,
                            current: currentPage,
                            pageSize: pageSize,
                            pageSizeOptions: [],
                            onCurrentChange: setCurrentPage,
                            showJumper: true,
                        }}
                    />
                </TabPanel>
                <TabPanel value={tabs[1].value} label={tabs[1].label}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Input value={miniProgramAppIdInput} onChange={setMiniProgramAppIdInput} style={{ width: '250px', margin: '10px 0' }} placeholder="请输入 AppID，不支持模糊搜索" suffixIcon={<a className="a" onClick={getMiniProgramList}><SearchIcon /></a>} />
                        <Input style={{ width: '250px', margin: '10px' }} value={miniProgramNameInput} onChange={setMiniProgramNameInput} placeholder="请输入 名称，支持模糊搜索" suffixIcon={<a className="a" onClick={getMiniProgramList}><SearchIcon /></a>} />
                        <Select
                            style={{ width: '200px' }}
                            placeholder="请选择局点类型"
                            clearable
                            onChange={(value) => {
                                setMiniProgramRegionType(value as string)
                            }}
                            value={miniProgramRegionType}
                        >
                            {Object.keys(regionType).map((key) => (
                                <Select.Option key={key} value={key}>
                                    {regionType[Number(key)]}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                        <Button
                            theme="primary"
                            variant="outline"
                            onClick={() => {
                                if (selectedMiniProgramKeys.length === 0) {
                                    MessagePlugin.warning('请先勾选小程序')
                                    return
                                }
                                openBatchCommitCodeDialog()
                            }}
                        >
                            批量发体验版 {selectedMiniProgramKeys.length > 0 ? `(${selectedMiniProgramKeys.length})` : ''}
                        </Button>
                        <Button
                            theme="primary"
                            variant="outline"
                            onClick={() => {
                                if (selectedMiniProgramKeys.length === 0) {
                                    MessagePlugin.warning('请先勾选要提交审核的小程序')
                                    return
                                }
                                openBatchSubmitAuditDialog()
                            }}
                        >
                            批量提交审核 {selectedMiniProgramKeys.length > 0 ? `(${selectedMiniProgramKeys.length})` : ''}
                        </Button>
                        <Button
                            theme="primary"
                            variant="outline"
                            onClick={() => {
                                if (selectedMiniProgramKeys.length === 0) {
                                    MessagePlugin.warning('请先勾选要发布的小程序')
                                    return
                                }
                                openBatchReleaseCodeDialog()
                            }}
                        >
                            批量发布 {selectedMiniProgramKeys.length > 0 ? `(${selectedMiniProgramKeys.length})` : ''}
                        </Button>
                    </div>
                    <Table
                        data={miniProgramList}
                        columns={miniProgramColumn}
                        rowKey="appid"
                        selectedRowKeys={selectedMiniProgramKeys}
                        onSelectChange={(keys, options) => setSelectedMiniProgramKeys(keys)}
                        tableLayout="auto"
                        verticalAlign="middle"
                        size="small"
                        hover
                        pagination={{
                            pageSize,
                            total: mpAccountTotal,
                            current: mpCurrentPage,
                            pageSizeOptions: [],
                            onCurrentChange: setMpCurrentPage,
                            showJumper: true,
                        }}
                    />
                </TabPanel>
            </Tabs>

            <Dialog header="AuthorizerAccessToken" visible={visibleTokenModal} footer={null} onClose={() => setVisibleTokenModal(false)}>
                <Table
                    data={tokenData}
                    columns={tokenColumn}
                    rowKey="id"
                    tableLayout="auto"
                    verticalAlign="middle"
                    size="small"
                />
            </Dialog>

            <Dialog header={qrcodeDialogTitle} visible={visibleQrcode} footer={null} onClose={() => setVisibleQrcode(false)}>
                <div style={{ textAlign: 'center' }}>
                    <img src={qrcode} style={{ width: '200px', height: '200px' }} alt="" />
                </div>
            </Dialog>

            <PrivacySettingDialog
                visible={visiblePrivacyDialog}
                appid={currentPrivacyAppId}
                onClose={() => setVisiblePrivacyDialog(false)}
                onSuccess={handlePrivacySuccess}
            />

            <RegionTypeDialog
                visible={visibleRegionDialog}
                appid={currentRegionAppId}
                initialRegionType={currentRegionType}
                onClose={() => setVisibleRegionDialog(false)}
                onSuccess={handleRegionTypeSuccess}
            />

            <DomainSettingDialog
                visible={visibleDomainDialog}
                appid={currentDomainAppId}
                onClose={() => setVisibleDomainDialog(false)}
                onSuccess={handleDomainSuccess}
            />

            <WebviewDomainSettingDialog
                visible={visibleWebviewDomainDialog}
                appid={currentWebviewDomainAppId}
                onClose={() => setVisibleWebviewDomainDialog(false)}
                onSuccess={handleWebviewDomainSuccess}
            />

            <ExtJsonConfigDialog
                visible={visibleExtJsonConfigDialog}
                appid={currentExtJsonConfigAppId}
                initialExtJsonConfig={currentExtJsonConfig}
                onClose={() => setVisibleExtJsonConfigDialog(false)}
                onSuccess={handleExtJsonConfigSuccess}
            />

            <BatchSubmitAuditDialog
                visible={visibleBatchSubmitAuditDialog}
                appids={selectedMiniProgramKeys}
                selectedRows={miniProgramList.filter((row: any) => selectedMiniProgramKeys.includes(row.appid)).map((row: any) => ({ appid: row.appid, nickName: row.nickName }))}
                onClose={handleBatchSubmitAuditClose}
                onSuccess={() => {
                    getMiniProgramList();
                    setSelectedMiniProgramKeys([]);
                }}
            />

            <BatchCommitCodeDialog
                visible={visibleBatchCommitCodeDialog}
                appids={selectedMiniProgramKeys}
                selectedRows={miniProgramList.filter((row: any) => selectedMiniProgramKeys.includes(row.appid)).map((row: any) => ({ appid: row.appid, nickName: row.nickName }))}
                onClose={handleBatchCommitCodeClose}
                onSuccess={handleBatchCommitCodeSuccess}
            />

            <BatchReleaseCodeDialog
                visible={visibleBatchReleaseCodeDialog}
                appids={selectedMiniProgramKeys}
                selectedRows={miniProgramList.filter((row: any) => selectedMiniProgramKeys.includes(row.appid)).map((row: any) => ({ appid: row.appid, nickName: row.nickName }))}
                onClose={handleBatchReleaseCodeClose}
                onSuccess={handleBatchReleaseCodeSuccess}
            />

        </div>
    )
}
