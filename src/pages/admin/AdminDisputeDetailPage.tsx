/**
 * AdminDisputeDetailPage — 관리자 분쟁 처리 상세
 *
 * 유스케이스:
 *   - 구매자가 받은 물건을 구매확정하기 전에 판매자에게 이의를 제기한다.
 *   - 관리자는 분쟁 거래를 검토하고 구매 확정 또는 환불 중 하나로 처리한다.
 *
 * 기능:
 *   - 분쟁 상세 조회
 *   - 거래/배송/당사자 정보 확인
 *   - 구매자 이의 제기 내용 확인
 *   - 판매자 소명 확인 (응답 제공 시)
 *   - 관리자 메모와 함께 분쟁 처리 방향 검토
 *
 * 데이터:
 *   - GET /api/admin/disputes/{tradeId}
 *   - PATCH /api/admin/disputes/{tradeId}
 */
import {useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertOctagon,
  ChevronLeft,
  ExternalLink,
  FileWarning,
  Gavel,
  Loader2,
  Mail,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react'
import type {AdminDisputeAction, AdminDisputeActionRequest, TradeStatus} from '../../features/admin/api/adminApi'
import {getAdminDispute, processAdminDispute} from '../../features/admin/api/adminApi'
import {formatPrice} from '../../utils/format'

const TRADE_STATUS_META: Record<TradeStatus, { label: string; color: string; bg: string }> = {
  REQUESTED: {label: '요청', color: 'var(--color-text-sub)', bg: 'var(--color-surface-sunken)'},
  ACCEPTED: {label: '수락', color: 'var(--color-info)', bg: 'rgba(14,165,233,0.1)'},
  PAID: {label: '결제 완료', color: 'var(--color-primary)', bg: 'rgba(0,33,71,0.08)'},
  IN_PROGRESS: {label: '진행 중', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  RECEIVED: {label: '수령 완료', color: 'var(--color-info)', bg: 'rgba(14,165,233,0.1)'},
  CONFIRMED: {label: '구매 확정', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  COMPLETED: {label: '거래 완료', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  CANCELED: {label: '환불 처리', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
  DISPUTED: {label: '이의 제기', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
}

const DELIVERY_TYPE_LABEL = {
  DIRECT: '직거래',
  DELIVERY: '택배',
} as const

const DISPUTE_ACTION_OPTIONS: Array<{
  action: AdminDisputeAction
  label: string
  description: string
  color: string
}> = [
  {
    action: 'CANCELED',
    label: '환불 처리',
    description: '구매자 이의를 받아들여 거래를 취소하고 환불 처리합니다.',
    color: 'var(--color-accent)',
  },
  {
    action: 'CONFIRMED',
    label: '구매 확정 처리',
    description: '판매자 측이 정상 이행한 것으로 보고 구매 확정으로 분쟁을 마감합니다.',
    color: 'var(--color-success)',
  },
]

const RESOLUTION_TYPE_LABEL: Record<string, string> = {
  CONFIRMED: '구매 확정 처리',
  CANCELED: '환불 처리',
  COMPLETED: '거래 완료',
  EXTENDED: '기한 연장',
  REJECTED: '반려',
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '정보 없음'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR')
}

function InfoRow({label, value}: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
        {label}
      </span>
      <span className="text-[13px] text-right" style={{color: 'var(--color-text-sub)'}}>
        {value}
      </span>
    </div>
  )
}

function PartyCard({
  title,
  nickname,
  email,
  memberId,
}: {
  title: string
  nickname: string
  email: string
  memberId: number
}) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
          style={{background: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
            {nickname}
          </p>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            {title}
          </p>
        </div>
        <Link
          to={`/admin/members/${memberId}`}
          className="text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-hint)'}}
        >
          회원 상세
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Mail size={13} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.75}/>
        <span className="text-[13px]" style={{color: 'var(--color-text-sub)'}}>
          {email}
        </span>
      </div>
    </div>
  )
}

export default function AdminDisputeDetailPage() {
  const {id} = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedAction, setSelectedAction] = useState<AdminDisputeAction | null>(null)
  const [adminMemo, setAdminMemo] = useState('')
  const [submitDone, setSubmitDone] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {data: dispute, isLoading, isError} = useQuery({
    queryKey: ['adminDispute', id],
    queryFn: () => getAdminDispute(Number(id)),
    enabled: !!id,
  })

  const processMutation = useMutation({
    mutationFn: (request: AdminDisputeActionRequest) => processAdminDispute(Number(id), request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['adminDispute', id]}),
        queryClient.invalidateQueries({queryKey: ['admin-disputes']}),
        queryClient.invalidateQueries({queryKey: ['adminDashboard', 'summary']}),
      ])
    },
  })

  async function handleSubmit() {
    if (!selectedAction) return

    setSubmitError('')
    try {
      await processMutation.mutateAsync({
        action: selectedAction,
        adminMemo: adminMemo.trim() || undefined,
      })
      setSubmitDone(true)
    } catch (error) {
      console.error('분쟁 처리 실패', error)
      setSubmitError('분쟁 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-warning)'}}/>
          <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>분쟁 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (isError || !dispute) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={32} style={{color: 'var(--color-error)'}}/>
          <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>분쟁 정보를 찾을 수 없습니다</p>
          <Link to="/admin/disputes" className="text-sm" style={{color: 'var(--color-accent)'}}>분쟁 목록으로</Link>
        </div>
      </div>
    )
  }

  const selectedOption = DISPUTE_ACTION_OPTIONS.find((item) => item.action === selectedAction) ?? null
  const statusMeta = TRADE_STATUS_META[dispute.status]
  const isResolved = dispute.status !== 'DISPUTED'

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/disputes"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeft size={18} style={{color: 'var(--color-text-sub)'}} strokeWidth={2}/>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertOctagon size={18} style={{color: 'var(--color-warning)'}} strokeWidth={1.75}/>
            <h1 className="text-[20px] font-bold" style={{color: 'var(--color-text-main)'}}>
              거래 분쟁 처리
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[13px] font-medium"
              style={{background: statusMeta.bg, color: statusMeta.color}}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            거래 #{dispute.tradeId} · 이의 제기 {formatDateTime(dispute.disputedAt)}
          </p>
        </div>
      </div>

      {submitDone && (
        <div
          className="mb-5 px-4 py-3 rounded-[10px] flex items-center gap-2"
          style={{background: 'rgba(0,179,110,0.08)', border: '1px solid rgba(0,179,110,0.3)'}}
        >
          <ShieldCheck size={15} style={{color: 'var(--color-success)'}} strokeWidth={1.75}/>
          <p className="text-[14px] font-medium" style={{color: 'var(--color-success)'}}>
            분쟁 거래가 {selectedOption?.label ?? '처리 완료'} 상태로 반영되었습니다.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-5">
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Package size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
                  <h2 className="text-[16px] font-bold" style={{color: 'var(--color-text-main)'}}>
                    {dispute.postTitle}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-[12px] font-semibold"
                    style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)'}}
                  >
                    {DELIVERY_TYPE_LABEL[dispute.deliveryType]}
                  </span>
                  <Link
                    to={`/listing/${dispute.postId}`}
                    className="flex items-center gap-1 text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
                    style={{color: 'var(--color-text-hint)'}}
                  >
                    상품 보기
                    <ExternalLink size={11} strokeWidth={1.75}/>
                  </Link>
                </div>
              </div>
              <p
                className="text-[22px] font-bold flex-shrink-0"
                style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                {formatPrice(dispute.price)}
              </p>
            </div>

            <div className="rounded-[10px] px-4 py-3" style={{background: 'var(--color-surface-sunken)'}}>
              <InfoRow label="거래 생성" value={formatDateTime(dispute.createdAt)}/>
              <InfoRow label="분쟁 접수" value={formatDateTime(dispute.disputedAt)}/>
              <InfoRow label="발송 시작" value={formatDateTime(dispute.shippingStartedAt)}/>
              <InfoRow label="구매 확정" value={formatDateTime(dispute.confirmedAt)}/>
              <InfoRow label="거래 완료" value={formatDateTime(dispute.completedAt)}/>
              <InfoRow
                label="최근 처리 결과"
                value={dispute.resolutionType ? (RESOLUTION_TYPE_LABEL[dispute.resolutionType] ?? dispute.resolutionType) : '정보 없음'}
              />
              <InfoRow label="연장 종료 시각" value={formatDateTime(dispute.extendedUntil)}/>
            </div>
          </div>

          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileWarning size={15} style={{color: 'var(--color-warning)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                구매자 분쟁 사유
              </h3>
            </div>
            <div
              className="rounded-[10px] px-4 py-4 text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)'}}
            >
              {dispute.buyerClaim?.trim() || '구매자 이의 내용이 제공되지 않았습니다.'}
            </div>
          </div>

          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <User size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                판매자 소명
              </h3>
            </div>
            <div
              className="rounded-[10px] px-4 py-4 text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)'}}
            >
              {dispute.sellerClaim?.trim() || '판매자가 등록한 소명 내용이 없습니다.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PartyCard
              title="구매자"
              nickname={dispute.buyerNickname}
              email={dispute.buyerEmail}
              memberId={dispute.buyerMemberId}
            />
            <PartyCard
              title="판매자"
              nickname={dispute.sellerNickname}
              email={dispute.sellerEmail}
              memberId={dispute.sellerMemberId}
            />
          </div>

          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <Truck size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                배송 정보
              </h3>
            </div>

            {dispute.deliveryType === 'DIRECT' ? (
              <div
                className="rounded-[10px] px-4 py-4 text-[13px]"
                style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
              >
                직거래 건입니다. 배송지와 송장 정보는 제공되지 않습니다.
              </div>
            ) : (
              <div className="rounded-[10px] px-4 py-3" style={{background: 'var(--color-surface-sunken)'}}>
                <div className="flex items-start gap-2 mb-2">
                  <MapPin size={14} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.75}/>
                  <p className="text-[13px]" style={{color: 'var(--color-text-sub)'}}>
                    {dispute.deliveryAddress ?? '배송지 정보 없음'}
                  </p>
                </div>
                <InfoRow label="택배사" value={dispute.courierName ?? '정보 없음'}/>
                <InfoRow label="택배사 코드" value={dispute.courierCode ?? '정보 없음'}/>
                <InfoRow label="송장 번호" value={dispute.trackingNumber ?? '정보 없음'}/>
              </div>
            )}
          </div>
        </div>

        <div>
          <div
            className="rounded-[12px] p-5 sticky top-24"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <Gavel size={16} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <p className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                관리자 처리
              </p>
            </div>

            <div
              className="mb-4 rounded-[10px] px-4 py-3"
              style={{background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)'}}
            >
              <p className="text-[13px] font-medium mb-1" style={{color: 'var(--color-text-sub)'}}>
                처리 기준
              </p>
              <p className="text-[13px] leading-relaxed" style={{color: 'var(--color-text-hint)'}}>
                관리자는 구매자 분쟁 사유와 판매자 소명을 비교한 뒤 구매 확정 또는 환불 중 하나로 처리합니다.
              </p>
            </div>

            {submitError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-[10px] text-[13px] leading-relaxed"
                style={{
                  background: 'rgba(255,46,77,0.08)',
                  border: '1px solid rgba(255,46,77,0.2)',
                  color: 'var(--color-accent)',
                }}
              >
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 mb-4">
              {DISPUTE_ACTION_OPTIONS.map((option) => {
                const isSelected = selectedAction === option.action
                return (
                  <button
                    key={option.action}
                    type="button"
                    onClick={() => setSelectedAction(option.action)}
                    disabled={isResolved || processMutation.isPending}
                    className="w-full text-left px-4 py-3 rounded-[10px] transition-colors border disabled:cursor-default disabled:opacity-60"
                    style={{
                      background: isSelected ? `${option.color}10` : 'var(--color-surface-raised)',
                      borderColor: isSelected ? option.color : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                        style={{borderColor: isSelected ? option.color : 'var(--color-border)'}}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{background: option.color}}/>
                        )}
                      </div>
                      <span
                        className="text-[14px] font-semibold"
                        style={{color: isSelected ? option.color : 'var(--color-text-main)'}}
                      >
                        {option.label}
                      </span>
                    </div>
                    <p className="text-[13px] pl-5" style={{color: 'var(--color-text-hint)'}}>
                      {option.description}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                관리자 메모
              </label>
              <textarea
                rows={4}
                value={adminMemo}
                onChange={(event) => setAdminMemo(event.target.value)}
                disabled={isResolved || processMutation.isPending}
                placeholder="처리 판단 근거를 남겨주세요."
                className="w-full rounded-[8px] px-3 py-2.5 text-[13px] resize-none outline-none transition-colors bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)] focus:border-[var(--color-primary)] disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedAction || isResolved || processMutation.isPending}
              className="w-full h-[48px] rounded-[10px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: selectedAction
                  ? DISPUTE_ACTION_OPTIONS.find((option) => option.action === selectedAction)?.color ?? 'var(--color-primary)'
                  : 'var(--color-primary)',
              }}
            >
              {processMutation.isPending ? '처리 중...' : (
                <>
                  <Gavel size={16} strokeWidth={1.75}/>
                  처리 확정
                </>
              )}
            </button>

            {!selectedAction && !isResolved && (
              <p className="text-[13px] text-center mt-2" style={{color: 'var(--color-text-hint)'}}>
                처리 방향을 먼저 선택해 주세요
              </p>
            )}

            <div className="mt-5 pt-4" style={{borderTop: '1px solid var(--color-border)'}}>
              <p className="text-[13px] font-medium mb-1" style={{color: 'var(--color-text-sub)'}}>
                최근 처리 기록
              </p>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{color: 'var(--color-text-hint)'}}>
                {dispute.adminMemo?.trim() || '저장된 처리 메모가 없습니다.'}
              </p>
              <p className="text-[12px] mt-2" style={{color: 'var(--color-text-hint)'}}>
                처리 결과: {dispute.resolutionType ? (RESOLUTION_TYPE_LABEL[dispute.resolutionType] ?? dispute.resolutionType) : '정보 없음'}
              </p>
              <p className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
                연장 종료: {formatDateTime(dispute.extendedUntil)}
              </p>
              <p className="text-[12px] mt-2" style={{color: 'var(--color-text-hint)'}}>
                처리 시각: {formatDateTime(dispute.processedAt)}
              </p>
              <p className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
                처리자: {dispute.processedBy ?? '정보 없음'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
