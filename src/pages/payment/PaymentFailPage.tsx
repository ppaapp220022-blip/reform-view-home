/**
 * PaymentFailPage — 결제 실패 콜백 처리 페이지
 *
 * Toss 결제 실패/취소 후 failUrl로 리다이렉트되면 이 페이지 진입.
 * URL 쿼리파라미터: code (에러 코드), message (에러 메시지), orderId
 */
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { XCircle, RotateCcw, Home } from 'lucide-react'

// Toss 에러 코드 → 한국어 메시지 매핑
const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제가 취소되었습니다.',
  PAY_PROCESS_ABORTED: '결제 처리 중 오류가 발생했습니다.',
  REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다.',
  INVALID_CARD_NUMBER: '카드 번호가 올바르지 않습니다.',
  CARD_QUOTA_EXCEEDED: '카드 한도를 초과했습니다.',
  INSUFFICIENT_BALANCE: '잔액이 부족합니다.',
  EXCEED_MAX_AMOUNT: '결제 한도를 초과했습니다.',
}

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const code    = searchParams.get('code') ?? ''
  const message = searchParams.get('message') ?? '알 수 없는 오류가 발생했습니다.'
  const orderId = searchParams.get('orderId') ?? ''

  // 코드에 매핑된 메시지가 있으면 사용, 없으면 Toss가 보낸 message 사용
  const displayMessage = ERROR_MESSAGES[code] ?? message

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center space-y-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* 아이콘 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(255,46,77,.1)' }}
        >
          <XCircle size={44} style={{ color: 'var(--color-accent)' }} />
        </div>

        {/* 타이틀 */}
        <div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
          >
            PAYMENT FAILED
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
            {displayMessage}
          </p>
        </div>

        {/* 에러 상세 (개발/디버깅용) */}
        {(code || orderId) && (
          <div
            className="rounded-xl p-3 text-left space-y-1"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            {code && (
              <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                에러 코드: <span style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>{code}</span>
              </p>
            )}
            {orderId && (
              <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                주문 번호: {orderId}
              </p>
            )}
          </div>
        )}

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-2)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            <RotateCcw size={15} />
            다시 결제하기
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm hover:text-[var(--color-accent)]"
            style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
          >
            <Home size={15} />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
