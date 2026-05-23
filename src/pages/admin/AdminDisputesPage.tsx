/**
 * AdminDisputesPage — 관리자 분쟁 목록 (/admin/disputes)
 *
 * 기능:
 *   - 구매확정 전 구매자 이의 제기 목록 조회
 *   - 분쟁 상태별 처리 결과 확인
 *   - 분쟁 상세 페이지 링크 (/admin/disputes/:id)
 *
 * 데이터:
 *   - GET /api/admin/disputes
 */
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {AlertCircle, ChevronLeft, ChevronRight, Loader2, MessageSquareWarning} from 'lucide-react'
import type {TradeStatus} from '../../features/admin/api/adminApi'
import {getAdminDisputes} from '../../features/admin/api/adminApi'

const DISPUTE_STATUS_OPTIONS: Array<{ value: '' | TradeStatus; label: string }> = [
  {value: '', label: '전체'},
  {value: 'DISPUTED', label: '이의 제기 진행 중'},
  {value: 'CONFIRMED', label: '구매 확정 처리'},
  {value: 'CANCELED', label: '환불 처리'},
]

const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  REQUESTED: '요청',
  ACCEPTED: '수락',
  PAID: '결제 완료',
  IN_PROGRESS: '진행 중',
  RECEIVED: '수령 완료',
  CONFIRMED: '확정',
  COMPLETED: '거래 완료',
  CANCELED: '환불 처리',
  DISPUTED: '분쟁',
}

const DELIVERY_TYPE_LABEL = {
  DIRECT: '직거래',
  DELIVERY: '택배',
} as const

const PAGE_SIZE = 20

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState<TradeStatus | ''>('DISPUTED')
  const [page, setPage] = useState(0)

  const {data, isLoading, isError} = useQuery({
    queryKey: ['admin-disputes', statusFilter, page],
    queryFn: () => getAdminDisputes({
      status: statusFilter || undefined,
      page,
      size: PAGE_SIZE,
    }),
    staleTime: 30_000,
  })

  const disputes = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="p-6 md:p-8" style={{color: 'var(--color-text-main)'}}>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(255,149,0,0.12)', color: 'var(--color-warning)'}}
        >
          <MessageSquareWarning size={18}/>
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            분쟁 처리
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            구매확정 전 이의 제기 건 검토 및 처리 결과 확인
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as TradeStatus | '')
            setPage(0)
          }}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
          }}
        >
          {DISPUTE_STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{border: '1px solid var(--color-border)'}}
      >
        <div
          className="grid text-xs font-semibold px-4 py-3"
          style={{
            gridTemplateColumns: '88px 1.4fr 120px 100px 100px 120px 120px',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text-hint)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span>거래 ID</span>
          <span>상품명</span>
          <span>구매자</span>
          <span>판매자</span>
          <span>거래 방식</span>
          <span>상태</span>
          <span>거래일</span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{color: 'var(--color-warning)'}}/>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <AlertCircle size={24} style={{color: 'var(--color-error)'}}/>
            <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>
              분쟁 목록을 불러오지 못했습니다.
            </p>
          </div>
        )}

        {!isLoading && !isError && disputes.length === 0 && (
          <div className="py-16 text-center text-sm" style={{color: 'var(--color-text-hint)'}}>
            조건에 맞는 분쟁이 없습니다.
          </div>
        )}

        {!isLoading && !isError && disputes.map((dispute) => (
          <Link
            key={dispute.tradeId}
            to={`/admin/disputes/${dispute.tradeId}`}
            className="grid items-center px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--color-surface-raised)]"
            style={{
              gridTemplateColumns: '88px 1.4fr 120px 100px 100px 120px 120px',
              borderBottom: '1px solid var(--color-border)',
              color: 'var(--color-text-main)',
            }}
          >
            <span
              className="text-xs"
              style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            >
              #{dispute.tradeId}
            </span>
            <span className="font-semibold truncate pr-3">{dispute.postTitle}</span>
            <span className="truncate pr-3" style={{color: 'var(--color-text-sub)'}}>
              {dispute.buyerNickname}
            </span>
            <span className="truncate pr-3" style={{color: 'var(--color-text-sub)'}}>
              {dispute.sellerNickname}
            </span>
            <span className="text-xs" style={{color: 'var(--color-text-sub)'}}>
              {DELIVERY_TYPE_LABEL[dispute.deliveryType]}
            </span>
            <span>
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  color: dispute.status === 'DISPUTED'
                    ? 'var(--color-warning)'
                    : dispute.status === 'CANCELED'
                      ? 'var(--color-accent)'
                      : 'var(--color-success)',
                  background: dispute.status === 'DISPUTED'
                    ? 'rgba(255,149,0,0.1)'
                    : dispute.status === 'CANCELED'
                      ? 'rgba(255,46,77,0.1)'
                      : 'rgba(0,179,110,0.1)',
                }}
              >
                {TRADE_STATUS_LABEL[dispute.status]}
              </span>
            </span>
            <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
              {dispute.createdAt.slice(0, 10)}
            </span>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronLeft size={15}/>
          </button>
          <span className="text-sm px-2" style={{color: 'var(--color-text-sub)'}}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((currentPage) => Math.min(totalPages - 1, currentPage + 1))}
            disabled={page >= totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronRight size={15}/>
          </button>
        </div>
      )}
    </div>
  )
}
