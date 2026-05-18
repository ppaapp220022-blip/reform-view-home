/**
 * TradeConfirmPage — 거래 관리 (구매자/판매자 공용)
 *
 * 거래 상태(TradeStatus)에 따라 구매자/판매자에게 다른 UI를 제공한다.
 *
 * 상태별 액션:
 *   REQUESTED  → 구매자: 대기 / 판매자: 거래 수락(acceptTrade)
 *   ACCEPTED   → 구매자: 결제하기(/payment/:id) / 판매자: 대기
 *   PAID       → 구매자: 대기 / 판매자: 배송 정보 입력(startShipping)
 *   IN_PROGRESS → 구매자: 배송 추적 + 구매 확정 버튼 / 판매자: 배송 중
 *   RECEIVED   → 구매자: 구매 확정(confirmTrade) / 판매자: 대기
 *   CONFIRMED  → 구매자: 리뷰 작성 링크 / 판매자: 정산 대기
 *   COMPLETED  → 거래 완료
 *   CANCELED   → 취소됨
 */
import {useCallback, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from 'lucide-react'
import type {TradeResponse} from '../../features/trade/api/tradeApi'
import {acceptTrade, confirmTrade, getTrade, startShipping,} from '../../features/trade/api/tradeApi'
import type {Courier} from '../../features/delivery/api/deliveryApi'
import {getCouriers} from '../../features/delivery/api/deliveryApi'
import {formatPrice} from '../../utils/format'
import {resolveImageUrl} from '../../utils/image'
import useAuthStore from '../../store/authStore'
import type {TradeStatus} from '../../types/listing'

// ── 타임라인 스텝 정의 ─────────────────────────────────────────────────────────

interface TimelineStep {
  key: TradeStatus
  label: string
}

const TIMELINE_STEPS: TimelineStep[] = [
  {key: 'REQUESTED', label: '거래 요청'},
  {key: 'PAID', label: '결제 완료'},
  {key: 'IN_PROGRESS', label: '배송 중'},
  {key: 'RECEIVED', label: '수령 완료'},
  {key: 'CONFIRMED', label: '거래 확정'},
]

/** TradeStatus를 타임라인 단계 인덱스로 변환 */
function statusToStep(status: TradeStatus): number {
  const map: Partial<Record<TradeStatus, number>> = {
    REQUESTED: 0,
    ACCEPTED: 0,   // ACCEPTED는 REQUESTED 단계 유지 (결제 전)
    PAID: 1,
    IN_PROGRESS: 2,
    RECEIVED: 3,
    CONFIRMED: 4,
    COMPLETED: 4,
  }
  return map[status] ?? 0
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 거래 타임라인 */
function TradeTimeline({status}: { status: TradeStatus }) {
  const activeIdx = statusToStep(status)
  
  return (
    <div className="flex items-start gap-0">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < activeIdx
        const isCurrent = i === activeIdx
        
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0" style={{width: 56}}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background:
                    isDone ? 'var(--color-success)' :
                      isCurrent ? 'var(--color-primary)' :
                        'var(--color-surface-raised)',
                  color: isDone || isCurrent ? '#fff' : 'var(--color-text-hint)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(0,33,71,.15)' : 'none',
                }}
              >
                {isDone ? <CheckCircle2 size={18}/> : i === 1 ? <Package size={16}/> : i === 2 ?
                  <Truck size={16}/> : i === 3 ? <MapPin size={16}/> : i === 4 ? <ShieldCheck size={16}/> :
                    <Clock size={16}/>}
              </div>
              <span
                className="text-[11px] mt-1.5 text-center leading-tight"
                style={{
                  color: isCurrent ? 'var(--color-primary)' : isDone ? 'var(--color-success)' : 'var(--color-text-hint)',
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mb-5 transition-colors"
                style={{background: i < activeIdx ? 'var(--color-success)' : 'var(--color-border)'}}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** 거래 상품 카드 */
function TradeProductCard({trade}: { trade: TradeResponse }) {
  return (
    <div className="flex gap-4">
      <div
        className="relative rounded-xl overflow-hidden flex-shrink-0"
        style={{width: 72, height: 72, background: '#1A3051'}}
      >
        {resolveImageUrl(trade.post.thumbnailUrl) ? (
          <img
            src={resolveImageUrl(trade.post.thumbnailUrl)!}
            alt={trade.post.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <>
            <div className="absolute inset-0"
                 style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)'}}/>
            <span className="absolute inset-0 flex items-center justify-center" style={{
              fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 24, color: 'rgba(255,255,255,.2)'
            }}>{trade.post.postId % 99}</span>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-1"
           style={{color: 'var(--color-text-hint)'}}>{trade.buyer.nickname} → {trade.seller.nickname}</p>
        <p className="text-sm font-semibold leading-snug mb-1 line-clamp-2"
           style={{color: 'var(--color-text-main)'}}>{trade.post.title}</p>
        <p className="text-lg font-bold"
           style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
          {formatPrice(trade.tradePrice)}
        </p>
      </div>
    </div>
  )
}

/** 배송 정보 섹션 (택배 거래 + 배송 정보 있을 때) */
function ShippingInfo({trade}: { trade: TradeResponse }) {
  if (trade.deliveryType !== 'DELIVERY' || !trade.trackingNumber) return null
  
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-xl"
      style={{background: 'var(--color-surface-raised)'}}
    >
      <p className="text-xs font-semibold mb-1" style={{color: 'var(--color-text-hint)'}}>배송 정보</p>
      <div className="flex justify-between text-xs">
        <span style={{color: 'var(--color-text-hint)'}}>택배사</span>
        <span style={{color: 'var(--color-text-sub)'}}>{trade.courierCode ?? '-'}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span style={{color: 'var(--color-text-hint)'}}>운송장</span>
        <span style={{
          color: 'var(--color-primary)',
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
        }}>{trade.trackingNumber}</span>
      </div>
    </div>
  )
}

/** 판매자 배송 입력 폼 */
function ShippingInputForm({
                             tradeId,
                             onSuccess,
                           }: {
  tradeId: number
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [courierCode, setCourierCode] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {mutate: submitShipping, isPending} = useMutation({
    mutationFn: () => startShipping(tradeId, {courierCode, courierName, trackingNumber}),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['trade', String(tradeId)]})
      onSuccess()
    },
    onError() {
      setError('배송 정보 입력 중 오류가 발생했습니다.')
    },
  })
  
  const loadCouriers = useCallback(async () => {
    if (couriers.length > 0 || loadingCouriers) return
    setLoadingCouriers(true)
    try {
      const res = await getCouriers()
      setCouriers(res.couriers)
    } catch {
      // 실패 시 주요 택배사 하드코딩 폴백
      setCouriers([
        {code: 'kr.cjlogistics', name: 'CJ대한통운'},
        {code: 'kr.hanjin', name: '한진택배'},
        {code: 'kr.logen', name: '로젠택배'},
        {code: 'kr.epost', name: '우체국택배'},
        {code: 'kr.lotte', name: '롯데택배'},
      ])
    } finally {
      setLoadingCouriers(false)
    }
  }, [couriers.length, loadingCouriers])
  
  return (
    <div className="rounded-2xl p-5"
         style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
      <button
        onClick={() => {
          setExpanded(p => !p);
          if (!expanded) loadCouriers()
        }}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Truck size={16} style={{color: 'var(--color-accent)'}}/>
          <span className="font-bold text-sm"
                style={{color: 'var(--color-accent)', fontFamily: "'Giants','Pretendard',sans-serif"}}>배송 정보 입력하기</span>
        </div>
        {expanded ? <ChevronUp size={16} style={{color: 'var(--color-text-hint)'}}/>
          : <ChevronDown size={16} style={{color: 'var(--color-text-hint)'}}/>}
      </button>
      
      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          {/* 택배사 선택 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{color: 'var(--color-text-hint)'}}>택배사</label>
            <select
              value={courierCode}
              onChange={e => {
                setCourierCode(e.target.value)
                const found = couriers.find(c => c.code === e.target.value)
                setCourierName(found?.name ?? '')
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: courierCode ? 'var(--color-text-main)' : 'var(--color-text-hint)',
              }}
            >
              <option value="">택배사 선택</option>
              {loadingCouriers
                ? <option disabled>불러오는 중...</option>
                : couriers.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
            </select>
          </div>
          
          {/* 송장번호 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{color: 'var(--color-text-hint)'}}>송장번호</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="송장번호 입력"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              }}
            />
          </div>
          
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl"
                 style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}>
              <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
              <p className="text-xs" style={{color: 'var(--color-accent)'}}>{error}</p>
            </div>
          )}
          
          <button
            onClick={() => submitShipping()}
            disabled={!courierCode || !trackingNumber || isPending}
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{background: 'var(--color-accent)'}}
          >
            {isPending
              ? <><Loader2 size={15} className="animate-spin"/>입력 중...</>
              : <><Truck size={15}/>배송 시작</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 상태별 액션 패널 ──────────────────────────────────────────────────────────

/**
 * ActionPanel — 거래 상태 + 역할(구매자/판매자)에 따라 알맞은 액션 UI 렌더링
 */
function ActionPanel({
                       trade,
                       isBuyer,
                       onRefetch,
                     }: {
  trade: TradeResponse
  isBuyer: boolean
  onRefetch: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  
  // 판매자 — 거래 수락
  const {mutate: doAccept, isPending: isAccepting} = useMutation({
    mutationFn: () => acceptTrade(trade.tradeId),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['trade', String(trade.tradeId)]})
      onRefetch()
    },
    onError() {
      setAcceptError('거래 수락 중 오류가 발생했습니다.')
    },
  })
  
  // 구매자 — 구매 확정
  async function handleConfirm() {
    setShowWarning(false)
    setConfirming(true)
    setConfirmError(null)
    try {
      await confirmTrade(trade.tradeId)
      setConfirmed(true)
      queryClient.invalidateQueries({queryKey: ['trade', String(trade.tradeId)]})
      setTimeout(() => navigate(`/trade/${trade.tradeId}/review`), 1500)
    } catch {
      setConfirmError('구매 확정 처리 중 오류가 발생했습니다.')
    } finally {
      setConfirming(false)
    }
  }
  
  // ── CANCELED ──────────────────────────────────────────────────────────────
  if (trade.status === 'CANCELED') {
    return (
      <div
        className="flex flex-col items-center gap-3 py-8 rounded-2xl"
        style={{background: 'rgba(255,46,77,.06)', border: '1px solid rgba(255,46,77,.2)'}}
      >
        <XCircle size={36} style={{color: 'var(--color-accent)'}}/>
        <div className="text-center">
          <p className="font-bold text-base"
             style={{color: 'var(--color-accent)', fontFamily: "'Giants','Pretendard',sans-serif"}}>거래가 취소되었습니다</p>
          <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>결제가 이루어진 경우 환불 처리됩니다.</p>
        </div>
        <Link
          to="/mypage"
          className="mt-2 text-sm font-semibold hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          마이페이지로 이동
        </Link>
      </div>
    )
  }
  
  // ── CONFIRMED / COMPLETED ─────────────────────────────────────────────────
  if (trade.status === 'CONFIRMED' || trade.status === 'COMPLETED') {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col items-center gap-3 py-7 rounded-2xl"
          style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <CheckCircle2 size={36} style={{color: 'var(--color-success)'}}/>
          <div className="text-center">
            <p className="font-bold text-base"
               style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
              {trade.status === 'COMPLETED' ? '거래 완료' : '구매 확정 완료'}
            </p>
            <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>
              {trade.status === 'COMPLETED' ? '정산이 완료된 거래입니다.' : '판매자에게 대금이 지급됩니다.'}
            </p>
          </div>
        </div>
        {isBuyer && !trade.hasReview && (
          <Link
            to={`/trade/${trade.tradeId}/review`}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white text-center flex items-center justify-center gap-2 hover:text-white"
            style={{background: 'var(--color-accent)'}}
          >
            <Star size={16} fill="currentColor"/>
            매너 평가 작성하기
          </Link>
        )}
        {isBuyer && trade.hasReview && (
          <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>이미 매너 평가를 작성했습니다.</p>
        )}
      </div>
    )
  }
  
  // ── REQUESTED — 판매자 수락 대기 ──────────────────────────────────────────
  if (trade.status === 'REQUESTED') {
    if (isBuyer) {
      return (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
        >
          <Clock size={16} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>판매자 수락 대기 중</p>
            <p className="text-xs mt-1 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
              판매자가 거래를 수락하면 결제를 진행할 수 있습니다.
            </p>
          </div>
        </div>
      )
    }
    // 판매자 뷰
    return (
      <div className="flex flex-col gap-3">
        {acceptError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
               style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}>
            <AlertCircle size={14} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
            <p className="text-xs" style={{color: 'var(--color-accent)'}}>{acceptError}</p>
          </div>
        )}
        <button
          onClick={() => doAccept()}
          disabled={isAccepting}
          className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{background: 'var(--color-accent)'}}
        >
          {isAccepting
            ? <><Loader2 size={18} className="animate-spin"/>수락 중...</>
            : <><CheckCircle2 size={18}/>거래 수락하기</>}
        </button>
        <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
          수락하면 구매자가 결제를 진행할 수 있습니다.
        </p>
      </div>
    )
  }
  
  // ── ACCEPTED — 구매자 결제 대기 ───────────────────────────────────────────
  if (trade.status === 'ACCEPTED') {
    if (isBuyer) {
      return (
        <Link
          to={`/payment/${trade.tradeId}`}
          className="w-full py-4 rounded-xl font-bold text-base text-white text-center flex items-center justify-center gap-2 hover:text-white"
          style={{background: 'var(--color-accent)', boxShadow: '0 4px 16px rgba(255,46,77,.3)'}}
        >
          <Package size={18}/>
          결제하기
        </Link>
      )
    }
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
      >
        <Clock size={16} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
        <div>
          <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>구매자 결제 대기 중</p>
          <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>구매자가 결제를 완료하면 배송 정보를 입력해주세요.</p>
        </div>
      </div>
    )
  }
  
  // ── PAID — 판매자 배송 정보 입력 ──────────────────────────────────────────
  if (trade.status === 'PAID') {
    if (!isBuyer) {
      // 판매자: 배송 입력 폼
      if (trade.deliveryType === 'DELIVERY') {
        return <ShippingInputForm tradeId={trade.tradeId} onSuccess={onRefetch}/>
      }
      // 직거래: 만남 장소 안내
      return (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <MapPin size={16} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-success)'}}>결제 완료 — 직거래 진행</p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>구매자와 채팅으로 만남 장소를 조율해주세요.</p>
          </div>
        </div>
      )
    }
    // 구매자: 발송 대기
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
      >
        <Clock size={16} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
        <div>
          <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>결제 완료 — 판매자 발송 대기</p>
          <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>판매자가 발송하면 배송 상태를 확인할 수 있습니다.</p>
        </div>
      </div>
    )
  }
  
  // ── IN_PROGRESS — 배송 중 ─────────────────────────────────────────────────
  if (trade.status === 'IN_PROGRESS' || trade.status === 'RECEIVED') {
    if (isBuyer) {
      return (
        <div className="flex flex-col gap-3">
          {confirmed && (
            <div
              className="flex flex-col items-center gap-3 py-7 rounded-2xl"
              style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
            >
              <CheckCircle2 size={36} style={{color: 'var(--color-success)'}}/>
              <p className="font-bold text-base"
                 style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}>구매 확정 완료!</p>
              <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>매너 평가 페이지로 이동합니다...</p>
            </div>
          )}
          
          {!confirmed && (
            <>
              {showWarning && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl"
                  style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.25)'}}
                >
                  <AlertCircle size={15} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 1}}/>
                  <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                    구매 확정 후에는 취소가 불가합니다. 상품을 꼭 확인 후 진행해주세요.
                  </p>
                </div>
              )}
              
              {confirmError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                     style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}>
                  <AlertCircle size={14} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
                  <p className="text-xs" style={{color: 'var(--color-accent)'}}>{confirmError}</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  if (!showWarning) {
                    setShowWarning(true)
                  } else {
                    handleConfirm()
                  }
                }}
                disabled={confirming}
                className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
                style={{background: 'var(--color-accent)'}}
              >
                {confirming
                  ? <><Loader2 size={18} className="animate-spin"/>확정 처리 중...</>
                  : showWarning
                    ? <><CheckCircle2 size={18}/>네, 구매 확정합니다</>
                    : <><Star size={18}/>구매 확정하기</>}
              </button>
              
              {showWarning && (
                <button
                  onClick={() => setShowWarning(false)}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-colors"
                  style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}
                >
                  취소
                </button>
              )}
              
              {trade.status === 'IN_PROGRESS' && (
                <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
                  상품 수령 후 5일이 지나면 자동으로 구매 확정됩니다.
                </p>
              )}
            </>
          )}
        </div>
      )
    }
    
    // 판매자 뷰
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
      >
        <Truck size={16} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
        <div>
          <p className="text-sm font-semibold" style={{color: 'var(--color-success)'}}>
            {trade.status === 'RECEIVED' ? '수령 완료 — 구매 확정 대기' : '배송 중'}
          </p>
          <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
            구매자가 구매 확정 시 대금이 정산됩니다.
          </p>
        </div>
      </div>
    )
  }
  
  return null
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function TradeConfirmPage() {
  const {id} = useParams<{ id: string }>()
  const tradeId = Number(id)
  const {user} = useAuthStore()
  
  // 거래 정보 조회
  const {
    data: trade,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['trade', id],
    queryFn: () => getTrade(tradeId),
    enabled: !isNaN(tradeId),
    staleTime: 30_000,
  })
  
  // 현재 유저가 구매자인지 판단 (buyer.memberId === currentUserId)
  const isBuyer = trade ? (user?.id === trade.buyer.memberId) : true
  
  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
          <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>거래 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  // ── 에러 ────────────────────────────────────────────────────────────────────
  if (isError || !trade) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{background: 'var(--color-bg)'}}>
        <div className="text-center space-y-3">
          <AlertCircle size={32} style={{color: 'var(--color-accent)', margin: '0 auto'}}/>
          <p className="font-bold" style={{color: 'var(--color-text-main)'}}>거래 정보를 불러올 수 없습니다.</p>
          <Link to="/mypage" className="text-sm font-semibold hover:text-[var(--color-accent)]"
                style={{color: 'var(--color-text-sub)'}}>마이페이지로 돌아가기</Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[640px] mx-auto px-4 md:px-7 py-6 md:py-10">
        
        {/* 뒤로가기 */}
        <Link
          to="/mypage"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          <ChevronLeft size={16}/>마이페이지
        </Link>
        
        {/* 헤더 */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              color: 'var(--color-text-main)',
              fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              letterSpacing: '0.04em'
            }}
          >
            TRADE STATUS
          </h1>
          <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
            {isBuyer ? '내가 구매한 거래입니다.' : '내가 판매 중인 거래입니다.'}
          </p>
        </div>
        
        <div className="flex flex-col gap-5">
          {/* 상품 + 타임라인 카드 */}
          <div className="rounded-2xl p-5"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            <TradeProductCard trade={trade}/>
            <div className="mt-5 mb-3">
              <TradeTimeline status={trade.status}/>
            </div>
            <ShippingInfo trade={trade}/>
          </div>
          
          {/* 거래 상대방 카드 */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            {(() => {
              const opponent = isBuyer ? trade.seller : trade.buyer
              return (
                <>
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{background: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                  >
                    {opponent.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{color: 'var(--color-text-main)'}}>{opponent.nickname}</p>
                    <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>{isBuyer ? '판매자' : '구매자'}</p>
                  </div>
                  <Link
                    to="/chat"
                    className="text-xs font-semibold px-3 py-2 rounded-xl hover:text-white transition-colors"
                    style={{background: 'var(--color-primary)', color: '#fff'}}
                  >
                    채팅하기
                  </Link>
                </>
              )
            })()}
          </div>
          
          {/* 에스크로 안내 */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{background: 'rgba(0,33,71,.05)', border: '1px solid rgba(0,33,71,.12)'}}
          >
            <ShieldCheck size={18} style={{color: 'var(--color-primary)', flexShrink: 0, marginTop: 1}}/>
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{color: 'var(--color-text-main)'}}>에스크로 보호 중</p>
              <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                {formatPrice(trade.tradePrice)}이 RE:FORM에 보관되어 있습니다.
                구매 확정 시 판매자에게 즉시 지급됩니다.
              </p>
            </div>
          </div>
          
          {/* 상태별 액션 패널 */}
          <ActionPanel
            trade={trade}
            isBuyer={isBuyer}
            onRefetch={() => refetch()}
          />
          
          {/* 문제 발생 시 분쟁 신청 */}
          {(trade.status === 'IN_PROGRESS' || trade.status === 'RECEIVED') && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{background: 'rgba(255,46,77,.04)', border: '1px solid rgba(255,46,77,.15)'}}
            >
              <AlertCircle size={16} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
              <div>
                <p className="text-sm font-semibold mb-1" style={{color: 'var(--color-accent)'}}>상품에 문제가 있나요?</p>
                <p className="text-xs leading-relaxed mb-2" style={{color: 'var(--color-text-sub)'}}>
                  상품 미수령, 허위 매물 등 문제가 발생했다면 분쟁을 신청해주세요.
                </p>
                <Link
                  to="/chat"
                  className="text-xs font-semibold underline"
                  style={{color: 'var(--color-accent)'}}
                >
                  분쟁 신청하기
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
