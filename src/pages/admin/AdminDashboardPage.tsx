/**
 * AdminDashboardPage — 관리자 대시보드 (Screen 9)
 *
 * 구성:
 *   StatCard       — 핵심 KPI (관리자 대시보드 요약 API)
 *   RecentReports  — 최근 신고 목록 (빠른 처리 링크)
 *   RiskSnapshot   — 최근 위험 탐지 결과 (게시글/채팅)
 *   RecentMembers  — 최근 가입 회원 목록
 *   RecentTrades   — 관리자 대시보드 최근 거래 요약
 *   QuickActions   — 관리 바로가기
 *
 * 데이터:
 *   - 핵심 지표와 최근 거래는 GET /api/admin/dashboard/summary 사용
 *   - 회원/신고/출금 상세 섹션은 각 관리자 목록 API를 개별 조회한다.
 */
import {formatPrice} from '../../utils/format'
import {Link} from 'react-router-dom'
import {type ReactNode, useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Banknote,
  BarChart2,
  Bell,
  CheckCircle2,
  ChevronRight,
  Flag,
  Shield,
  Users,
} from 'lucide-react'
import type {
  AdminDashboardSummary,
  AdminMemberListItem,
  AdminRiskItem,
  AdminWithdrawItem,
  ReportItem,
  RiskLevel,
  TradeStatus,
} from '../../features/admin/api/adminApi'
import {
  getAdminChatRisks,
  getAdminDashboardSummary,
  getAdminMembers,
  getAdminPostRisks,
  getAdminReports,
  getAdminWithdrawList,
  processAdminReport,
  processWithdraw,
} from '../../features/admin/api/adminApi'

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const REPORT_STATUS_META: Record<ReportItem['status'], { label: string; color: string; bg: string }> = {
  PENDING: {label: '미처리', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  NORMAL: {label: '정상', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  WARNING: {label: '경고', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
  DELETED: {label: '삭제됨', color: 'var(--color-text-hint)', bg: 'var(--color-surface-sunken)'},
}

const REPORT_REASON_LABEL: Record<ReportItem['reason'], string> = {
  FAKE: '허위 매물',
  INAPPROPRIATE: '부적절 게시글',
  FRAUD: '사기 의심',
  ETC: '기타',
}

const MEMBER_STATUS_META: Record<AdminMemberListItem['status'], { label: string; color: string }> = {
  ACTIVE: {label: '활성', color: 'var(--color-success)'},
  SUSPENDED: {label: '정지', color: 'var(--color-accent)'},
  WITHDRAWN: {label: '탈퇴', color: 'var(--color-text-hint)'},
}

const RISK_LEVEL_META: Record<Exclude<RiskLevel, never>, { label: string; color: string; bg: string }> = {
  LOW: {label: 'LOW', color: 'var(--color-info)', bg: 'rgba(14,165,233,0.1)'},
  MID: {label: 'MID', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  HIGH: {label: 'HIGH', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
}

const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  REQUESTED: '요청',
  ACCEPTED: '수락',
  PAID: '결제 완료',
  IN_PROGRESS: '진행 중',
  RECEIVED: '수령 완료',
  CONFIRMED: '확정',
  COMPLETED: '거래 완료',
  CANCELED: '취소',
  DISPUTED: '분쟁',
}

function formatDashboardDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일 기준`
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function SectionHeader({title, linkTo, linkLabel}: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold" style={{color: 'var(--color-text-main)'}}>
        {title}
      </h2>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-[13px] font-medium transition-colors
            text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
        >
          {linkLabel ?? '전체 보기'}
          <ChevronRight size={13} strokeWidth={2}/>
        </Link>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  /** 관리자 대시보드 전용 집계 API를 우선 사용해 KPI와 최근 거래를 일관되게 렌더링한다. */
  const {data: dashboardSummary, isLoading: isDashboardSummaryLoading, isError: isDashboardSummaryError} = useQuery({
    queryKey: ['adminDashboard', 'summary'],
    queryFn: getAdminDashboardSummary,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
  
  const dashboardStats = [
    {
      label: '총 회원',
      value: isDashboardSummaryLoading ? '...' : `${dashboardSummary?.memberCount ?? 0}`,
      sub: `오늘 거래 ${dashboardSummary?.todayTradeCount ?? 0}건`,
      icon: Users,
      color: 'var(--color-primary)',
    },
    {
      label: '미처리 신고',
      value: isDashboardSummaryLoading ? '...' : `${dashboardSummary?.pendingReportCount ?? 0}`,
      sub: '즉시 처리 필요',
      icon: Flag,
      color: 'var(--color-accent)',
    },
    {
      label: '출금 대기',
      value: isDashboardSummaryLoading ? '...' : `${dashboardSummary?.pendingWithdrawCount ?? 0}`,
      sub: `오늘 완료 ${dashboardSummary?.todayCompletedTradeCount ?? 0}건`,
      icon: Banknote,
      color: 'var(--color-success)',
    },
    {
      label: '진행 중 분쟁',
      value: isDashboardSummaryLoading ? '...' : `${dashboardSummary?.disputeCount ?? 0}`,
      sub: `오늘 취소 ${dashboardSummary?.todayCanceledTradeCount ?? 0}건`,
      icon: AlertOctagon,
      color: 'var(--color-warning)',
    },
  ] as const
  
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
            <h1 className="text-[24px] font-bold" style={{color: 'var(--color-text-main)'}}>
              관리자 대시보드
            </h1>
          </div>
          <p className="text-[14px]" style={{color: 'var(--color-text-hint)'}}>
            {formatDashboardDate()} · 관리자 운영 데이터
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 h-9 rounded-[8px] text-[14px] font-medium transition-colors
            bg-[var(--color-surface-raised)] text-[var(--color-text-sub)]
            border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        >
          <Bell size={14} strokeWidth={1.75}/>
          알림 설정
        </button>
      </div>
      
      {/* ── KPI 카드 4개 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashboardStats.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="rounded-[12px] p-5"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium" style={{color: 'var(--color-text-hint)'}}>
                  {s.label}
                </p>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{background: `${s.color}18`}}
                >
                  <Icon size={15} style={{color: s.color}} strokeWidth={1.75}/>
                </div>
              </div>
              <p
                className="text-[28px] font-bold leading-none mb-1"
                style={{
                  color: 'var(--color-text-main)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {s.value}
              </p>
              <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                {s.sub}
              </p>
            </div>
          )
        })}
      </div>
      
      {/* ── 메인 그리드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        
        {/* 왼쪽 */}
        <div className="flex flex-col gap-6">
          
          {/* 미처리 신고 — 실제 API 연동 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 신고 내역"/>
            <RecentReportsSection/>
          </div>
          
          {/* 최근 거래 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 거래 현황"/>
            <RecentTradesSection
              summary={dashboardSummary}
              isLoading={isDashboardSummaryLoading}
              isError={isDashboardSummaryError}
            />
          </div>
          {/* 출금 요청 관리 — 실제 API 연동 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="출금 요청 관리"/>
            <WithdrawManagementSection/>
          </div>
        </div>
        
        {/* 오른쪽 */}
        <div className="flex flex-col gap-6">
          
          {/* 최근 가입 회원 — 실제 API 연동 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 가입 회원"/>
            <RecentMembersSection/>
          </div>
          
          {/* 위험 탐지 스냅샷 — 실제 AdminRiskController 연동 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 위험 탐지"/>
            <RiskSnapshotSection/>
          </div>
          
          {/* 빠른 관리 바로가기 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              빠른 관리 메뉴
            </p>
            <div className="flex flex-col gap-2">
              {[
                {
                  to: '/admin/reports',
                  icon: Flag,
                  label: '신고 목록 보기',
                  badge: dashboardSummary?.pendingReportCount ? `${dashboardSummary.pendingReportCount}` : null,
                  badgeColor: 'var(--color-accent)'
                },
                {
                  to: '/admin/disputes',
                  icon: AlertOctagon,
                  label: '분쟁 현황 확인',
                  badge: dashboardSummary?.disputeCount ? `${dashboardSummary.disputeCount}` : null,
                  badgeColor: 'var(--color-warning)'
                },
                {to: '/admin/members', icon: Users, label: '회원 목록 보기', badge: null, badgeColor: ''},
                {to: '/admin/withdrawals', icon: BarChart2, label: '출금 요청 보기', badge: null, badgeColor: ''},
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors
                      border border-[var(--color-primary)] hover:border-[var(--color-accent)]
                      bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)]"
                  >
                    <Icon size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
                    <span className="flex-1 text-[14px] font-medium" style={{color: 'var(--color-text-main)'}}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className="w-5 h-5 rounded-full text-[12px] font-bold text-white flex items-center justify-center"
                        style={{background: item.badgeColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.75}/>
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* 대시보드 연결 상태 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              데이터 연결 상태
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  label: '대시보드 집계',
                  value: dashboardSummary ? '연결됨' : '불러오는 중',
                  icon: BarChart2,
                  color: 'var(--color-primary)'
                },
                {label: '신고 목록', value: '연결됨', icon: Flag, color: 'var(--color-accent)'},
                {label: '출금 요청', value: '연결됨', icon: Banknote, color: 'var(--color-success)'},
                {
                  label: '분쟁 목록',
                  value: dashboardSummary ? '연결됨' : '불러오는 중',
                  icon: AlertOctagon,
                  color: 'var(--color-warning)'
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{color: item.color}} strokeWidth={1.75}/>
                      <span className="text-[13px]" style={{color: 'var(--color-text-sub)'}}>{item.label}</span>
                    </div>
                    <span
                      className="text-[14px] font-bold"
                      style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                    >
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* 관리자 메모 */}
          <div
            className="rounded-[12px] p-4"
            style={{background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--color-info)'}}/>
              <p className="text-[13px] font-semibold" style={{color: 'var(--color-text-main)'}}>
                관리자 대시보드 참고
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                '핵심 KPI와 최근 거래는 관리자 대시보드 집계 API를 사용합니다.',
                '신고·회원·출금 상세 목록은 각 관리자 API를 별도로 조회합니다.',
                '위험 탐지 채팅은 현재 응답에 채팅방 탐색 키가 없어 목록형 점검 UI로 유지합니다.',
              ].map((message) => (
                <div key={message} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                       style={{background: 'var(--color-info)'}}/>
                  <span className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                    {message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 최근 신고 내역 섹션 — 실제 AdminController 연동 */
function RecentReportsSection() {
  const qc = useQueryClient()
  const {data: page, isLoading, isError} = useQuery({
    queryKey: ['adminReports', 'recent'],
    queryFn: () => getAdminReports({page: 0, size: 5}),
    staleTime: 30_000,
  })
  
  const processMutation = useMutation({
    mutationFn: ({reportId, action, adminMemo}: {
      reportId: number;
      action: ReportItem['status'];
      adminMemo?: string
    }) =>
      processAdminReport(reportId, {action, adminMemo}),
    onSuccess: () => void qc.invalidateQueries({queryKey: ['adminReports']}),
  })
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded animate-pulse" style={{background: 'var(--color-surface-raised)'}}/>
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="py-6 text-center">
        <AlertCircle size={20} className="mx-auto mb-1" style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>신고 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }
  
  const reports = page?.content ?? []
  if (reports.length === 0) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 size={24} className="mx-auto mb-2" style={{color: 'var(--color-success)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>처리 대기 중인 신고가 없습니다.</p>
      </div>
    )
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{borderCollapse: 'collapse'}}>
        <thead>
        <tr style={{borderBottom: '1px solid var(--color-border)'}}>
          {['대상', '사유', '접수일', '상태', '처리'].map((h) => (
            <th key={h} className="pb-2 text-left font-semibold pr-3 last:pr-0"
                style={{color: 'var(--color-text-hint)', fontSize: 11}}>
              {h}
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {reports.map((r) => {
          const meta = REPORT_STATUS_META[r.status]
          return (
            <tr key={r.reportId} style={{borderBottom: '1px solid var(--color-border)'}}>
              <td className="py-3 pr-3 whitespace-nowrap">
                <span className="px-1.5 py-0.5 rounded-[4px] text-[12px] font-medium"
                      style={{
                        background: r.targetType === 'POST' ? 'rgba(14,165,233,0.1)' : 'rgba(255,184,0,0.1)',
                        color: r.targetType === 'POST' ? 'var(--color-info)' : 'var(--color-gold)',
                      }}>
                  {r.targetType === 'POST' ? '판매글' : '커뮤니티'}
                </span>
              </td>
              <td className="py-3 pr-3 whitespace-nowrap" style={{color: 'var(--color-text-sub)'}}>
                {REPORT_REASON_LABEL[r.reason]}
              </td>
              <td className="py-3 pr-3 whitespace-nowrap"
                  style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 12}}>
                {r.createdAt.slice(5, 16)}
              </td>
              <td className="py-3 pr-3 whitespace-nowrap">
                <span className="px-2 py-0.5 rounded-full text-[13px] font-medium"
                      style={{background: meta.bg, color: meta.color}}>
                  {meta.label}
                </span>
              </td>
              <td className="py-3 whitespace-nowrap">
                {r.status === 'PENDING' ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const memo = window.prompt('경고 처리 메모를 입력하세요. 비워두면 메모 없이 처리됩니다.', '')
                        if (memo === null) return
                        
                        processMutation.mutate({
                          reportId: r.reportId,
                          action: 'WARNING',
                          adminMemo: memo.trim() || undefined,
                        })
                      }}
                      disabled={processMutation.isPending}
                      className="px-2 py-1 rounded text-[12px] font-bold disabled:opacity-50"
                      style={{background: 'rgba(255,149,0,.15)', color: 'var(--color-warning)'}}>
                      경고
                    </button>
                    <button
                      onClick={() => {
                        const memo = window.prompt('삭제 처리 메모를 입력하세요. 비워두면 메모 없이 처리됩니다.', '')
                        if (memo === null) return
                        
                        processMutation.mutate({
                          reportId: r.reportId,
                          action: 'DELETED',
                          adminMemo: memo.trim() || undefined,
                        })
                      }}
                      disabled={processMutation.isPending}
                      className="px-2 py-1 rounded text-[12px] font-bold disabled:opacity-50"
                      style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}>
                      삭제
                    </button>
                    <Link to={`/admin/reports/${r.reportId}`}
                          className="px-2 py-1 rounded text-[12px] font-medium transition-colors
                            text-[var(--color-text-hint)] hover:text-[var(--color-accent)]">
                      상세
                    </Link>
                  </div>
                ) : (
                  <Link to={`/admin/reports/${r.reportId}`}
                        className="text-[13px] font-medium transition-colors
                          text-[var(--color-text-hint)] hover:text-[var(--color-accent)]">
                    보기 &rsaquo;
                  </Link>
                )}
              </td>
            </tr>
          )
        })}
        </tbody>
      </table>
    </div>
  )
}

/** 최근 가입 회원 섹션 — 실제 AdminController 연동 */
function RecentMembersSection() {
  const {data: page, isLoading, isError} = useQuery({
    queryKey: ['adminMembers', 'recent'],
    queryFn: () => getAdminMembers({page: 0, size: 5}),
    staleTime: 30_000,
  })
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse"
               style={{background: 'var(--color-surface-raised)'}}/>
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="py-6 text-center">
        <AlertCircle size={20} className="mx-auto mb-1" style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>회원 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }
  
  const members: AdminMemberListItem[] = page?.content ?? []
  
  return (
    <div className="flex flex-col gap-3">
      {members.map((m) => {
        const statusMeta = MEMBER_STATUS_META[m.status]
        return (
          <div key={m.memberId} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white"
              style={{
                background: m.status === 'SUSPENDED' ? 'var(--color-accent)' : 'var(--color-primary)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              }}>
              {m.nickname.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-medium truncate" style={{color: 'var(--color-text-main)'}}>
                  {m.nickname}
                </p>
                <span className="text-[12px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{background: `${statusMeta.color}18`, color: statusMeta.color}}>
                  {statusMeta.label}
                </span>
                {m.warningCount > 0 && (
                  <span className="text-[12px] font-medium flex-shrink-0"
                        style={{color: 'var(--color-warning)'}}>
                    ! {m.warningCount}
                  </span>
                )}
              </div>
              <p className="text-[13px] truncate" style={{color: 'var(--color-text-hint)'}}>{m.email}</p>
            </div>
            <Link to={`/admin/members/${m.memberId}`}
                  className="flex-shrink-0 text-[13px] font-medium transition-colors
                    text-[var(--color-text-hint)] hover:text-[var(--color-accent)]">
              상세
            </Link>
          </div>
        )
      })}
    </div>
  )
}

/** 최근 거래 요약 섹션 — 관리자 대시보드 집계 API 연동 */
function RecentTradesSection({
                               summary,
                               isLoading,
                               isError,
                             }: {
  summary?: AdminDashboardSummary
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-12 rounded animate-pulse"
            style={{background: 'var(--color-surface-raised)'}}
          />
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="py-6 text-center">
        <AlertCircle size={20} className="mx-auto mb-1" style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>최근 거래 요약을 불러오지 못했습니다.</p>
      </div>
    )
  }
  
  const recentTrades = summary?.recentTrades ?? []
  if (recentTrades.length === 0) {
    return (
      <div
        className="rounded-[10px] px-4 py-5 text-[13px] leading-relaxed"
        style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
      >
        오늘 집계된 거래가 없습니다.
      </div>
    )
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{borderCollapse: 'collapse'}}>
        <thead>
        <tr style={{borderBottom: '1px solid var(--color-border)'}}>
          {['상품명', '구매자', '판매자', '금액', '상태'].map((header) => (
            <th
              key={header}
              className="pb-2 text-left font-semibold pr-3 last:pr-0"
              style={{color: 'var(--color-text-hint)', fontSize: 11}}
            >
              {header}
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {recentTrades.map((trade) => (
          <tr key={trade.tradeId} style={{borderBottom: '1px solid var(--color-border)'}}>
            <td className="py-3 pr-3 whitespace-nowrap">
              <Link
                to={`/trade/${trade.tradeId}`}
                className="font-medium transition-colors hover:text-[var(--color-accent)]"
                style={{color: 'var(--color-text-main)'}}
              >
                {trade.postTitle}
              </Link>
            </td>
            <td className="py-3 pr-3 whitespace-nowrap" style={{color: 'var(--color-text-sub)'}}>
              {trade.buyerNickname}
            </td>
            <td className="py-3 pr-3 whitespace-nowrap" style={{color: 'var(--color-text-sub)'}}>
              {trade.sellerNickname}
            </td>
            <td
              className="py-3 pr-3 whitespace-nowrap"
              style={{color: 'var(--color-primary)'}}
            >
              {formatPrice(trade.price)}
            </td>
            <td className="py-3 whitespace-nowrap">
              <span
                className="px-2 py-0.5 rounded-full text-[13px] font-medium"
                style={{
                  background: trade.status === 'COMPLETED'
                    ? 'rgba(0,179,110,0.1)'
                    : trade.status === 'DISPUTED'
                      ? 'rgba(255,149,0,0.1)'
                      : trade.status === 'CANCELED'
                        ? 'rgba(255,46,77,0.1)'
                        : 'var(--color-surface-sunken)',
                  color: trade.status === 'COMPLETED'
                    ? 'var(--color-success)'
                    : trade.status === 'DISPUTED'
                      ? 'var(--color-warning)'
                      : trade.status === 'CANCELED'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-sub)',
                }}
              >
                {TRADE_STATUS_LABEL[trade.status]}
              </span>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}

/** 출금 요청 관리 섹션 — 실제 AdminController 연동 */
export function WithdrawManagementSection() {
  const qc = useQueryClient()
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({})
  const [rejectOpen, setRejectOpen] = useState<number | null>(null)
  
  const {data: list, isLoading, isError} = useQuery({
    queryKey: ['adminWithdraws'],
    queryFn: getAdminWithdrawList,
    staleTime: 15_000,
    refetchInterval: 30_000,  // 30초마다 자동 갱신
  })
  
  const approveMutation = useMutation({
    mutationFn: (withdrawId: number) =>
      processWithdraw(withdrawId, {action: 'APPROVE'}),
    onSuccess: () => void qc.invalidateQueries({queryKey: ['adminWithdraws']}),
  })
  
  const rejectMutation = useMutation({
    mutationFn: ({withdrawId, reason}: { withdrawId: number; reason: string }) =>
      processWithdraw(withdrawId, {action: 'REJECT', rejectReason: reason}),
    onSuccess: () => {
      setRejectOpen(null)
      void qc.invalidateQueries({queryKey: ['adminWithdraws']})
    },
  })
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{background: 'var(--color-surface)'}}/>
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <AlertCircle size={24} style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>출금 요청 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }
  
  const pending = (list ?? []).filter((i: AdminWithdrawItem) => i.status === 'PENDING')
  const processed = (list ?? []).filter((i: AdminWithdrawItem) => i.status !== 'PENDING')
  
  return (
    <div className="flex flex-col gap-5">
      {/* 대기 중 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Banknote size={16} color="var(--color-warning)"/>
          <h3 className="font-bold text-sm" style={{color: 'var(--color-text-main)'}}>
            출금 대기
            {pending.length > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{background: 'rgba(255,149,0,.15)', color: 'var(--color-warning)'}}>
                {pending.length}건
              </span>
            )}
          </h3>
        </div>
        
        {pending.length === 0 ? (
          <div className="py-8 text-center rounded-xl"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{color: 'var(--color-success)'}}/>
            <p className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>처리 대기 중인 출금 요청이
              없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((item: AdminWithdrawItem) => (
              <div key={item.withdrawId}
                   className="rounded-xl p-4"
                   style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold"
                       style={{color: 'var(--color-text-main)'}}>
                      {formatPrice(item.requestAmount)}
                    </p>
                    <p className="text-xs mt-0.5" style={{color: 'var(--color-text-sub)'}}>
                      {item.bankName} {item.accountNumber}
                    </p>
                    <p className="text-[13px] mt-1" style={{color: 'var(--color-text-hint)'}}>
                      {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* 승인 */}
                    <button
                      onClick={() => approveMutation.mutate(item.withdrawId)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{background: 'var(--color-success)'}}
                    >
                      승인
                    </button>
                    {/* 반려 */}
                    <button
                      onClick={() => setRejectOpen(item.withdrawId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
                    >
                      반려
                    </button>
                  </div>
                </div>
                
                {/* 반려 사유 입력 */}
                {rejectOpen === item.withdrawId && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={rejectReason[item.withdrawId] ?? ''}
                      onChange={e => setRejectReason(prev => ({...prev, [item.withdrawId]: e.target.value}))}
                      placeholder="반려 사유 입력 (최대 300자)"
                      maxLength={300}
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-raised)',
                        color: 'var(--color-text-main)'
                      }}
                    />
                    <button
                      onClick={() => rejectMutation.mutate({
                        withdrawId: item.withdrawId,
                        reason: rejectReason[item.withdrawId] ?? '',
                      })}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{background: 'var(--color-accent)'}}
                    >
                      확인
                    </button>
                    <button
                      onClick={() => setRejectOpen(null)}
                      className="px-3 py-2 rounded-lg text-xs"
                      style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-hint)'}}
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 처리 완료 */}
      {processed.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>처리 완료</h3>
          <div className="flex flex-col gap-2">
            {processed.map((item: AdminWithdrawItem) => (
              <div key={item.withdrawId}
                   className="flex items-center justify-between px-4 py-3 rounded-xl"
                   style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                <div>
                  <p className="text-sm font-semibold"
                     style={{color: 'var(--color-text-main)'}}>
                    {formatPrice(item.requestAmount)}
                  </p>
                  <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                    {item.bankName} {item.accountNumber}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{
                        background: item.status === 'APPROVED' ? 'rgba(0,179,110,.1)' : 'rgba(255,46,77,.1)',
                        color: item.status === 'APPROVED' ? 'var(--color-success)' : 'var(--color-accent)',
                      }}>
                  {item.status === 'APPROVED' ? '승인' : '반려'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 위험 탐지 스냅샷 섹션 — 실제 AdminRiskController 연동 */
function RiskSnapshotSection() {
  /**
   * 게시글/채팅 위험 탐지는 각각 별도 엔드포인트를 사용한다.
   * 대시보드에서는 최근 HIGH 3건만 보여주고, 채팅은 messageId 기준이라
   * 현재는 직접 이동 링크 대신 탐지 사유와 제안만 빠르게 확인하게 한다.
   */
  const {data: postRiskPage, isLoading: isPostRiskLoading, isError: isPostRiskError} = useQuery({
    queryKey: ['adminRisk', 'posts', 'dashboard'],
    queryFn: () => getAdminPostRisks({riskLevel: 'HIGH', page: 0, size: 3}),
    staleTime: 30_000,
  })
  const {data: chatRiskPage, isLoading: isChatRiskLoading, isError: isChatRiskError} = useQuery({
    queryKey: ['adminRisk', 'chat', 'dashboard'],
    queryFn: () => getAdminChatRisks({riskLevel: 'HIGH', page: 0, size: 3}),
    staleTime: 30_000,
  })
  
  if (isPostRiskLoading || isChatRiskLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-14 rounded-xl animate-pulse"
            style={{background: 'var(--color-surface-raised)'}}
          />
        ))}
      </div>
    )
  }
  
  if (isPostRiskError && isChatRiskError) {
    return (
      <div className="py-6 text-center">
        <AlertCircle size={20} className="mx-auto mb-1" style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>위험 탐지 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }
  
  const riskyPosts = postRiskPage?.content ?? []
  const riskyChats = chatRiskPage?.content ?? []
  
  return (
    <div className="flex flex-col gap-4">
      <RiskBucket
        title="위험 게시글"
        emptyMessage="탐지된 HIGH 위험 게시글이 없습니다."
        items={riskyPosts}
        renderAction={(item) => (
          <Link
            to={`/listing/${item.targetId}`}
            className="text-[12px] font-medium transition-colors"
            style={{color: 'var(--color-text-hint)'}}
          >
            원문 보기
          </Link>
        )}
      />
      
      <RiskBucket
        title="위험 채팅"
        emptyMessage="탐지된 HIGH 위험 채팅이 없습니다."
        items={riskyChats}
        renderAction={() => (
          <span className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
            상세 연결 대기
          </span>
        )}
      />
    </div>
  )
}

function RiskBucket({
                      title,
                      items,
                      emptyMessage,
                      renderAction,
                    }: {
  title: string
  items: AdminRiskItem[]
  emptyMessage: string
  renderAction: (item: AdminRiskItem) => ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} style={{color: 'var(--color-warning)'}} strokeWidth={1.75}/>
        <p className="text-[13px] font-semibold" style={{color: 'var(--color-text-main)'}}>
          {title}
        </p>
      </div>
      
      {items.length === 0 ? (
        <div
          className="rounded-[10px] px-3 py-3 text-[13px]"
          style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const levelMeta = item.riskLevel ? RISK_LEVEL_META[item.riskLevel] : null
            return (
              <div
                key={`${item.targetType}-${item.riskId}-${item.targetId}`}
                className="rounded-[10px] px-3 py-3"
                style={{background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)'}}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-[12px] font-bold"
                        style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-text-main)'}}
                      >
                        #{item.targetId}
                      </span>
                      {levelMeta && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{background: levelMeta.bg, color: levelMeta.color}}
                        >
                          {levelMeta.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                      {item.reason ?? '감지 사유가 제공되지 않았습니다.'}
                    </p>
                    {item.suggestion && (
                      <p className="text-[12px] mt-1 leading-relaxed" style={{color: 'var(--color-text-hint)'}}>
                        제안: {item.suggestion}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {renderAction(item)}
                    <p className="text-[11px] mt-1" style={{color: 'var(--color-text-hint)'}}>
                      {item.createdAt.slice(5, 16).replace('T', ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
