/**
 * AdminWithdrawalsPage — 관리자 출금 요청 목록 (/admin/withdrawals)
 *
 * 기능:
 *   - PENDING 출금 요청 목록 조회
 *   - 인라인 승인(APPROVE) / 반려(REJECT + 사유 입력)
 *   - 상태별 배지 표시
 */
import {useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Check, Loader2, Wallet, X} from 'lucide-react'
import type {WithdrawStatus} from '../../features/admin/api/adminApi'
import {getAdminWithdrawList, processWithdraw} from '../../features/admin/api/adminApi'
import {formatPrice} from '../../utils/format'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<WithdrawStatus, string> = {
  PENDING: '대기중',
  APPROVED: '승인',
  REJECTED: '반려',
}

const STATUS_COLORS: Record<WithdrawStatus, { color: string; bg: string }> = {
  PENDING: {color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  APPROVED: {color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)'},
  REJECTED: {color: 'var(--color-accent)', bg: 'rgba(255,46,77,.1)'},
}

// ── 인라인 반려 모달 ─────────────────────────────────────────────────────────

function RejectModal({withdrawId, onClose}: { withdrawId: number; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const qc = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: () => processWithdraw(withdrawId, {action: 'REJECT', rejectReason: reason}),
    onSuccess: () => {
      qc.invalidateQueries({queryKey: ['admin-withdrawals']})
      onClose()
    },
  })
  
  return (
    /* 모달 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background: 'rgba(0,0,0,.5)'}}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
      >
        <h3
          className="text-base font-bold mb-4"
          style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          반려 사유 입력
        </h3>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="반려 사유를 입력하세요 (필수)"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-sub)',
              border: '1px solid var(--color-border)',
            }}
          >
            취소
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!reason.trim() || mutation.isPending}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{background: 'var(--color-accent)', color: '#fff'}}
          >
            {mutation.isPending ? '처리 중...' : '반려 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 출금 항목 행 ──────────────────────────────────────────────────────────────

function WithdrawRow({item}: {
  item: ReturnType<typeof getAdminWithdrawList> extends Promise<infer T> ? T extends (infer I)[] ? I : never : never
}) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const qc = useQueryClient()
  
  const approveMutation = useMutation({
    mutationFn: () => processWithdraw(item.withdrawId, {action: 'APPROVE'}),
    onSuccess: () => qc.invalidateQueries({queryKey: ['admin-withdrawals']}),
  })
  
  const sc = STATUS_COLORS[item.status]
  
  return (
    <>
      {rejectOpen && <RejectModal withdrawId={item.withdrawId} onClose={() => setRejectOpen(false)}/>}
      <div
        className="grid items-center px-4 py-3 text-sm"
        style={{
          gridTemplateColumns: '60px 1fr 1fr 120px 90px 120px',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-text-main)',
        }}
      >
        {/* ID */}
        <span
          className="text-xs"
          style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {item.withdrawId}
        </span>
        {/* 금액 */}
        <span
          className="font-bold"
          style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {formatPrice(item.requestAmount)}
        </span>
        {/* 계좌 */}
        <span className="text-xs truncate pr-2" style={{color: 'var(--color-text-sub)'}}>
          {item.bankName} {item.accountNumber}
        </span>
        {/* 신청일 */}
        <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
          {item.createdAt.slice(0, 10)}
        </span>
        {/* 상태 */}
        <span>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{color: sc.color, background: sc.bg}}
          >
            {STATUS_LABELS[item.status]}
          </span>
        </span>
        {/* 처리 버튼 — PENDING 상태만 */}
        <div className="flex gap-1">
          {item.status === 'PENDING' && (
            <>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                style={{background: 'rgba(0,179,110,.1)', color: 'var(--color-success)'}}
              >
                <Check size={11}/>
                승인
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
              >
                <X size={11}/>
                반려
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function AdminWithdrawalsPage() {
  const {data: items = [], isLoading} = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: getAdminWithdrawList,
    staleTime: 30_000,
  })
  
  const pending = items.filter(i => i.status === 'PENDING')
  const processed = items.filter(i => i.status !== 'PENDING')
  
  return (
    <div className="p-6 md:p-8" style={{color: 'var(--color-text-main)'}}>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(0,33,71,.1)', color: 'var(--color-primary)'}}
        >
          <Wallet size={18}/>
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            출금 요청
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            대기 중 {pending.length}건 처리 필요
          </p>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{color: 'var(--color-primary)'}}/>
        </div>
      )}
      
      {!isLoading && (
        <>
          {/* 대기 중 섹션 */}
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{border: '1px solid var(--color-border)'}}
          >
            <div
              className="px-4 py-2.5 text-xs font-bold flex items-center gap-2"
              style={{
                background: 'rgba(255,149,0,.08)',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-warning)',
              }}
            >
              <Wallet size={13}/>
              대기 중 ({pending.length}건)
            </div>
            {/* 테이블 헤더 */}
            <div
              className="grid text-xs font-semibold px-4 py-2.5"
              style={{
                gridTemplateColumns: '60px 1fr 1fr 120px 90px 120px',
                background: 'var(--color-surface-sunken)',
                color: 'var(--color-text-hint)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span>ID</span>
              <span>금액</span>
              <span>입금 계좌</span>
              <span>신청일</span>
              <span>상태</span>
              <span>처리</span>
            </div>
            {pending.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{color: 'var(--color-text-hint)'}}>
                처리 대기 중인 출금 요청이 없습니다.
              </div>
            ) : (
              pending.map(item => <WithdrawRow key={item.withdrawId} item={item}/>)
            )}
          </div>
          
          {/* 처리 완료 섹션 */}
          {processed.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{border: '1px solid var(--color-border)'}}
            >
              <div
                className="px-4 py-2.5 text-xs font-bold"
                style={{
                  background: 'var(--color-surface-sunken)',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-hint)',
                }}
              >
                처리 완료 ({processed.length}건)
              </div>
              {processed.map(item => <WithdrawRow key={item.withdrawId} item={item}/>)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
