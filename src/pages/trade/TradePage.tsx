/**
 * TradePage — 거래 관리 페이지 (구매자/판매자 공용)
 *
 * 라우트: /trade/:id
 *
 * 레이아웃:
 *   - 데스크탑: 왼쪽(거래 정보+액션 패널) + 오른쪽(인라인 채팅) 2컬럼
 *   - 모바일:  탭 전환 (거래현황 탭 / 채팅 탭)
 *
 * 거래 상태별 액션 흐름:
 *   REQUESTED  → 판매자: 수락(acceptTrade) / 구매자: 대기
 *   ACCEPTED   → 직거래: 채팅 조율 + 거래 완료 / 택배: 결제(/payment/:id)
 *   PAID       → 판매자: 배송 정보 입력(startShipping) / 구매자: 대기
 *   IN_PROGRESS → 구매자: 구매 확정(confirmTrade) / 판매자: 배송 중 안내
 *   RECEIVED   → 구매자: 구매 확정 / 판매자: 확정 대기
 *   CONFIRMED  → 구매자: 리뷰 작성 / 판매자: 정산 대기
 *   COMPLETED  → 거래 완료
 *   CANCELED   → 취소됨
 *   DISPUTED   → 분쟁 진행 중 (관리자 처리 대기)
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from 'lucide-react'
import type {TradeResponse} from '../../features/trade/api/tradeApi'
import {
  acceptTrade,
  cancelTrade,
  confirmTrade,
  getTrade,
  getTradeTracking,
  startShipping,
  updateDelivery,
} from '../../features/trade/api/tradeApi'
import type {Courier} from '../../features/delivery/api/deliveryApi'
import {getCouriers} from '../../features/delivery/api/deliveryApi'
import type {ChatMessage} from '../../features/chat/api/chatApi'
import {createChatRoom, getChatRooms, getMessages} from '../../features/chat/api/chatApi'
import {useStompChat} from '../../features/chat/hooks/useStompChat'
import {useStompTradeRealtime} from '../../features/trade/hooks/useStompTradeRealtime'
import {formatPrice} from '../../utils/format'
import {getDisplayChatMessageContent, shouldMaskChatMessageContent} from '../../utils/chatModeration'
import {resolveImageUrl} from '../../utils/image'
import {getTradeStatusDisplayLabel} from '../../utils/tradeStatusDisplay'
import useAuthStore from '../../store/authStore'
import type {TradeStatus} from '../../types/listing'

const KAKAO_POSTCODE_SCRIPT_ID = 'kakao-postcode-script'
const KAKAO_POSTCODE_SCRIPT_SRC = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

type KakaoUserSelectedType = 'R' | 'J'
type KakaoApartmentType = 'Y' | 'N'

interface KakaoPostcodeData {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  userSelectedType: KakaoUserSelectedType
  bname: string
  buildingName: string
  apartment: KakaoApartmentType
}

interface KakaoPostcodeInstance {
  open: () => void
}

interface KakaoPostcodeConstructor {
  new(options: { oncomplete: (data: KakaoPostcodeData) => void }): KakaoPostcodeInstance
}

declare global {
  interface Window {
    kakao?: {
      Postcode: KakaoPostcodeConstructor
    }
  }
}

// ── 상태 메타데이터 ────────────────────────────────────────────────────────────

interface StatusMeta {
  label: string
  color: string
  bg: string
}

const STATUS_META: Record<TradeStatus, StatusMeta> = {
  REQUESTED: {label: '거래 요청됨', color: 'var(--color-info)', bg: 'rgba(14,165,233,.1)'},
  ACCEPTED: {label: '결제 대기', color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  PAID: {label: '발송 대기', color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  IN_PROGRESS: {label: '배송 중', color: 'var(--color-primary)', bg: 'rgba(0,33,71,.08)'},
  RECEIVED: {label: '수령 완료', color: 'var(--color-success)', bg: 'rgba(0,179,110,.08)'},
  CONFIRMED: {label: '구매 확정', color: 'var(--color-success)', bg: 'rgba(0,179,110,.08)'},
  COMPLETED: {label: '거래 완료', color: 'var(--color-success)', bg: 'rgba(0,179,110,.08)'},
  CANCELED: {label: '취소됨', color: 'var(--color-accent)', bg: 'rgba(255,46,77,.08)'},
  DISPUTED: {label: '분쟁 진행 중', color: 'var(--color-accent)', bg: 'rgba(255,46,77,.08)'},
}

function getStatusMeta(status: TradeStatus, deliveryType: TradeResponse['deliveryType']): StatusMeta {
  const baseMeta = STATUS_META[status]
  return {
    ...baseMeta,
    label: getTradeStatusDisplayLabel(status, deliveryType),
  }
}

// ── 타임라인 정의 ──────────────────────────────────────────────────────────────

interface TimelineStep {
  key: TradeStatus
  label: string
}

const DELIVERY_TIMELINE_STEPS: TimelineStep[] = [
  {key: 'REQUESTED', label: '거래 요청'},
  {key: 'PAID', label: '결제 완료'},
  {key: 'IN_PROGRESS', label: '배송 중'},
  {key: 'RECEIVED', label: '수령 완료'},
  {key: 'CONFIRMED', label: '거래 확정'},
]

const DIRECT_TIMELINE_STEPS: TimelineStep[] = [
  {key: 'REQUESTED', label: '거래요청'},
  {key: 'ACCEPTED', label: '거래중'},
  {key: 'CONFIRMED', label: '거래완료'},
]

/** TradeStatus → 타임라인 단계 인덱스 */
function statusToStep(status: TradeStatus, deliveryType: TradeResponse['deliveryType']): number {
  if (deliveryType === 'DIRECT') {
    const directMap: Partial<Record<TradeStatus, number>> = {
      REQUESTED: 0,
      ACCEPTED: 1,
      PAID: 1,
      IN_PROGRESS: 1,
      RECEIVED: 1,
      CONFIRMED: 2,
      COMPLETED: 2,
    }
    return directMap[status] ?? 0
  }
  
  const map: Partial<Record<TradeStatus, number>> = {
    REQUESTED: 0, ACCEPTED: 0,
    PAID: 1,
    IN_PROGRESS: 2,
    RECEIVED: 3,
    CONFIRMED: 4, COMPLETED: 4,
  }
  return map[status] ?? 0
}

function buildExtraAddress(data: KakaoPostcodeData): string {
  let extraAddress = ''
  
  if (data.bname && /[동로가]$/.test(data.bname)) {
    extraAddress += data.bname
  }
  
  if (data.buildingName && data.apartment === 'Y') {
    extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName
  }
  
  return extraAddress ? `(${extraAddress})` : ''
}

function getPrimaryAddress(data: KakaoPostcodeData): string {
  return data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
}

function combineDeliveryAddress(baseAddress: string, detailAddress: string): string {
  const trimmedBaseAddress = baseAddress.trim()
  const trimmedDetailAddress = detailAddress.trim()
  
  if (!trimmedBaseAddress) return ''
  if (!trimmedDetailAddress) return trimmedBaseAddress
  
  return `${trimmedBaseAddress} · ${trimmedDetailAddress}`
}

function splitDeliveryAddress(address: string | null): { baseAddress: string; detailAddress: string } {
  const trimmedAddress = address?.trim() ?? ''
  
  if (!trimmedAddress) {
    return {baseAddress: '', detailAddress: ''}
  }
  
  const separatorIndex = trimmedAddress.lastIndexOf(' · ')
  if (separatorIndex === -1) {
    return {baseAddress: trimmedAddress, detailAddress: ''}
  }
  
  return {
    baseAddress: trimmedAddress.slice(0, separatorIndex).trim(),
    detailAddress: trimmedAddress.slice(separatorIndex + 3).trim(),
  }
}

function ensureKakaoPostcodeScript(): Promise<KakaoPostcodeConstructor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }
  
  if (window.kakao?.Postcode) {
    return Promise.resolve(window.kakao.Postcode)
  }
  
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_POSTCODE_SCRIPT_ID) as HTMLScriptElement | null
    
    const handleReady = () => {
      if (window.kakao?.Postcode) {
        resolve(window.kakao.Postcode)
        return
      }
      reject(new Error('Kakao postcode script loaded without Postcode constructor'))
    }
    
    if (existingScript) {
      existingScript.addEventListener('load', handleReady, {once: true})
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Kakao postcode script')), {once: true})
      return
    }
    
    const script = document.createElement('script')
    script.id = KAKAO_POSTCODE_SCRIPT_ID
    script.src = KAKAO_POSTCODE_SCRIPT_SRC
    script.async = true
    script.onload = handleReady
    script.onerror = () => reject(new Error('Failed to load Kakao postcode script'))
    document.head.appendChild(script)
  })
}

// ── 타임라인 컴포넌트 ─────────────────────────────────────────────────────────

function TradeTimeline({
                         status,
                         deliveryType,
                       }: {
  status: TradeStatus
  deliveryType: TradeResponse['deliveryType']
}) {
  const steps = deliveryType === 'DIRECT' ? DIRECT_TIMELINE_STEPS : DELIVERY_TIMELINE_STEPS
  const activeIdx = statusToStep(status, deliveryType)
  const isSpecial = status === 'CANCELED' || status === 'DISPUTED'
  
  if (isSpecial) {
    const meta = getStatusMeta(status, deliveryType)
    return (
      <div
        className="flex items-center gap-3 py-3 px-4 rounded-xl"
        style={{background: meta.bg, border: `1px solid ${meta.color}33`}}
      >
        {status === 'DISPUTED'
          ? <ShieldAlert size={16} style={{color: meta.color, flexShrink: 0}}/>
          : <XCircle size={16} style={{color: meta.color, flexShrink: 0}}/>}
        <span className="text-sm font-semibold" style={{color: meta.color}}>
          {meta.label}
        </span>
      </div>
    )
  }
  
  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        // 거래 완전 종료 시 모든 단계를 초록으로 처리 — "다 봤다" UX 신호
        const isAllComplete = status === 'CONFIRMED' || status === 'COMPLETED'
        const isDone = isAllComplete || i < activeIdx
        const isCurrent = !isAllComplete && i === activeIdx
        const icons = deliveryType === 'DIRECT'
          ? [
            <Clock size={15} key="clock"/>,
            <MessageCircle size={15} key="message"/>,
            <CheckCircle2 size={15} key="check"/>,
          ]
          : [
            <Clock size={15} key="clock"/>,
            <Package size={15} key="pkg"/>,
            <Truck size={15} key="truck"/>,
            <MapPin size={15} key="map"/>,
            <ShieldCheck size={15} key="shield"/>,
          ]
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0" style={{width: 52}}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isDone
                    ? 'var(--color-success)'
                    : isCurrent
                      ? 'var(--color-accent)'
                      : 'var(--color-surface-raised)',
                  color: isDone || isCurrent ? '#fff' : 'var(--color-text-hint)',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(255,46,77,.18)' : 'none',
                }}
              >
                {isDone ? <CheckCircle2 size={14}/> : icons[i]}
              </div>
              <span
                className="text-[10px] mt-1 text-center leading-tight"
                style={{
                  color: isCurrent
                    ? 'var(--color-accent)'
                    : isDone
                      ? 'var(--color-success)'
                      : 'var(--color-text-hint)',
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mb-5 transition-colors"
                style={{
                  background: i < activeIdx
                    ? 'var(--color-success)'
                    : 'var(--color-border)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 상품 카드 ─────────────────────────────────────────────────────────────────

function TradeProductCard({trade}: { trade: TradeResponse }) {
  const imgSrc = resolveImageUrl(trade.post.thumbnailUrl)
  return (
    <div className="flex gap-4">
      <Link
        to={`/listing/${trade.post.postId}`}
        className="relative rounded-xl overflow-hidden flex-shrink-0 block"
        style={{width: 68, height: 68, background: '#1A3051'}}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={trade.post.title}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.08) 0 2px,transparent 2px 12px)'}}
            />
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 22, color: 'rgba(255,255,255,.2)'}}
            >
              {trade.post.postId % 99}
            </span>
          </>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-0.5" style={{color: 'var(--color-text-hint)'}}>
          {trade.buyer.nickname} → {trade.seller.nickname}
        </p>
        <p
          className="text-sm font-semibold leading-snug mb-1 line-clamp-2"
          style={{color: 'var(--color-text-main)'}}
        >
          {trade.post.title}
        </p>
        <p
          className="text-base font-bold"
          style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {formatPrice(trade.tradePrice)}
        </p>
      </div>
    </div>
  )
}

// ── 배송 정보 표시 ────────────────────────────────────────────────────────────

function ShippingInfo({trade}: { trade: TradeResponse }) {
  if (trade.deliveryType !== 'DELIVERY' || !trade.trackingNumber) return null
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-xl mt-4"
      style={{background: 'var(--color-surface-raised)'}}
    >
      <p className="text-xs font-semibold mb-0.5" style={{color: 'var(--color-text-hint)'}}>
        배송 정보
      </p>
      <div className="flex justify-between text-xs">
        <span style={{color: 'var(--color-text-hint)'}}>택배사</span>
        <span style={{color: 'var(--color-text-sub)'}}>{trade.courierCode ?? '-'}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span style={{color: 'var(--color-text-hint)'}}>운송장</span>
        <span
          style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {trade.trackingNumber}
        </span>
      </div>
    </div>
  )
}

// ── 배송지 입력/수정 폼 (구매자 전용) ────────────────────────────────────────

function DeliveryAddressForm({
                               tradeId,
                               currentAddress,
                               onSuccess,
                             }: {
  tradeId: number
  currentAddress: string | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const detailInputRef = useRef<HTMLInputElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  // currentAddress prop 동기화용 — 렌더 중 setState 패턴 (React 공식 권장, effect 내 setState 금지)
  const [syncedAddress, setSyncedAddress] = useState(currentAddress)
  const [baseAddress, setBaseAddress] = useState(() => splitDeliveryAddress(currentAddress).baseAddress)
  const [detailAddress, setDetailAddress] = useState(() => splitDeliveryAddress(currentAddress).detailAddress)
  const [error, setError] = useState<string | null>(null)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  
  // prop이 변경되면 렌더 중에 state 동기화 (getDerivedState 패턴)
  if (syncedAddress !== currentAddress) {
    setSyncedAddress(currentAddress)
    const next = splitDeliveryAddress(currentAddress)
    setBaseAddress(next.baseAddress)
    setDetailAddress(next.detailAddress)
  }
  
  const composedAddress = combineDeliveryAddress(baseAddress, detailAddress)
  
  const {mutate: submitAddress, isPending} = useMutation({
    mutationFn: () => updateDelivery(tradeId, {deliveryAddress: composedAddress}),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['trade', String(tradeId)]})
      setExpanded(false)
      setError(null)
      onSuccess()
    },
    onError() {
      setError('배송지 저장 중 오류가 발생했습니다.')
    },
  })
  
  const handleAddressSearch = useCallback(async () => {
    setError(null)
    setIsSearchingAddress(true)
    
    try {
      const Postcode = await ensureKakaoPostcodeScript()
      const postcode = new Postcode({
        oncomplete(data) {
          const primaryAddress = getPrimaryAddress(data).trim()
          const extraAddress = buildExtraAddress(data)
          const nextBaseAddress = [
            data.zonecode ? `(${data.zonecode})` : '',
            primaryAddress,
            extraAddress,
          ].filter(Boolean).join(' ')
          
          setBaseAddress(nextBaseAddress)
          setExpanded(true)
          setTimeout(() => {
            detailInputRef.current?.focus()
            detailInputRef.current?.setSelectionRange(detailInputRef.current.value.length, detailInputRef.current.value.length)
          }, 0)
        },
      })
      postcode.open()
    } catch {
      setError('주소 검색 창을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSearchingAddress(false)
    }
  }, [])
  
  const resetForm = useCallback(() => {
    const nextAddress = splitDeliveryAddress(currentAddress)
    setBaseAddress(nextAddress.baseAddress)
    setDetailAddress(nextAddress.detailAddress)
    setError(null)
    setExpanded(false)
  }, [currentAddress])
  
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      {/* 헤더 — 현재 배송지 또는 입력 안내 */}
      <button
        className="flex items-center gap-3 w-full px-4 py-3.5 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <MapPin size={15} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-0.5" style={{color: 'var(--color-text-hint)'}}>
            배송지
          </p>
          <p className="text-sm truncate"
             style={{color: currentAddress ? 'var(--color-text-main)' : 'var(--color-text-hint)'}}>
            {currentAddress ?? '배송지를 입력해주세요'}
          </p>
        </div>
        <span className="text-xs font-semibold" style={{color: 'var(--color-accent)', flexShrink: 0}}>
          {expanded ? '닫기' : (currentAddress ? '수정' : '입력')}
        </span>
      </button>
      
      {/* 입력 폼 */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{borderColor: 'var(--color-border)'}}>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleAddressSearch}
              disabled={isSearchingAddress}
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:flex-shrink-0 hover:text-white"
              style={{background: 'var(--color-primary)'}}
            >
              {isSearchingAddress
                ? <><Loader2 size={14} className="animate-spin"/>검색 준비 중...</>
                : <><MapPin size={14}/>우편번호 찾기</>
              }
            </button>
            <div className="flex-1 rounded-xl px-3 py-2.5 text-xs leading-relaxed"
                 style={{
                   background: 'var(--color-surface-raised)',
                   color: 'var(--color-text-sub)',
                   border: '1px solid var(--color-border)'
                 }}>
              검색 주소와 상세주소를 나눠 입력하고 저장할 때만 하나로 합칩니다.
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
              placeholder="우편번호 찾기로 기본 주소를 선택해주세요"
              value={baseAddress}
              onChange={e => setBaseAddress(e.target.value)}
            />
            <input
              ref={detailInputRef}
              type="text"
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
              placeholder="상세주소를 입력해주세요. 예: 101호"
              value={detailAddress}
              onChange={e => setDetailAddress(e.target.value)}
            />
          </div>
          {composedAddress && (
            <p className="mt-2 text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
              저장될 주소: {composedAddress}
            </p>
          )}
          {error && (
            <p className="text-xs mt-1.5" style={{color: 'var(--color-error)'}}>{error}</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => submitAddress()}
              disabled={!baseAddress.trim() || isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{background: 'var(--color-accent)'}}
            >
              {isPending
                ? <><Loader2 size={14} className="animate-spin"/>저장 중...</>
                : <><MapPin size={14}/>배송지 저장</>
              }
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-sub)',
                border: '1px solid var(--color-border)'
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 배송 입력 폼 (판매자 전용) ────────────────────────────────────────────────

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
  const [courierName, setCourierName] = useState('') // 선택된 택배사 이름 — 백엔드 외부API 호출 대신 프론트에서 전달
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
      // API 실패 시 주요 택배사 하드코딩 폴백
      // deliveryapi.co.kr 실제 코드: kr. prefix 없음
      setCouriers([
        {code: 'cj', name: 'CJ대한통운'},
        {code: 'hanjin', name: '한진택배'},
        {code: 'logen', name: '로젠택배'},
        {code: 'post', name: '우체국택배'},
        {code: 'lotte', name: '롯데택배'},
        {code: 'kyungdong', name: '경동택배'},
      ])
    } finally {
      setLoadingCouriers(false)
    }
  }, [couriers.length, loadingCouriers])
  
  return (
    <div
      className="rounded-2xl p-4"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      <button
        onClick={() => {
          setExpanded(p => !p);
          if (!expanded) loadCouriers()
        }}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Truck size={15} style={{color: 'var(--color-accent)'}}/>
          <span
            className="font-bold text-sm"
            style={{color: 'var(--color-accent)', fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            배송 정보 입력하기
          </span>
        </div>
        {expanded
          ? <ChevronUp size={15} style={{color: 'var(--color-text-hint)'}}/>
          : <ChevronDown size={15} style={{color: 'var(--color-text-hint)'}}/>}
      </button>
      
      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          {/* 택배사 선택 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{color: 'var(--color-text-hint)'}}>
              택배사
            </label>
            <select
              value={courierCode}
              onChange={e => {
                setCourierCode(e.target.value)
                // 선택된 택배사 이름을 state에 저장해 startShipping 요청에 포함
                const selected = couriers.find(c => c.code === e.target.value)
                setCourierName(selected?.name ?? e.target.value)
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
                : couriers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          
          {/* 송장번호 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{color: 'var(--color-text-hint)'}}>
              송장번호
            </label>
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
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
            >
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
              ? <><Loader2 size={14} className="animate-spin"/>입력 중...</>
              : <><Truck size={14}/>배송 시작</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ── 배송 단계 정의 (deliveryapi.co.kr 상태 코드 매핑) ─────────────────────────
/**
 * deliveryapi.co.kr deliveryStatus 코드 → 4단계 UI 인덱스 매핑
 * 공식 문서 상태 코드: COLLECTED / IN_TRANSIT / OUT_FOR_DELIVERY / DELIVERED 계열
 */
const DELIVERY_STAGE_LABELS = ['접수', '이동 중', '배달 중', '배달 완료'] as const

/**
 * deliveryStatus 문자열을 0~3 단계 인덱스로 변환
 * deliveryapi.co.kr 반환 코드 예: COLLECTED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED
 */
function getDeliveryStageIndex(status: string): number {
  const s = (status ?? '').toUpperCase()
  // 배달 완료
  if (['DELIVERED', 'COMPLETE', 'COMPLETED', 'SIGNED'].some(k => s.includes(k))) return 3
  // 배달 중 (라스트마일)
  if (['OUT_FOR_DELIVERY', 'DELIVERING', 'AT_DELIVERY'].some(k => s.includes(k))) return 2
  // 이동 중 (허브/간선)
  if (['TRANSIT', 'MOVING', 'HUB', 'DISTRIBUTION', 'ARRIVED', 'DEPARTURE'].some(k => s.includes(k))) return 1
  // 접수 (집화)
  if (['COLLECTED', 'COLLECT', 'PICKUP', 'ACCEPT', 'REGISTERED'].some(k => s.includes(k))) return 0
  return 0
}

// ── 배송 추적 패널 ───────────────────────────────────────────────────────────

/**
 * DeliveryTrackingPanel — 택배 실시간 배송 추적 UI
 *
 * getTradeTracking(tradeId) 호출 → 배송 이력 타임라인 렌더링
 * 60초 자동 갱신 + 수동 새로고침 버튼 제공
 * IN_PROGRESS / RECEIVED 상태의 구매자·판매자 모두에게 표시
 */
function DeliveryTrackingPanel({tradeId}: { tradeId: number }) {
  const [expanded, setExpanded] = useState(true)
  const {data, isLoading, isError, refetch, isFetching} = useQuery({
    queryKey: ['tradeTracking', tradeId],
    queryFn: () => getTradeTracking(tradeId),
    staleTime: 30_000,
    refetchInterval: 60_000, // 1분마다 자동 갱신 (배송 상태 변경 감지)
    retry: 1,               // 외부 API 실패 시 1회 재시도
  })
  
  // results 배열에서 첫 번째 결과(단일 송장) 추출
  const result = data?.results?.[0] ?? null
  // events는 최신 순 정렬 — UI에서 그대로 사용 (최신이 상단)
  const events = result?.events ?? []
  
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      {/* 헤더: div 사용 — 내부에 새로고침 <button>이 있어 중첩 button 금지 규칙 적용 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(p => !p)}
        onKeyDown={e => {
          if (e.key === 'Enter') setExpanded(p => !p)
        }}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Truck size={15} style={{color: 'var(--color-primary)', flexShrink: 0}}/>
          <span
            className="text-sm font-bold"
            style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            배송 추적
          </span>
          {/* 현재 배송 상태 레이블 뱃지 */}
          {result?.statusLabel && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{background: 'rgba(0,33,71,.07)', color: 'var(--color-primary)'}}
            >
              {result.statusLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* 수동 새로고침 버튼 — 클릭이 헤더 토글로 전파되지 않게 stopPropagation */}
          <button
            onClick={e => {
              e.stopPropagation()
              void refetch()
            }}
            disabled={isFetching}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-40"
            aria-label="배송 정보 새로고침"
          >
            <RefreshCw
              size={13}
              style={{color: 'var(--color-text-hint)'}}
              className={isFetching ? 'animate-spin' : ''}
            />
          </button>
          {expanded
            ? <ChevronUp size={15} style={{color: 'var(--color-text-hint)'}}/>
            : <ChevronDown size={15} style={{color: 'var(--color-text-hint)'}}/>}
        </div>
      </div>
      
      {/* 본문 — 접힘/펼침 */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{borderColor: 'var(--color-border)'}}>
          
          {/* 배송 단계 스텝바 — result 있을 때만 표시 */}
          {!isLoading && !isError && result && (
            <div className="flex items-start mb-4">
              {DELIVERY_STAGE_LABELS.map((label, i) => {
                const stageIdx = getDeliveryStageIndex(result.status)
                // 배달 완료 시 전 단계 초록 처리 — "다 끝났다" UX 신호
                const isAllDelivered = stageIdx === DELIVERY_STAGE_LABELS.length - 1
                const isDone = isAllDelivered || i < stageIdx
                const isCurrent = !isAllDelivered && i === stageIdx
                return (
                  <div key={label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0" style={{minWidth: 44}}>
                      {/* 단계 원형 인디케이터 */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                        style={{
                          background: isDone
                            ? 'var(--color-success)'
                            : isCurrent
                              ? 'var(--color-accent)'
                              : 'var(--color-surface-raised)',
                          color: isDone || isCurrent ? '#fff' : 'var(--color-text-hint)',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(255,46,77,.18)' : 'none',
                        }}
                      >
                        {isDone ? <CheckCircle2 size={12}/> : i + 1}
                      </div>
                      {/* 단계 레이블 */}
                      <span
                        className="text-[9px] mt-1 text-center leading-tight"
                        style={{
                          color: isCurrent
                            ? 'var(--color-accent)'
                            : isDone
                              ? 'var(--color-success)'
                              : 'var(--color-text-hint)',
                          fontWeight: isCurrent ? 700 : 400,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    {/* 단계 연결선 */}
                    {i < DELIVERY_STAGE_LABELS.length - 1 && (
                      <div
                        className="flex-1 h-px mx-1 mb-4 transition-colors"
                        style={{background: i < stageIdx ? 'var(--color-success)' : 'var(--color-border)'}}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {/* 로딩 */}
          {isLoading && (
            <div className="flex justify-center py-5">
              <Loader2 size={18} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
            </div>
          )}
          
          {/* 에러: API 실패 시 trade에 저장된 송장 정보로 폴백 */}
          {isError && !isLoading && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 justify-center py-2">
                <AlertCircle size={13} style={{color: 'var(--color-text-hint)'}}/>
                <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                  실시간 조회 불가 — 저장된 송장 정보를 표시합니다.
                </p>
              </div>
              {(courierCode || trackingNumber) && (
                <div
                  className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
                  style={{background: 'var(--color-surface-raised)'}}
                >
                  {courierCode && (
                    <div className="flex justify-between text-xs">
                      <span style={{color: 'var(--color-text-hint)'}}>택배사</span>
                      <span style={{color: 'var(--color-text-sub)'}}>{courierCode}</span>
                    </div>
                  )}
                  {trackingNumber && (
                    <div className="flex justify-between text-xs">
                      <span style={{color: 'var(--color-text-hint)'}}>송장번호</span>
                      <span style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                        {trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 이력 없음 */}
          {!isLoading && !isError && result && events.length === 0 && (
            <p className="text-xs text-center py-3" style={{color: 'var(--color-text-hint)'}}>
              아직 배송 이력이 없습니다.
            </p>
          )}
          
          {/* 배송 이력 타임라인 */}
          {!isLoading && events.length > 0 && (
            <div className="flex flex-col">
              {events.map((event, i) => (
                <div key={i} className="flex gap-3">
                  {/* 타임라인 세로선 + 점 */}
                  <div className="flex flex-col items-center" style={{width: 16}}>
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{background: i === 0 ? 'var(--color-accent)' : 'var(--color-border)'}}
                    />
                    {i < events.length - 1 && (
                      <div
                        className="w-px flex-1 mt-1"
                        style={{background: 'var(--color-border)', minHeight: 16}}
                      />
                    )}
                  </div>
                  {/* 이벤트 내용 */}
                  <div className="pb-3 flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold leading-snug"
                      style={{color: i === 0 ? 'var(--color-text-main)' : 'var(--color-text-sub)'}}
                    >
                      {event.description}
                    </p>
                    <p className="text-[10px] mt-0.5 truncate" style={{color: 'var(--color-text-hint)'}}>
                      {event.location} · {new Date(event.time).toLocaleString('ko-KR', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 예상 도착일 */}
          {result?.estimatedDelivery && (
            <div
              className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{background: 'rgba(0,33,71,.05)'}}
            >
              <Clock size={12} style={{color: 'var(--color-primary)', flexShrink: 0}}/>
              <p className="text-xs" style={{color: 'var(--color-text-sub)'}}>
                예상 도착:{' '}
                <span style={{
                  color: 'var(--color-primary)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}>
                  {result.estimatedDelivery}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 상태별 액션 패널 ──────────────────────────────────────────────────────────

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
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [rejectConfirming, setRejectConfirming] = useState(false)
  
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
  
  // 판매자 — 거래 거절 (REQUESTED → CANCELED)
  const {mutate: doReject, isPending: isRejecting} = useMutation({
    mutationFn: () => cancelTrade(trade.tradeId),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['trade', String(trade.tradeId)]})
      onRefetch()
    },
    onError() {
      setRejectError('거래 거절 중 오류가 발생했습니다.')
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
      setConfirmError(trade.deliveryType === 'DIRECT' ? '거래 완료 처리 중 오류가 발생했습니다.' : '구매 확정 처리 중 오류가 발생했습니다.')
    } finally {
      setConfirming(false)
    }
  }
  
  // ── CANCELED ────────────────────────────────────────────────────────────────
  if (trade.status === 'CANCELED') {
    return (
      <div
        className="flex flex-col items-center gap-3 py-7 rounded-2xl"
        style={{background: 'rgba(255,46,77,.05)', border: '1px solid rgba(255,46,77,.18)'}}
      >
        <XCircle size={32} style={{color: 'var(--color-accent)'}}/>
        <div className="text-center">
          <p
            className="font-bold text-base"
            style={{color: 'var(--color-accent)', fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            거래가 취소되었습니다
          </p>
          <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>
            결제가 이루어진 경우 환불 처리됩니다.
          </p>
        </div>
        <Link
          to="/mypage"
          className="mt-1 text-sm font-semibold hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          마이페이지로 이동
        </Link>
      </div>
    )
  }
  
  // ── DISPUTED ────────────────────────────────────────────────────────────────
  if (trade.status === 'DISPUTED') {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col gap-3 p-5 rounded-2xl"
          style={{background: 'rgba(255,46,77,.05)', border: '1px solid rgba(255,46,77,.2)'}}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} style={{color: 'var(--color-accent)', flexShrink: 0}}/>
            <p
              className="font-bold text-base"
              style={{color: 'var(--color-accent)', fontFamily: "'Giants','Pretendard',sans-serif"}}
            >
              분쟁 진행 중
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
            관리자가 거래 내용을 검토 중입니다.
            채팅을 통해 관련 자료(사진, 설명 등)를 제공하면 더 빠른 처리에 도움이 됩니다.
          </p>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
               style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.2)'}}>
            <AlertTriangle size={13} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 2}}/>
            <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
              분쟁 기간 중에는 거래 대금이 RE:FORM에 보관됩니다.
              관리자 결정 후 해당 당사자에게 지급됩니다.
            </p>
          </div>
        </div>
        <Link
          to="/mypage"
          className="w-full py-3 rounded-xl font-bold text-sm text-center hover:text-white transition-colors"
          style={{background: 'var(--color-primary)', color: '#fff'}}
        >
          마이페이지로 이동
        </Link>
      </div>
    )
  }
  
  // ── CONFIRMED / COMPLETED ────────────────────────────────────────────────────
  if (trade.status === 'CONFIRMED' || trade.status === 'COMPLETED') {
    const isDirectTrade = trade.deliveryType === 'DIRECT'
    return (
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col items-center gap-3 py-7 rounded-2xl"
          style={{background: 'rgba(0,179,110,.05)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <CheckCircle2 size={32} style={{color: 'var(--color-success)'}}/>
          <div className="text-center">
            <p
              className="font-bold text-base"
              style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}
            >
              {trade.status === 'COMPLETED' || isDirectTrade ? '거래 완료' : '구매 확정 완료'}
            </p>
            <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>
              {trade.status === 'COMPLETED'
                ? isDirectTrade ? '직거래가 정상적으로 마무리되었습니다.' : '정산이 완료된 거래입니다.'
                : isDirectTrade ? '매너 평가와 거래 내역이 반영되었습니다.' : '판매자에게 대금이 지급됩니다.'}
            </p>
          </div>
        </div>
        {isBuyer && !trade.hasReview && (
          <Link
            to={`/trade/${trade.tradeId}/review`}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white text-center flex items-center justify-center gap-2 hover:text-white"
            style={{background: 'var(--color-accent)'}}
          >
            <Star size={15} fill="currentColor"/>
            매너 평가 작성하기
          </Link>
        )}
        {isBuyer && trade.hasReview && (
          <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
            이미 매너 평가를 작성했습니다.
          </p>
        )}
        {!isBuyer && !isDirectTrade && (
          <div className="flex flex-col gap-2.5">
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
              style={{background: 'rgba(255,184,0,.08)', border: '1px solid rgba(255,184,0,.3)'}}
            >
              <Package size={15} style={{color: 'var(--color-gold)', flexShrink: 0, marginTop: 2}}/>
              <div>
                <p
                  className="text-sm font-bold mb-0.5"
                  style={{color: 'var(--color-gold)', fontFamily: "'Giants','Pretendard',sans-serif"}}
                >
                  정산 예치금이 지급되었습니다!
                </p>
                <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                  마이페이지 &gt; 예치금 내역에서 출금을 신청하실 수 있습니다.
                </p>
              </div>
            </div>
            <Link
              to="/mypage"
              state={{tab: 'points'}}
              className="w-full py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 hover:text-white transition-colors"
              style={{
                background: 'rgba(255,184,0,.15)',
                color: 'var(--color-gold)',
                border: '1px solid rgba(255,184,0,.35)',
              }}
            >
              <Package size={15}/>
              출금 신청하러 가기
            </Link>
            <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
              정산까지 영업일 기준 1~3일 소요됩니다.
            </p>
          </div>
        )}
        {!isBuyer && isDirectTrade && (
          <div
            className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
            style={{background: 'rgba(0,179,110,.08)', border: '1px solid rgba(0,179,110,.24)'}}
          >
            <MessageCircle size={15} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
            <div>
              <p
                className="text-sm font-bold mb-0.5"
                style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}
              >
                직거래가 완료되었습니다
              </p>
              <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                구매자 평가가 완료되면 거래 내역에서 최종 상태를 확인하실 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // ── REQUESTED ────────────────────────────────────────────────────────────────
  if (trade.status === 'REQUESTED') {
    if (isBuyer) {
      return (
        <div className="flex flex-col gap-3">
          {/* 판매자 수락 대기 안내 */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
          >
            <Clock size={15} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
            <div>
              <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>
                판매자 수락 대기 중
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                {trade.deliveryType === 'DIRECT'
                  ? '판매자가 거래를 수락하면 채팅으로 장소, 시간, 상품 상태를 조율할 수 있습니다.'
                  : '판매자가 거래를 수락하면 결제를 진행할 수 있습니다.'}
              </p>
            </div>
          </div>
          {/* 택배 거래일 때 배송지 미리 입력 */}
          {trade.deliveryType === 'DELIVERY' && (
            <DeliveryAddressForm
              tradeId={trade.tradeId}
              currentAddress={trade.deliveryAddress}
              onSuccess={onRefetch}
            />
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {acceptError && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
          >
            <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
            <p className="text-xs" style={{color: 'var(--color-accent)'}}>{acceptError}</p>
          </div>
        )}
        {rejectError && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
          >
            <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
            <p className="text-xs" style={{color: 'var(--color-accent)'}}>{rejectError}</p>
          </div>
        )}
        <button
          onClick={() => doAccept()}
          disabled={isAccepting || isRejecting}
          className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{background: 'var(--color-accent)'}}
        >
          {isAccepting
            ? <><Loader2 size={17} className="animate-spin"/>수락 중...</>
            : <><CheckCircle2 size={17}/>거래 수락하기</>}
        </button>
        {/* 거절 버튼 — 1단계: 버튼 노출 / 2단계: 확인 메시지 */}
        {!rejectConfirming ? (
          <button
            onClick={() => setRejectConfirming(true)}
            disabled={isAccepting || isRejecting}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-sub)',
              border: '1px solid var(--color-border)',
            }}
          >
            <XCircle size={15}/>
            거래 거절하기
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-center leading-relaxed" style={{color: 'var(--color-warning)'}}>
              거절하면 구매자에게 알림이 전송됩니다. 정말 거절하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectConfirming(false)
                  doReject()
                }}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{background: 'var(--color-accent)'}}
              >
                {isRejecting ? <><Loader2 size={14} className="animate-spin"/>거절 중...</> : '네, 거절합니다'}
              </button>
              <button
                onClick={() => setRejectConfirming(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)'
                }}
              >
                돌아가기
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
          {trade.deliveryType === 'DIRECT'
            ? '수락 후에는 구매자와 채팅으로 직거래를 진행하고, 완료 전까지 거래 취소가 가능합니다.'
            : '수락하면 구매자가 결제를 진행할 수 있습니다.'}
        </p>
      </div>
    )
  }
  
  // ── ACCEPTED ─────────────────────────────────────────────────────────────────
  if (trade.status === 'ACCEPTED') {
    if (isBuyer) {
      if (trade.deliveryType === 'DIRECT') {
        return (
          <div className="flex flex-col gap-3">
            {confirmed && (
              <div
                className="flex flex-col items-center gap-3 py-7 rounded-2xl"
                style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
              >
                <CheckCircle2 size={32} style={{color: 'var(--color-success)'}}/>
                <p
                  className="font-bold text-base"
                  style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}
                >
                  거래 완료 처리 중입니다
                </p>
                <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                  판매자 매너 평가 화면으로 이동합니다...
                </p>
              </div>
            )}
            
            {!confirmed && (
              <>
                <div
                  className="flex items-start gap-3 p-4 rounded-2xl"
                  style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
                >
                  <MessageCircle size={15} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
                  <div>
                    <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>
                      직거래 진행 중
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                      판매자와 채팅으로 장소, 시간, 상품 상태를 충분히 확인한 뒤 거래를 마무리해 주세요.
                    </p>
                  </div>
                </div>
                
                {showWarning && (
                  <div
                    className="flex items-start gap-2 px-4 py-3 rounded-xl"
                    style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.25)'}}
                  >
                    <AlertCircle size={14} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 1}}/>
                    <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                      거래 완료 후에는 취소할 수 없습니다. 직거래가 끝났다면 판매자 매너 평가로 이어집니다.
                    </p>
                  </div>
                )}
                
                {confirmError && (
                  <div
                    className="flex items-start gap-2 px-4 py-3 rounded-xl"
                    style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
                  >
                    <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
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
                    ? <><Loader2 size={17} className="animate-spin"/>완료 처리 중...</>
                    : showWarning
                      ? <><CheckCircle2 size={17}/>네, 거래를 완료합니다</>
                      : <><CheckCircle2 size={17}/>거래 완료하기</>}
                </button>
                
                {showWarning && (
                  <button
                    onClick={() => setShowWarning(false)}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-colors"
                    style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}
                  >
                    돌아가기
                  </button>
                )}
              </>
            )}
          </div>
        )
      }
      
      return (
        <div className="flex flex-col gap-3">
          {/* 택배 거래일 때 배송지 입력/수정 */}
          {trade.deliveryType === 'DELIVERY' && (
            <DeliveryAddressForm
              tradeId={trade.tradeId}
              currentAddress={trade.deliveryAddress}
              onSuccess={onRefetch}
            />
          )}
          {/* 택배 거래에서 배송지 미입력 시 경고 표시 */}
          {trade.deliveryType === 'DELIVERY' && !trade.deliveryAddress && (
            <div
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.3)'}}
            >
              <AlertCircle size={14} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 1}}/>
              <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                결제 전에 배송지를 입력해주세요. 위의 배송지 입력 칸을 눌러 주소를 등록하면 결제가 가능합니다.
              </p>
            </div>
          )}
          {/* 배송지 입력 완료 시에만 결제 버튼 활성화 */}
          {trade.deliveryType === 'DELIVERY' && !trade.deliveryAddress ? (
            <button
              disabled
              className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 opacity-40 cursor-not-allowed"
              style={{background: 'var(--color-text-hint)'}}
            >
              <Package size={17}/>
              배송지 입력 후 결제 가능
            </button>
          ) : (
            <Link
              to={`/payment/${trade.tradeId}`}
              className="w-full py-4 rounded-xl font-bold text-base text-white text-center flex items-center justify-center gap-2 hover:text-white transition-all"
              style={{background: 'var(--color-accent)', boxShadow: '0 4px 16px rgba(255,46,77,.28)'}}
            >
              <Package size={17}/>
              결제하기
            </Link>
          )}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {/* 구매자 결제 대기 안내 */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
        >
          <Clock size={15} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>
              {trade.deliveryType === 'DIRECT' ? '직거래 조율 진행 중' : '구매자 결제 대기 중'}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
              {trade.deliveryType === 'DIRECT'
                ? '구매자와 채팅으로 장소, 시간, 상품 상태를 충분히 조율해 주세요.'
                : '구매자가 결제를 완료하면 배송 정보를 입력해주세요.'}
            </p>
          </div>
        </div>
        
        {/* 취소 에러 */}
        {rejectError && (
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
          >
            <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
            <p className="text-xs" style={{color: 'var(--color-accent)'}}>{rejectError}</p>
          </div>
        )}
        
        {/* 결제 전 거래 취소 — 2단계 확인 */}
        {!rejectConfirming ? (
          <button
            onClick={() => setRejectConfirming(true)}
            disabled={isRejecting}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-sub)',
              border: '1px solid var(--color-border)',
            }}
          >
            <XCircle size={15}/>
            거래 취소하기
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-center leading-relaxed" style={{color: 'var(--color-warning)'}}>
              취소하면 구매자에게 알림이 전송됩니다. 정말 거래를 취소하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectConfirming(false)
                  doReject()
                }}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{background: 'var(--color-accent)'}}
              >
                {isRejecting ? <><Loader2 size={14} className="animate-spin"/>취소 중...</> : '네, 취소합니다'}
              </button>
              <button
                onClick={() => setRejectConfirming(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)'
                }}
              >
                돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // ── PAID ─────────────────────────────────────────────────────────────────────
  if (trade.status === 'PAID') {
    if (!isBuyer) {
      if (trade.deliveryType === 'DELIVERY') {
        return <ShippingInputForm tradeId={trade.tradeId} onSuccess={onRefetch}/>
      }
      return (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <MessageCircle size={15} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-success)'}}>
              직거래 진행 중
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
              구매자와 채팅으로 장소, 시간, 상품 상태를 끝까지 확인해 주세요.
            </p>
          </div>
        </div>
      )
    }
    return (
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
      >
        <Clock size={15} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
        <div>
          <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>
            결제 완료 — 판매자 발송 대기
          </p>
          <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
            판매자가 발송하면 배송 상태를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }
  
  // ── IN_PROGRESS / RECEIVED ───────────────────────────────────────────────────
  if (trade.status === 'IN_PROGRESS' || trade.status === 'RECEIVED') {
    if (trade.deliveryType === 'DIRECT') {
      if (isBuyer) {
        return (
          <div className="flex flex-col gap-3">
            {confirmed && (
              <div
                className="flex flex-col items-center gap-3 py-7 rounded-2xl"
                style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
              >
                <CheckCircle2 size={32} style={{color: 'var(--color-success)'}}/>
                <p
                  className="font-bold text-base"
                  style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}
                >
                  거래 완료 처리 중입니다
                </p>
                <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                  판매자 매너 평가 화면으로 이동합니다...
                </p>
              </div>
            )}
            
            {!confirmed && (
              <>
                <div
                  className="flex items-start gap-3 p-4 rounded-2xl"
                  style={{background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)'}}
                >
                  <MessageCircle size={15} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
                  <div>
                    <p className="text-sm font-semibold" style={{color: 'var(--color-info)'}}>
                      직거래 진행 중
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                      채팅으로 최종 거래 내용을 확인한 뒤 거래 완료를 진행해 주세요.
                    </p>
                  </div>
                </div>
                
                {showWarning && (
                  <div
                    className="flex items-start gap-2 px-4 py-3 rounded-xl"
                    style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.25)'}}
                  >
                    <AlertCircle size={14} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 1}}/>
                    <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                      거래 완료 후에는 취소할 수 없습니다. 직거래가 끝났다면 판매자 매너 평가로 이어집니다.
                    </p>
                  </div>
                )}
                
                {confirmError && (
                  <div
                    className="flex items-start gap-2 px-4 py-3 rounded-xl"
                    style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
                  >
                    <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
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
                  className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{background: 'var(--color-accent)'}}
                >
                  {confirming
                    ? <><Loader2 size={17} className="animate-spin"/>완료 처리 중...</>
                    : showWarning
                      ? <><CheckCircle2 size={17}/>네, 거래를 완료합니다</>
                      : <><CheckCircle2 size={17}/>거래 완료하기</>}
                </button>
                
                {showWarning && (
                  <button
                    onClick={() => setShowWarning(false)}
                    className="w-full py-3 rounded-xl font-medium text-sm transition-colors"
                    style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}
                  >
                    돌아가기
                  </button>
                )}
              </>
            )}
          </div>
        )
      }
      
      return (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <MessageCircle size={16} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-success)'}}>
              직거래 진행 중
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
              구매자가 거래 완료를 누르기 전까지는 거래 취소가 가능합니다.
            </p>
          </div>
        </div>
      )
    }
    
    if (isBuyer) {
      return (
        <div className="flex flex-col gap-3">
          {/* 배송 추적 패널 — 확정 여부 관계없이 항상 표시 */}
          <DeliveryTrackingPanel tradeId={trade.tradeId} courierCode={trade.courierCode}
                                 trackingNumber={trade.trackingNumber}/>
          {confirmed && (
            <div
              className="flex flex-col items-center gap-3 py-7 rounded-2xl"
              style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
            >
              <CheckCircle2 size={32} style={{color: 'var(--color-success)'}}/>
              <p
                className="font-bold text-base"
                style={{color: 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif"}}
              >
                구매 확정 완료!
              </p>
              <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                매너 평가 페이지로 이동합니다...
              </p>
            </div>
          )}
          
          {!confirmed && (
            <>
              {showWarning && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl"
                  style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.25)'}}
                >
                  <AlertCircle size={14} style={{color: 'var(--color-warning)', flexShrink: 0, marginTop: 1}}/>
                  <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                    구매 확정 후에는 취소가 불가합니다. 상품을 꼭 확인 후 진행해주세요.
                  </p>
                </div>
              )}
              {confirmError && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl"
                  style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
                >
                  <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
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
                className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{background: 'var(--color-accent)'}}
              >
                {confirming
                  ? <><Loader2 size={17} className="animate-spin"/>확정 처리 중...</>
                  : showWarning
                    ? <><CheckCircle2 size={17}/>네, 구매 확정합니다</>
                    : <><Star size={17}/>구매 확정하기</>}
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
    
    return (
      <div className="flex flex-col gap-3">
        {/* 판매자도 배송 추적 상태 확인 가능 */}
        <DeliveryTrackingPanel tradeId={trade.tradeId} courierCode={trade.courierCode}
                               trackingNumber={trade.trackingNumber}/>
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
        >
          <Truck size={15} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-sm font-semibold" style={{color: 'var(--color-success)'}}>
              {trade.status === 'RECEIVED' ? '수령 완료 — 구매 확정 대기' : '배송 중'}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-sub)'}}>
              구매자가 구매 확정 시 대금이 정산됩니다.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return null
}

// ── 인라인 채팅 패널 ──────────────────────────────────────────────────────────

/**
 * EmbeddedChatInner — STOMP 연결 후 실시간 메시지 UI
 * chatId가 확정된 이후에만 마운트됨 (key={chatId} 보장)
 */
function EmbeddedChatInner({
                             chatId,
                             myMemberId,
                             initialMessages,
                           }: {
  chatId: number
  myMemberId: number
  initialMessages: ChatMessage[]
}) {
  const {messages, sendMessage, markRead, connected} = useStompChat({
    chatId,
    myMemberId,
    initialMessages,
  })
  
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  
  // 새 메시지 도착 시 하단 스크롤 + 읽음 처리
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'})
    if (connected && messages.length > 0) markRead()
  }, [messages, connected, markRead])
  
  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || !connected) return
    sendMessage(trimmed)
    setInput('')
  }
  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 연결 상태 배너 */}
      {!connected && (
        <div
          className="px-4 py-1.5 text-xs text-center flex items-center justify-center gap-1.5 flex-shrink-0"
          style={{background: 'rgba(255,149,0,.08)', color: 'var(--color-warning)'}}
        >
          <Loader2 size={11} className="animate-spin"/>
          서버에 연결 중...
        </div>
      )}
      
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <MessageCircle size={28} style={{color: 'var(--color-border)', marginBottom: 8}}/>
            <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>
              아직 대화가 없습니다
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-hint)'}}>
              거래 관련 내용을 자유롭게 나눠보세요
            </p>
          </div>
        )}
        
        {messages.map(msg => {
          const isMe = msg.senderId === myMemberId
          const isSystem = msg.type === 'SYSTEM'
          const displayContent = getDisplayChatMessageContent(msg)
          const isMaskedHighRisk = shouldMaskChatMessageContent(msg)
          
          if (isSystem) {
            return (
              <div key={msg.messageId} className="flex justify-center">
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-hint)',
                  }}
                >
                  {msg.content}
                </span>
              </div>
            )
          }
          
          return (
            <div
              key={msg.messageId}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: isMe ? 'var(--color-primary)' : 'var(--color-gold)',
                  color: isMe ? '#fff' : 'var(--color-primary)',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: isMe ? undefined : 4,
                  opacity: msg.messageId < 0 ? 0.6 : 1, // 낙관적 메시지
                }}
              >
                {displayContent}
              </div>
              
              {/* AI 위험 탐지 경고 배너 */}
              {msg.moderation && msg.moderation.riskLevel !== 'LOW' && (() => {
                const isHigh = msg.moderation!.riskLevel === 'HIGH'
                const text = isHigh && isMaskedHighRisk
                  ? '유해성이 높은 내용이 감지되어 메시지 본문을 마스킹했습니다.'
                  : (msg.moderation!.suggestion ?? msg.moderation!.reason ?? '주의가 필요한 메시지입니다.')
                return (
                  <div
                    className="mt-1 max-w-[82%] flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl"
                    style={{
                      background: isHigh ? 'rgba(255,46,77,.08)' : 'rgba(255,149,0,.08)',
                      border: `1px solid ${isHigh ? 'rgba(255,46,77,.2)' : 'rgba(255,149,0,.2)'}`,
                    }}
                  >
                    <AlertTriangle
                      size={11}
                      style={{
                        color: isHigh ? 'var(--color-accent)' : 'var(--color-warning)',
                        flexShrink: 0, marginTop: 1,
                      }}
                    />
                    <p
                      className="text-[11px] leading-snug"
                      style={{color: isHigh ? 'var(--color-accent)' : 'var(--color-warning)'}}
                    >
                      {text}
                    </p>
                  </div>
                )
              })()}
              
              <span
                className="text-[10px] mt-0.5 px-1"
                style={{color: 'var(--color-text-hint)'}}
              >
                {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>
      
      {/* 입력창 */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 py-3"
        style={{borderTop: '1px solid var(--color-border)'}}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력..."
          disabled={!connected}
          className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
          style={{background: 'var(--color-primary)'}}
        >
          <Send size={15} style={{color: '#fff'}}/>
        </button>
      </div>
    </div>
  )
}

/**
 * EmbeddedChatPanel — 채팅방 조회 후 Inner 마운트
 * - getChatRooms() → postId 매칭으로 채팅방 찾기
 * - 없으면 createChatRoom() 호출
 */
function EmbeddedChatPanel({
                             postId,
                             myMemberId,
                             opponentName,
                             isBuyer,
                           }: {
  postId: number
  myMemberId: number
  opponentName: string
  isBuyer: boolean  // 판매자는 채팅방 생성 불가 (본인 판매글 채팅 금지)
}) {
  // 1. 내 채팅방 목록 조회
  const {data: rooms, isLoading: roomsLoading} = useQuery({
    queryKey: ['chatRooms'],
    queryFn: getChatRooms,
    staleTime: 30_000,
  })
  
  // 2. postId로 해당 채팅방 찾기
  const matchedRoom = rooms?.find(r => r.post.postId === postId)
  
  // 3. 채팅방이 없으면 createChatRoom — 구매자만 생성 가능
  // 판매자는 본인 판매글에 채팅 생성 불가 (백엔드 400 방지)
  const {data: createdRoom, isLoading: creating} = useQuery({
    queryKey: ['create-chat', postId],
    queryFn: () => createChatRoom({postId}),
    enabled: !roomsLoading && !matchedRoom && isBuyer,
    staleTime: Infinity,
    retry: false,
  })
  
  const chatId = matchedRoom?.chatId ?? createdRoom?.chatId ?? null
  
  // 4. 초기 메시지 조회
  const {data: msgPage, isLoading: msgsLoading} = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => getMessages(chatId!, 0, 50),
    enabled: chatId !== null,
    staleTime: 60_000,
  })
  
  const initialMessages: ChatMessage[] = useMemo(
    () =>
      [...(msgPage?.content ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [msgPage],
  )
  
  const isLoading = roomsLoading || creating || msgsLoading
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 size={22} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>
          채팅을 불러오는 중...
        </p>
      </div>
    )
  }
  
  if (!chatId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <MessageCircle size={28} style={{color: 'var(--color-border)'}}/>
        <p className="text-sm font-semibold" style={{color: 'var(--color-text-sub)'}}>
          채팅을 시작하려면 판매글에서<br/>{opponentName}님께 메시지를 보내세요.
        </p>
        <Link
          to="/chat"
          className="text-xs font-semibold px-4 py-2 rounded-xl hover:text-white transition-colors"
          style={{background: 'var(--color-primary)', color: '#fff'}}
        >
          채팅 목록으로 이동
        </Link>
      </div>
    )
  }
  
  return (
    <EmbeddedChatInner
      key={chatId}
      chatId={chatId}
      myMemberId={myMemberId}
      initialMessages={initialMessages}
    />
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function TradePage() {
  const {id} = useParams<{ id: string }>()
  const tradeId = Number(id)
  const {user} = useAuthStore()
  
  // 모바일 탭 상태 ('trade' | 'chat')
  const [tab, setTab] = useState<'trade' | 'chat'>('trade')
  
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
  
  useStompTradeRealtime({tradeId: Number.isNaN(tradeId) ? null : tradeId})
  
  // 구매자/판매자 판별
  const isBuyer = trade ? user?.id === trade.buyer.memberId : true
  const myMemberId = user?.id ?? 0
  const opponentName = trade
    ? (isBuyer ? trade.seller.nickname : trade.buyer.nickname)
    : ''
  
  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={26} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
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
          <AlertCircle size={30} style={{color: 'var(--color-accent)', margin: '0 auto'}}/>
          <p className="font-bold" style={{color: 'var(--color-text-main)'}}>
            거래 정보를 불러올 수 없습니다.
          </p>
          <Link
            to="/mypage"
            className="text-sm font-semibold hover:text-[var(--color-accent)]"
            style={{color: 'var(--color-text-sub)'}}
          >
            마이페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }
  
  const statusMeta = getStatusMeta(trade.status, trade.deliveryType)
  
  // ── 거래 정보 패널 JSX (좌측 / 모바일 거래현황 탭) ─────────────────────────
  const tradePanelContent = (
    <div className="flex flex-col gap-4">
      {/* 상품 카드 */}
      <div
        className="rounded-2xl p-5"
        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
      >
        <TradeProductCard trade={trade}/>
        <div className="mt-5 mb-2">
          <TradeTimeline status={trade.status} deliveryType={trade.deliveryType}/>
        </div>
        <ShippingInfo trade={trade}/>
      </div>
      
      {/* 거래 방식별 안내 배너 (CANCELED/COMPLETED 제외) */}
      {trade.status !== 'CANCELED' && trade.status !== 'COMPLETED' && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{
            background: trade.deliveryType === 'DIRECT' ? 'rgba(14,165,233,.06)' : 'rgba(0,33,71,.05)',
            border: trade.deliveryType === 'DIRECT'
              ? '1px solid rgba(14,165,233,.2)'
              : '1px solid rgba(0,33,71,.1)',
          }}
        >
          {trade.deliveryType === 'DIRECT' ? (
            <MessageCircle size={16} style={{color: 'var(--color-info)', flexShrink: 0, marginTop: 2}}/>
          ) : (
            <ShieldCheck size={16} style={{color: 'var(--color-primary)', flexShrink: 0, marginTop: 2}}/>
          )}
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{color: 'var(--color-text-main)'}}>
              {trade.deliveryType === 'DIRECT' ? '직거래 진행 안내' : '안전결제 보호 중'}
            </p>
            <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
              {trade.deliveryType === 'DIRECT'
                ? '판매자와 장소, 시간, 상품 상태를 충분히 확인한 뒤 직거래를 진행해 주세요.'
                : `${formatPrice(trade.tradePrice)}이 RE:FORM에 안전하게 보관되어 있습니다. 구매 확정 시 판매자에게 즉시 지급됩니다.`}
            </p>
          </div>
        </div>
      )}
      
      {/* 상태별 액션 패널 */}
      <ActionPanel trade={trade} isBuyer={isBuyer} onRefetch={() => refetch()}/>
      
      {/* 문제 발생 시 분쟁 신청 (배송 중/수령 완료일 때만) */}
      {(trade.status === 'IN_PROGRESS' || trade.status === 'RECEIVED') && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'rgba(255,46,77,.04)', border: '1px solid rgba(255,46,77,.14)'}}
        >
          <AlertCircle size={15} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
          <div>
            <p className="text-sm font-semibold mb-1" style={{color: 'var(--color-accent)'}}>
              상품에 문제가 있나요?
            </p>
            <p className="text-xs leading-relaxed mb-2" style={{color: 'var(--color-text-sub)'}}>
              상품 미수령, 허위 매물 등 문제가 발생했다면 분쟁을 신청해주세요.
            </p>
            <button
              className="text-xs font-semibold underline"
              style={{color: 'var(--color-accent)'}}
              onClick={() => setTab('chat')}
            >
              채팅으로 이의 제기하기
            </button>
          </div>
        </div>
      )}
      
      {/* 배송지 정보 (DELIVERY 거래일 때) */}
      {trade.deliveryType === 'DELIVERY' && trade.deliveryAddress && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          <MapPin size={15} style={{color: 'var(--color-text-hint)', flexShrink: 0, marginTop: 2}}/>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{color: 'var(--color-text-hint)'}}>
              배송지
            </p>
            <p className="text-sm" style={{color: 'var(--color-text-main)'}}>
              {trade.deliveryAddress}
            </p>
          </div>
        </div>
      )}
    </div>
  )
  
  // ── 채팅 패널 JSX (우측 / 모바일 채팅 탭) ─────────────────────────────────
  const chatPanelContent = (
    <EmbeddedChatPanel
      postId={trade.post.postId}
      myMemberId={myMemberId}
      opponentName={opponentName}
      isBuyer={isBuyer}
    />
  )
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[1100px] mx-auto px-4 md:px-7 py-6 md:py-8">
        
        {/* 뒤로가기 */}
        <Link
          to="/mypage"
          className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          <ChevronLeft size={15}/>마이페이지
        </Link>
        
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold leading-none mb-1"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em',
              }}
            >
              TRADE STATUS
            </h1>
            <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
              {isBuyer ? '내가 구매한 거래입니다.' : '내가 판매 중인 거래입니다.'}
            </p>
          </div>
          {/* 상태 배지 */}
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
            style={{
              background: statusMeta.bg,
              color: statusMeta.color,
              fontFamily: "'Giants','Pretendard',sans-serif",
            }}
          >
            {statusMeta.label}
          </span>
        </div>
        
        {/* ── 데스크탑 2컬럼 레이아웃 (md 이상) ────────────────────────────── */}
        <div className="hidden md:grid gap-6" style={{gridTemplateColumns: '1fr 380px'}}>
          {/* 왼쪽: 거래 정보 */}
          <div>{tradePanelContent}</div>
          
          {/* 오른쪽: 채팅 패널 (고정 높이 + 스크롤) */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              height: '70vh',
              maxHeight: 720,
              position: 'sticky',
              top: 88,
            }}
          >
            {/* 채팅 헤더 */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
              style={{borderBottom: '1px solid var(--color-border)'}}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{
                  background: 'var(--color-primary)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {opponentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{color: 'var(--color-text-main)'}}>
                  {opponentName}
                </p>
                <p className="text-[11px]" style={{color: 'var(--color-text-hint)'}}>
                  {isBuyer ? '판매자' : '구매자'}
                </p>
              </div>
              <MessageCircle size={14} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
            </div>
            
            {/* 채팅 본문 */}
            <div className="flex-1 min-h-0">
              {chatPanelContent}
            </div>
          </div>
        </div>
        
        {/* ── 모바일 탭 레이아웃 (md 미만) ──────────────────────────────────── */}
        <div className="md:hidden">
          {/* 탭 바 */}
          <div
            className="flex rounded-xl overflow-hidden mb-5"
            style={{background: 'var(--color-surface-raised)'}}
          >
            {([
              {key: 'trade', label: '거래 현황'},
              {key: 'chat', label: `채팅 — ${opponentName}`},
            ] as const).map(({key, label}) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 py-3 text-sm font-bold transition-all"
                style={{
                  background: tab === key ? 'var(--color-primary)' : 'transparent',
                  color: tab === key ? '#fff' : 'var(--color-text-sub)',
                  borderRadius: 10,
                  fontFamily: "'Giants','Pretendard',sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* 탭 내용 */}
          {tab === 'trade' ? tradePanelContent : (
            <div
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                height: '65vh',
              }}
            >
              {chatPanelContent}
            </div>
          )}
        </div>
      
      </div>
    </div>
  )
}
