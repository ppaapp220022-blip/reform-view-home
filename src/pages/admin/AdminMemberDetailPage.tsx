/**
 * AdminMemberDetailPage — 관리자 회원 관리 상세 (Screen 16)
 *
 * 구성:
 *   MemberProfile   — 기본 정보 (닉네임·이메일·상태·가입일·경고횟수)
 *   ActionPanel     — 경고·정지·정지 해제·강제 탈퇴 버튼 + 확인 모달
 *   TradeHistory    — 해당 회원의 거래 내역
 *   ReportHistory   — 해당 회원이 받은 신고 내역
 *
 * 데이터:
 *   - 회원 기본 정보, 마지막 로그인, 최근 거래, 받은 신고를 관리자 회원 상세 API로 조회한다.
 *   - 최신 관리자 회원 액션은 WARN / SUSPEND / UNSUSPEND / WITHDRAW를 지원한다.
 */
import {useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserX,
} from 'lucide-react'
import type {AdminMemberDetail, ReportItem} from '../../features/admin/api/adminApi'
import {getAdminMember, processAdminMember} from '../../features/admin/api/adminApi'

// ── 타입 ─────────────────────────────────────────────────────────────────────
// AdminMemberDetail, ReportItem 은 adminApi.ts에서 import
type MemberStatus = AdminMemberDetail['status']
type MemberTradeStatus = AdminMemberDetail['recentTrades'][number]['status']

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<MemberStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: {label: '활성', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  SUSPENDED: {label: '정지', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
  WITHDRAWN: {label: '탈퇴', color: 'var(--color-text-hint)', bg: 'var(--color-surface-sunken)'},
}

const REPORT_REASON_LABEL: Record<string, string> = {
  FAKE: '허위 매물',
  INAPPROPRIATE: '부적절 게시글',
  FRAUD: '사기 의심',
  ETC: '기타',
}

const REPORT_STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: {label: '미처리', color: 'var(--color-warning)'},
  WARNING: {label: '경고', color: 'var(--color-accent)'},
  NORMAL: {label: '정상', color: 'var(--color-success)'},
  DELETED: {label: '삭제됨', color: 'var(--color-text-hint)'},
}

// ── 액션 확인 모달 ────────────────────────────────────────────────────────────

type AdminAction = 'warn' | 'suspend' | 'unsuspend' | 'withdraw'

const ACTION_CONFIG: Record<AdminAction, {
  label: string; confirmLabel: string; color: string; desc: string
}> = {
  warn: {
    label: '경고',
    confirmLabel: '경고 조치',
    color: 'var(--color-warning)',
    desc: '회원에게 경고 1회를 부여합니다. 누적 3회 시 자동 정지됩니다.'
  },
  suspend: {label: '정지', confirmLabel: '계정 정지', color: 'var(--color-accent)', desc: '계정을 즉시 정지합니다. 로그인 및 거래가 차단됩니다.'},
  unsuspend: {
    label: '정지 해제',
    confirmLabel: '정지 해제 실행',
    color: 'var(--color-info)',
    desc: '정지 상태를 해제하고 계정을 다시 활성 상태로 되돌립니다.'
  },
  withdraw: {
    label: '강제 탈퇴',
    confirmLabel: '강제 탈퇴 실행',
    color: 'var(--color-accent)',
    desc: '회원을 강제 탈퇴 처리합니다. 이 작업은 되돌릴 수 없습니다.'
  },
}

const TRADE_STATUS_LABEL: Record<MemberTradeStatus, string> = {
  REQUESTED: '요청',
  ACCEPTED: '수락',
  PAID: '결제 완료',
  IN_PROGRESS: '진행 중',
  RECEIVED: '수령 완료',
  CONFIRMED: '구매 확정',
  COMPLETED: '거래 완료',
  CANCELED: '취소',
  DISPUTED: '분쟁',
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '정보 없음'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR')
}

function ActionModal({
                       action, onConfirm, onCancel,
                     }: { action: AdminAction; onConfirm: () => void; onCancel: () => void }) {
  const cfg = ACTION_CONFIG[action]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0"
        style={{background: 'rgba(0,0,0,0.55)'}}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[360px] rounded-2xl p-6 shadow-card animate-scaleIn"
        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
      >
        <h3 className="text-[16px] font-bold mb-2 text-center" style={{color: 'var(--color-text-main)'}}>
          {cfg.label} 조치
        </h3>
        <p className="text-[14px] text-center mb-6 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
          {cfg.desc}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[44px] rounded-[10px] text-[14px] font-semibold transition-colors
              bg-[var(--color-surface-raised)] text-[var(--color-text-main)]
              border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-[44px] rounded-[10px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{background: cfg.color}}
          >
            {cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AdminMemberDetailPage() {
  const {id} = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [pendingAction, setPendingAction] = useState<AdminAction | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionDone, setActionDone] = useState<string | null>(null)
  
  // 회원 상세 조회
  const {data: member, isLoading, isError} = useQuery({
    queryKey: ['adminMember', id],
    queryFn: () => getAdminMember(Number(id)),
    enabled: !!id,
  })
  
  // 회원 제재 처리
  const actionMutation = useMutation({
    mutationFn: (action: AdminAction) => {
      const apiAction = action === 'warn'
        ? 'WARN'
        : action === 'suspend'
          ? 'SUSPEND'
          : action === 'unsuspend'
            ? 'UNSUSPEND'
          : 'WITHDRAW'
      return processAdminMember(Number(id), {
        action: apiAction,
        reason: actionReason.trim() || undefined,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: ['adminMember', id]})
      void qc.invalidateQueries({queryKey: ['adminMembers']})
    },
  })
  
  /* 로딩 */
  if (isLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
          <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>회원 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  /* 에러 / 404 */
  if (isError || !member) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={32} style={{color: 'var(--color-error)'}}/>
          <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>회원 정보를 찾을 수 없습니다</p>
          <Link to="/admin" className="text-sm" style={{color: 'var(--color-accent)'}}>관리자 대시보드로</Link>
        </div>
      </div>
    )
  }
  
  const statusMeta = STATUS_META[member.status]
  
  function handleAction(action: AdminAction) {
    setPendingAction(action)
  }
  
  function confirmAction() {
    if (!pendingAction) return
    const label = ACTION_CONFIG[pendingAction].confirmLabel
    /* 실제 API 호출 — actionMutation으로 PATCH /admin/members/:id/action */
    actionMutation.mutate(pendingAction, {
      onSuccess: () => {
        setActionDone(label)
        setActionReason('')
        setPendingAction(null)
        setTimeout(() => setActionDone(null), 2500)
      },
    })
  }
  
  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors
            bg-[var(--color-surface-raised)] border border-[var(--color-border)]
            hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeft size={18} style={{color: 'var(--color-text-sub)'}} strokeWidth={2}/>
        </Link>
        <div>
          <h1 className="text-[20px] font-bold" style={{color: 'var(--color-text-main)'}}>
            회원 상세 관리
          </h1>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            ID #{member.memberId}
          </p>
        </div>
      </div>
      
      {/* ── 액션 완료 토스트 ── */}
      {actionDone && (
        <div
          className="mb-4 px-4 py-3 rounded-[10px] flex items-center gap-2 animate-fadeInUp"
          style={{background: 'rgba(0,179,110,0.1)', border: '1px solid rgba(0,179,110,0.35)'}}
        >
          <ShieldCheck size={15} style={{color: 'var(--color-success)'}} strokeWidth={1.75}/>
          <p className="text-[14px] font-medium" style={{color: 'var(--color-success)'}}>
            {actionDone} 처리가 완료되었습니다.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        
        {/* ── 왼쪽 ── */}
        <div className="flex flex-col gap-5">
          
          {/* 프로필 카드 */}
          <div
            className="rounded-[12px] p-6"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-start gap-4">
              {/* 아바타 */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[18px] font-bold text-white flex-shrink-0"
                style={{
                  background: member.status === 'SUSPENDED' ? 'var(--color-accent)' : 'var(--color-primary)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {member.nickname.slice(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-[18px] font-bold" style={{color: 'var(--color-text-main)'}}>
                    {member.nickname}
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[13px] font-medium"
                    style={{background: statusMeta.bg, color: statusMeta.color}}
                  >
                    {statusMeta.label}
                  </span>
                  {member.role === 'ADMIN' && (
                    <span className="px-2 py-0.5 rounded-full text-[13px] font-medium"
                          style={{background: 'rgba(14,165,233,0.1)', color: 'var(--color-info)'}}>
                      관리자
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Mail size={12} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.5}/>
                    <span className="text-[14px]" style={{color: 'var(--color-text-sub)'}}>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.5}/>
                    <span className="text-[14px]" style={{color: 'var(--color-text-sub)'}}>
                      가입일 {formatDateTime(member.createdAt)} · 마지막 로그인 {formatDateTime(member.lastLoginAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={12} style={{color: 'var(--color-gold)'}} strokeWidth={1.5}/>
                    <span className="text-[14px]"
                          style={{color: 'var(--color-text-sub)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                      매너 점수 {member.mannerScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 통계 행 */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5"
                 style={{borderTop: '1px solid var(--color-border)'}}>
              {[
                {label: '총 거래', value: member.totalSales + member.totalPurchases},
                {label: '판매', value: member.totalSales},
                {label: '구매', value: member.totalPurchases},
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[22px] font-bold leading-none mb-1"
                     style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                    {s.value}
                  </p>
                  <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>{s.label}</p>
                </div>
              ))}
            </div>
            
            {/* 경고 횟수 바 */}
            <div className="mt-4 pt-4" style={{borderTop: '1px solid var(--color-border)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium" style={{color: 'var(--color-text-sub)'}}>
                  누적 경고 횟수
                </span>
                <span
                  className="text-[14px] font-bold"
                  style={{
                    color: member.warningCount >= 3 ? 'var(--color-accent)' : 'var(--color-text-main)',
                    fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                  }}
                >
                  {member.warningCount} / 3
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{background: 'var(--color-surface-sunken)'}}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (member.warningCount / 3) * 100)}%`,
                    background: member.warningCount >= 3
                      ? 'var(--color-accent)'
                      : member.warningCount >= 2
                        ? 'var(--color-warning)'
                        : 'var(--color-success)',
                  }}
                />
              </div>
              {member.warningCount >= 3 && (
                <p className="text-[13px] mt-1.5" style={{color: 'var(--color-accent)'}}>
                  경고 3회 누적 — 자동 정지 조건 충족
                </p>
              )}
            </div>
          </div>
          
          {/* 거래 내역 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                거래 내역
              </h3>
            </div>
            <div className="flex flex-col gap-0">
              {(member.recentTrades ?? []).length === 0 && (
                <div
                  className="rounded-[10px] px-4 py-4 text-[13px] leading-relaxed"
                  style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
                >
                  최근 거래 내역이 없습니다.
                </div>
              )}

              {(member.recentTrades ?? []).map((trade) => (
                <div
                  key={trade.tradeId}
                  className="flex items-start gap-3 py-3"
                  style={{borderBottom: '1px solid var(--color-border)'}}
                >
                  <span
                    className="mt-0.5 px-2 py-0.5 rounded-full text-[12px] font-medium flex-shrink-0"
                    style={{
                      background: trade.role === 'SELLER' ? 'rgba(0,33,71,0.08)' : 'rgba(14,165,233,0.1)',
                      color: trade.role === 'SELLER' ? 'var(--color-primary)' : 'var(--color-info)',
                    }}
                  >
                    {trade.role === 'SELLER' ? '판매' : '구매'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium" style={{color: 'var(--color-text-main)'}}>
                      {trade.postTitle}
                    </p>
                    <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                      완료 시각 {formatDateTime(trade.completedAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-[13px] font-bold"
                      style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                    >
                      ₩{trade.price.toLocaleString('ko-KR')}
                    </p>
                    <p className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
                      {TRADE_STATUS_LABEL[trade.status]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 신고 내역 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <Flag size={15} style={{color: 'var(--color-accent)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                받은 신고
              </h3>
            </div>
            <div className="flex flex-col gap-0">
              {(member.receivedReports ?? []).length === 0 && (
                <div
                  className="rounded-[10px] px-4 py-4 text-[13px]"
                  style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
                >
                  현재 이 회원에게 접수된 신고가 없습니다.
                </div>
              )}

              {(member.receivedReports ?? []).map((r: ReportItem) => {
                const st = REPORT_STATUS_META[r.status] ?? {label: r.status, color: 'var(--color-text-hint)'}
                return (
                  <div
                    key={r.reportId}
                    className="flex items-start gap-3 py-3"
                    style={{borderBottom: '1px solid var(--color-border)'}}
                  >
                    <span
                      className="mt-0.5 px-2 py-0.5 rounded-full text-[12px] font-medium flex-shrink-0"
                      style={{background: `${st.color}18`, color: st.color}}
                    >
                      {st.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium" style={{color: 'var(--color-text-main)'}}>
                        {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                      </p>
                      <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                        {r.detail}
                      </p>
                    </div>
                    <Link
                      to={`/admin/reports/${r.reportId}`}
                      className="flex-shrink-0 text-[13px] font-medium flex items-center gap-0.5 transition-colors
                        text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                    >
                      처리 <ChevronRight size={12} strokeWidth={2}/>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* ── 오른쪽: 액션 패널 ── */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-[12px] p-5 sticky top-24"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              관리자 조치
            </p>

            <div className="mb-4">
              <label className="block text-[13px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                조치 사유
              </label>
              <textarea
                rows={4}
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                placeholder="경고, 정지, 정지 해제, 강제 탈퇴 사유를 기록하세요."
                className="w-full rounded-[8px] px-3 py-2.5 text-[13px] resize-none outline-none transition-colors bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)] focus:border-[var(--color-primary)]"
              />
            </div>
             
            <div className="flex flex-col gap-2.5">
              {/* 경고 */}
              <button
                type="button"
                onClick={() => handleAction('warn')}
                disabled={member.status === 'WITHDRAWN'}
                className="w-full h-[44px] rounded-[10px] flex items-center gap-2.5 px-4 text-[14px] font-semibold
                  transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,149,0,0.08)',
                  borderColor: 'rgba(255,149,0,0.35)',
                  color: 'var(--color-warning)',
                }}
              >
                <AlertTriangle size={15} strokeWidth={1.75}/>
                경고 부여
                <span className="ml-auto text-[13px] opacity-70">
                  현재 {member.warningCount}회
                </span>
              </button>
              
              {/* 정지 */}
              <button
                type="button"
                onClick={() => handleAction('suspend')}
                disabled={member.status !== 'ACTIVE'}
                className="w-full h-[44px] rounded-[10px] flex items-center gap-2.5 px-4 text-[14px] font-semibold
                  transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,46,77,0.08)',
                  borderColor: 'rgba(255,46,77,0.35)',
                  color: 'var(--color-accent)',
                }}
              >
                <Ban size={15} strokeWidth={1.75}/>
                계정 정지
              </button>

              <button
                type="button"
                onClick={() => handleAction('unsuspend')}
                disabled={member.status !== 'SUSPENDED'}
                className="w-full h-[44px] rounded-[10px] flex items-center gap-2.5 px-4 text-[14px] font-semibold
                  transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(14,165,233,0.08)',
                  borderColor: 'rgba(14,165,233,0.35)',
                  color: 'var(--color-info)',
                }}
              >
                <ShieldCheck size={15} strokeWidth={1.75}/>
                정지 해제
              </button>
              
              {/* 강제 탈퇴 */}
              <div className="pt-2" style={{borderTop: '1px solid var(--color-border)'}}>
                <button
                  type="button"
                  onClick={() => handleAction('withdraw')}
                  disabled={member.status === 'WITHDRAWN'}
                  className="w-full h-[44px] rounded-[10px] flex items-center gap-2.5 px-4 text-[14px] font-semibold
                    transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--color-surface-sunken)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-hint)',
                  }}
                >
                  <UserX size={15} strokeWidth={1.75}/>
                  강제 탈퇴
                </button>
                <p className="text-[12px] mt-1.5 text-center" style={{color: 'var(--color-text-hint)'}}>
                  이 작업은 되돌릴 수 없습니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ── 액션 확인 모달 ── */}
      {pendingAction && (
        <ActionModal
          action={pendingAction}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}
