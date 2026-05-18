/**
 * PaymentPage — 결제 (Screen 6)
 *
 * 플로우:
 *   1. 페이지 진입 → getTrade(tradeId)로 거래 정보 조회
 *   2. Toss Payment Widget 로드 및 렌더링
 *   3. 결제하기 클릭 → POST /payments/init (tradeId + payMethod) → tossOrderId 발급
 *   4. widget.requestPayment({orderId: tossOrderId, ...}) → Toss 결제창 오픈
 *   5. 성공 시 /payment/success?paymentKey=...&orderId=...&amount=... 리다이렉트
 *   6. PaymentSuccessPage에서 POST /payments/confirm → 최종 승인
 *
 * 백엔드 연동:
 *   - GET  /api/trades/{id}       — 거래 정보 (TradeResponse)
 *   - POST /api/payments/init     — 결제 초기화 → tossOrderId 발급
 *   - POST /api/payments/confirm  — 결제 최종 승인 (PaymentSuccessPage에서 처리)
 */
import {useEffect, useRef, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {ANONYMOUS, loadPaymentWidget, type PaymentWidgetInstance} from '@tosspayments/payment-widget-sdk'
import {AlertCircle, ChevronLeft, Loader2, Lock, Shield, User} from 'lucide-react'
import {useInitPayment} from '../../features/payment/hooks/usePayment'
import {getTrade, type TradeResponse} from '../../features/trade/api/tradeApi'
import {formatPrice} from '../../utils/format'
import {resolveImageUrl} from '../../utils/image'
import useAuthStore from '../../store/authStore'

// ── 상수 ─────────────────────────────────────────────────────────────────────
// Toss 클라이언트 키 — 프론트 .env의 VITE_TOSS_CLIENT_KEY 에서 로드
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string

// 폴백 유니폼 색상 (썸네일 없을 때 사용)
const JERSEY_COLORS = [
  '#B5222B', '#1A3051', '#034694', '#1A7A40', '#A50044',
  '#6B0078', '#C8102E', '#003087', '#002147', '#E3001B',
]

function fallbackColor(id: number) {
  return JERSEY_COLORS[id % JERSEY_COLORS.length]
}

// ── 로딩 상태 ─────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>거래 정보를 불러오는 중...</p>
      </div>
    </div>
  )
}

// ── 에러 상태 ─────────────────────────────────────────────────────────────────
function ErrorState({id}: { id?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
      <div className="text-center space-y-3">
        <AlertCircle size={32} style={{color: 'var(--color-accent)', margin: '0 auto'}}/>
        <p className="font-medium" style={{color: 'var(--color-text-main)'}}>
          거래 정보를 불러올 수 없습니다.
        </p>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>
          결제 링크가 올바른지 확인해주세요.
        </p>
        <Link
          to={id ? `/trade/${id}/confirm` : '/'}
          className="inline-block mt-2 text-sm font-semibold no-underline hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          거래 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}

// ── 주문 요약 카드 ────────────────────────────────────────────────────────────
/**
 * 거래 응답(TradeResponse) 기반 주문 요약 카드
 * 수수료 breakdown: 상품가 + 수수료 3% = 최종 결제액
 */
function OrderSummaryCard({trade}: { trade: TradeResponse }) {
  // 구매자는 거래가 그대로 결제 — 플랫폼 수수료(3%)는 판매자 정산 시 차감
  const sellerFee = Math.round(trade.tradePrice * 0.03)
  const sellerReceives = trade.tradePrice - sellerFee
  
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      {/* 상품 정보 */}
      <div className="p-5 flex gap-4">
        {/* 썸네일 — 실제 이미지 우선, 없으면 색상 폴백 */}
        <div
          className="relative rounded-xl overflow-hidden flex-shrink-0"
          style={{width: 72, height: 72, background: fallbackColor(trade.post.postId)}}
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
              {/* 스트라이프 장식 */}
              <div
                className="absolute inset-0"
                style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)'}}
              />
              {/* 번호 폴백 */}
              <span
                className="absolute inset-0 flex items-center justify-center select-none"
                style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 26, color: 'rgba(255,255,255,.25)'}}
              >
                {trade.post.postId % 99}
              </span>
            </>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* 상품명 */}
          <p
            className="text-sm font-semibold line-clamp-2 mb-2"
            style={{color: 'var(--color-text-main)'}}
          >
            {trade.post.title}
          </p>
          
          {/* 판매자 정보 */}
          <div className="flex items-center gap-1.5">
            {resolveImageUrl(trade.seller.profileImageUrl) ? (
              <img
                src={resolveImageUrl(trade.seller.profileImageUrl)!}
                alt={trade.seller.nickname}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{background: 'var(--color-surface-raised)'}}
              >
                <User size={10} style={{color: 'var(--color-text-hint)'}}/>
              </div>
            )}
            <p className="text-xs" style={{color: 'var(--color-text-sub)'}}>
              판매자 {trade.seller.nickname}
            </p>
          </div>
        </div>
      </div>
      
      {/* 금액 Breakdown */}
      <div style={{borderTop: '1px solid var(--color-border)'}} className="px-5 py-4 space-y-2">
        <div
          className="flex justify-between pt-1"
        >
          <span className="font-bold"
                style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
            결제 금액
          </span>
          <span
            className="text-lg font-bold"
            style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-primary)'}}
          >
            {formatPrice(trade.tradePrice)}
          </span>
        </div>
        {/* 판매자 정산 안내: 수수료 3%는 관리자가 정산 시 차감 */}
        <div className="flex justify-between text-xs" style={{color: 'var(--color-text-hint)'}}>
          <span>판매자 정산액 (수수료 3% 차감)</span>
          <span style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
            {formatPrice(sellerReceives)}
          </span>
        </div>
      </div>
      
      {/* 에스크로 안내 */}
      <div
        className="px-5 py-3 flex items-start gap-2"
        style={{background: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-border)'}}
      >
        <Shield size={14} style={{color: 'var(--color-success)', flexShrink: 0, marginTop: 2}}/>
        <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
          RE:FORM 에스크로 안전결제 — 구매 확정 전까지 결제금은 RE:FORM이 보관합니다.
        </p>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const {id} = useParams<{ id: string }>()
  const {user} = useAuthStore()
  
  // ── 거래 정보 조회 ──────────────────────────────────────────────────────────
  const {
    data: trade,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trade', id],
    queryFn: () => getTrade(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
    staleTime: 60_000, // 결제 페이지에서 1분간 재조회 없음
  })
  
  // ── Toss Widget 인스턴스 ref ─────────────────────────────────────────────────
  const widgetRef = useRef<PaymentWidgetInstance | null>(null)
  const paymentMethodsRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null)
  
  // ── UI 상태 ──────────────────────────────────────────────────────────────────
  const [widgetReady, setWidgetReady] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  
  // ── 결제 초기화 mutation ─────────────────────────────────────────────────────
  const {mutate: initPayment, isPending: isInitPending} = useInitPayment()
  
  // Toss customerKey: 로그인한 회원이면 memberId 사용, 아니면 ANONYMOUS
  // ANONYMOUS 는 Toss SDK 상수 ("@@ANONYMOUS") — 일반 문자열 'ANONYMOUS' 사용 시 customerKey 검증 실패
  const customerKey = user?.id ? `member_${user.id}` : ANONYMOUS
  
  // ── Toss Widget 초기화 ──────────────────────────────────────────────────────
  // trade 데이터 로드 완료 후 위젯 초기화 (total이 확정돼야 위젯 렌더링 가능)
  useEffect(() => {
    if (!trade) return
    // async 클로저에서 타입 narrowing 유지를 위해 로컬 변수로 캡처
    const currentTrade = trade
    let cancelled = false
    
    async function loadWidget() {
      try {
        // 1) SDK 로드 (클라이언트 키 + 고객 키)
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, customerKey)
        if (cancelled) return
        
        widgetRef.current = widget
        
        // 2) 결제 수단 위젯 렌더링 (#toss-payment-method div에 주입)
        paymentMethodsRef.current = widget.renderPaymentMethods(
          '#toss-payment-method',
          {value: currentTrade.tradePrice, currency: 'KRW'},
        )
        
        // 3) 약관 위젯 렌더링
        widget.renderAgreement('#toss-agreement')
        
        setWidgetReady(true)
      } catch (err) {
        if (cancelled) return
        console.error('Toss Widget 로드 실패:', err)
        setWidgetError('결제 위젯을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      }
    }
    
    loadWidget()
    return () => {
      cancelled = true
    }
  }, [trade, customerKey])
  
  // ── 금액 변경 시 위젯 업데이트 (쿠폰/할인 적용 등) ──────────────────────────
  useEffect(() => {
    if (trade) paymentMethodsRef.current?.updateAmount(trade.tradePrice)
  }, [trade])
  
  // ── 결제하기 버튼 핸들러 ────────────────────────────────────────────────────
  function handlePay() {
    if (!widgetRef.current || !widgetReady || !trade) return
    
    // 1) 백엔드에 결제 초기화 요청 → tossOrderId 발급
    initPayment(
      {tradeId: trade.tradeId, payMethod: 'Card'},
      {
        async onSuccess(data) {
          // 2) Toss Widget으로 결제 요청 (Promise → await 필수)
          //    성공 → successUrl, 실패 → failUrl로 리다이렉트
          try {
            await widgetRef.current?.requestPayment({
              orderId: data.tossOrderId,
              orderName: data.orderName,
              // authStore에서 닉네임 가져오기 (없으면 기본값)
              customerName: user?.nickname ?? 'RE:FORM 구매자',
              successUrl: `${window.location.origin}/payment/success`,
              failUrl: `${window.location.origin}/payment/fail`,
            })
          } catch (err) {
            // Toss 결제창 오픈/진행 중 에러 (위젯 미렌더링, 사용자 취소 등)
            const msg = err instanceof Error ? err.message : String(err)
            console.error('Toss 결제창 에러:', msg)
            // 사용자가 직접 닫은 경우(취소) 는 에러로 표시하지 않음
            if (!msg.includes('사용자가')) {
              setWidgetError('결제창을 열 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.')
            }
          }
        },
        onError(error) {
          console.error('결제 초기화 실패:', error)
          setWidgetError('결제를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.')
        },
      },
    )
  }
  
  // ── 로딩 / 에러 상태 처리 ───────────────────────────────────────────────────
  if (isLoading) return <LoadingState/>
  if (isError || !trade) return <ErrorState id={id}/>
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[1000px] mx-auto px-4 md:px-7 py-6 md:py-10">
        
        {/* 페이지 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/listing/${trade.post.postId}`}
            className="p-2 rounded-xl transition-colors hover:text-[var(--color-accent)]"
            style={{
              color: 'var(--color-text-sub)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)'
            }}
          >
            <ChevronLeft size={18}/>
          </Link>
          <div>
            <h1
              className="text-xl font-bold"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              PAYMENT
            </h1>
            <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>에스크로 안전결제</p>
          </div>
        </div>
        
        {/* 2열 레이아웃: 좌(Toss Widget) + 우(주문 요약) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          
          {/* 왼쪽: Toss Payment Widget */}
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="px-5 pt-5 pb-2">
                <h2
                  className="font-bold text-sm mb-4"
                  style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}
                >
                  결제 수단
                </h2>
                
                {/* 위젯 로딩 스피너 */}
                {!widgetReady && !widgetError && (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <Loader2 size={20} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
                    <span className="text-sm" style={{color: 'var(--color-text-hint)'}}>결제 수단을 불러오는 중...</span>
                  </div>
                )}
                
                {/* 위젯 에러 메시지 */}
                {widgetError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl mb-4"
                    style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
                  >
                    <AlertCircle size={15} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 1}}/>
                    <p className="text-sm" style={{color: 'var(--color-accent)'}}>{widgetError}</p>
                  </div>
                )}
                
                {/* Toss Widget 결제 수단 마운트 포인트 */}
                <div id="toss-payment-method"/>
              </div>
              
              {/* Toss Widget 약관 마운트 포인트 */}
              <div id="toss-agreement" className="px-5 pb-4"/>
            </div>
          </div>
          
          {/* 오른쪽: 주문 요약 + 결제 버튼 */}
          <div className="space-y-4">
            {/* 거래 기반 주문 요약 카드 */}
            <OrderSummaryCard trade={trade}/>
            
            {/* 결제하기 버튼 */}
            <button
              onClick={handlePay}
              disabled={!widgetReady || isInitPending}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{background: 'var(--color-accent)', boxShadow: '0 4px 16px rgba(255,46,77,.35)'}}
            >
              {isInitPending ? (
                <>
                  <Loader2 size={18} className="animate-spin"/>
                  결제 준비 중...
                </>
              ) : (
                <>
                  <Lock size={16}/>
                  {formatPrice(trade.tradePrice)} 결제하기
                </>
              )}
            </button>
            
            {/* 결제 동의 안내 */}
            <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
              결제 시 RE:FORM 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
