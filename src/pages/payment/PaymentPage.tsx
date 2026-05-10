/**
 * PaymentPage — 결제 (Screen 6)
 *
 * 플로우:
 *   1. 페이지 진입 → useEffect에서 Toss Payment Widget 로드 및 렌더링
 *   2. 결제하기 클릭 → POST /api/payments/init (tradeId + payMethod) → tossOrderId 발급
 *   3. widget.requestPayment({orderId: tossOrderId, successUrl, failUrl}) → Toss 결제창 오픈
 *   4. 성공 시 /payment/success?paymentKey=...&orderId=...&amount=... 리다이렉트
 *   5. PaymentSuccessPage에서 POST /api/payments/confirm → 최종 승인
 *
 * 주의: Toss Widget은 renderPaymentMethods() 호출 후 requestPayment() 가능
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk'
import { Shield, ChevronLeft, Loader2, Lock, AlertCircle } from 'lucide-react'
import { useInitPayment } from '../../features/payment/hooks/usePayment'
import { formatPrice } from '../../utils/format'

// ── 상수 — Toss 테스트 키 ───────────────────────────────────────────────────────
// 실서비스 전환 시 환경변수로 교체 (VITE_TOSS_CLIENT_KEY)
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm'
const TOSS_CUSTOMER_KEY = 'ANONYMOUS' // 비로그인 결제 허용 (로그인 구현 후 memberId로 교체)

// ── 목 주문 데이터 (추후 useQuery로 교체) ────────────────────────────────────────
interface OrderSummary {
  tradeId: number
  title: string
  team: string
  grade: 'S' | 'A' | 'B' | 'C'
  size: string
  price: number
  jerseyColor: string
  jerseyNumber: string
  sellerNickname: string
  sellerMannerScore: number
}

const MOCK_ORDER: OrderSummary = {
  tradeId: 1,
  title: '맨체스터 유나이티드 23/24 홈 어센틱',
  team: '맨체스터 유나이티드',
  grade: 'S',
  size: 'M',
  price: 78000,
  jerseyColor: '#B5222B',
  jerseyNumber: '7',
  sellerNickname: 'uniform_king',
  sellerMannerScore: 92,
}

const FEE_RATE = 0.03 // 수수료 3%

const GRADE_META = {
  S: { label: 'S급', bg: 'rgba(255,184,0,.12)', text: '#B38000', border: 'rgba(255,184,0,.35)' },
  A: { label: 'A급', bg: 'rgba(0,33,71,.08)',   text: '#002147', border: 'rgba(0,33,71,.25)' },
  B: { label: 'B급', bg: 'rgba(90,106,122,.1)', text: '#5A6A7A', border: 'rgba(90,106,122,.3)' },
  C: { label: 'C급', bg: 'rgba(255,149,0,.10)', text: '#CC7700', border: 'rgba(255,149,0,.3)' },
} as const

// ── 서브 컴포넌트: 주문 요약 ────────────────────────────────────────────────────
function OrderSummaryCard({ order }: { order: OrderSummary }) {
  const gm = GRADE_META[order.grade]
  const fee = Math.round(order.price * FEE_RATE)
  const total = order.price + fee

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* 상품 정보 */}
      <div className="p-5 flex gap-4">
        {/* 유니폼 썸네일 */}
        <div
          className="relative rounded-xl overflow-hidden flex-shrink-0"
          style={{ width: 72, height: 72, background: order.jerseyColor }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)' }}
          />
          <span
            className="absolute inset-0 flex items-center justify-center select-none"
            style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 26, color: 'rgba(255,255,255,.25)' }}
          >
            {order.jerseyNumber}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: gm.bg, color: gm.text, border: `1px solid ${gm.border}`, fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
            >
              {gm.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-hint)' }}>{order.size}</span>
          </div>
          <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--color-text-main)' }}>
            {order.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
            판매자 {order.sellerNickname} · 매너점수 {order.sellerMannerScore}
          </p>
        </div>
      </div>

      {/* 금액 breakdown */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} className="px-5 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-sub)' }}>상품 가격</span>
          <span style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-text-main)' }}>
            {formatPrice(order.price)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-sub)' }}>수수료 (3%)</span>
          <span style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-text-sub)' }}>
            {formatPrice(fee)}
          </span>
        </div>
        <div
          className="flex justify-between pt-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <span className="font-bold" style={{ color: 'var(--color-text-main)' }}>최종 결제액</span>
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-primary)' }}
          >
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* 에스크로 안내 */}
      <div
        className="px-5 py-3 flex items-start gap-2"
        style={{ background: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-border)' }}
      >
        <Shield size={14} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
          RE:FORM 에스크로 안전결제 — 구매 확정 전까지 결제금은 RE:FORM이 보관합니다.
        </p>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const { id } = useParams<{ id: string }>()

  // 목 주문 데이터 (추후 useQuery로 교체)
  const order = MOCK_ORDER

  // Toss Widget 인스턴스 ref
  const widgetRef = useRef<PaymentWidgetInstance | null>(null)
  const paymentMethodsRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null)

  // UI 상태
  const [widgetReady, setWidgetReady] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)

  // 결제 초기화 mutation
  const { mutate: initPayment, isPending: isInitPending } = useInitPayment()

  const fee = Math.round(order.price * FEE_RATE)
  const total = order.price + fee

  // ── Toss Widget 초기화 ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadWidget() {
      try {
        // 1) SDK 로드
        const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, TOSS_CUSTOMER_KEY)
        if (cancelled) return

        widgetRef.current = widget

        // 2) 결제 수단 위젯 렌더링 (#toss-payment-method div에 주입)
        paymentMethodsRef.current = widget.renderPaymentMethods(
          '#toss-payment-method',
          { value: total, currency: 'KRW' },
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
    return () => { cancelled = true }
  }, [total])

  // ── 결제 금액 업데이트 (쿠폰/할인 적용 시 사용) ─────────────────────────────
  useEffect(() => {
    paymentMethodsRef.current?.updateAmount(total)
  }, [total])

  // ── 결제하기 버튼 핸들러 ────────────────────────────────────────────────────
  function handlePay() {
    if (!widgetRef.current || !widgetReady) return

    // 1) 백엔드에 결제 초기화 요청 → tossOrderId 발급
    initPayment(
      { tradeId: order.tradeId, payMethod: 'Card' }, // Toss Widget은 내부적으로 수단 선택
      {
        onSuccess(data) {
          // 2) Toss Widget으로 결제 요청
          //    성공 시 successUrl, 실패 시 failUrl로 리다이렉트
          widgetRef.current?.requestPayment({
            orderId: data.tossOrderId,
            orderName: data.orderName,
            customerName: 'RE:FORM 구매자', // 추후 authStore에서 nickname 가져오기
            successUrl: `${window.location.origin}/payment/success`,
            failUrl: `${window.location.origin}/payment/fail`,
          })
        },
        onError(error) {
          console.error('결제 초기화 실패:', error)
          setWidgetError('결제를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.')
        },
      },
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[1000px] mx-auto px-4 md:px-7 py-6 md:py-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/listing/${id}`}
            className="p-2 rounded-xl transition-colors hover:text-[var(--color-accent)]"
            style={{ color: 'var(--color-text-sub)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
            >
              PAYMENT
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>에스크로 안전결제</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

          {/* 왼쪽: Toss Payment Widget */}
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="px-5 pt-5 pb-2">
                <h2 className="font-bold text-sm mb-4" style={{ color: 'var(--color-text-main)' }}>
                  결제 수단
                </h2>

                {/* 위젯 로딩 스피너 */}
                {!widgetReady && !widgetError && (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-hint)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text-hint)' }}>결제 수단을 불러오는 중...</span>
                  </div>
                )}

                {/* 위젯 에러 */}
                {widgetError && (
                  <div
                    className="flex items-start gap-2 p-3 rounded-xl mb-4"
                    style={{ background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)' }}
                  >
                    <AlertCircle size={15} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-sm" style={{ color: 'var(--color-accent)' }}>{widgetError}</p>
                  </div>
                )}

                {/* Toss Widget 결제 수단 마운트 포인트 */}
                <div id="toss-payment-method" />
              </div>

              {/* Toss Widget 약관 마운트 포인트 */}
              <div id="toss-agreement" className="px-5 pb-4" />
            </div>
          </div>

          {/* 오른쪽: 주문 요약 + 결제 버튼 */}
          <div className="space-y-4">
            <OrderSummaryCard order={order} />

            {/* 결제 버튼 */}
            <button
              onClick={handlePay}
              disabled={!widgetReady || isInitPending}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent)', boxShadow: '0 4px 16px rgba(255,46,77,.35)' }}
            >
              {isInitPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  결제 준비 중...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  {formatPrice(total)} 결제하기
                </>
              )}
            </button>

            {/* 안내 문구 */}
            <p className="text-xs text-center" style={{ color: 'var(--color-text-hint)' }}>
              결제 시 RE:FORM 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
