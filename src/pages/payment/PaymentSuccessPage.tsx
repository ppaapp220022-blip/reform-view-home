/**
 * PaymentSuccessPage — 결제 성공 콜백 처리 페이지
 *
 * Toss 결제 완료 후 successUrl로 리다이렉트되면 이 페이지 진입.
 * URL 쿼리파라미터: paymentKey, orderId, amount
 *
 * 진입 즉시 POST /api/payments/confirm 호출 → 최종 승인.
 * 성공 시 거래 완료 안내, 실패 시 에러 안내.
 */
import {useEffect, useRef, useState} from 'react'
import {Link, useNavigate, useSearchParams} from 'react-router-dom'
import {CheckCircle2, Loader2, MessageCircle, ShoppingBag, XCircle} from 'lucide-react'
import {confirmPayment, type PaymentResponse} from '../../features/payment/api/paymentApi'
import {formatPrice} from '../../utils/format'

type Status = 'loading' | 'success' | 'error'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Toss가 redirect 시 전달하는 쿼리파라미터
  const paymentKey = searchParams.get('paymentKey') ?? ''
  const orderId = searchParams.get('orderId') ?? ''
  const amount = Number(searchParams.get('amount') ?? '0')
  
  // 파라미터 검증을 lazy initializer로 렌더 타임에 처리 — useEffect 내 setState 방지
  const paramsValid = !!(paymentKey && orderId && amount)
  const [status, setStatus] = useState<Status>(() => paramsValid ? 'loading' : 'error')
  const [result, setResult] = useState<PaymentResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>(() =>
    paramsValid ? '' : '결제 정보가 올바르지 않습니다.'
  )
  
  // confirm API는 한 번만 호출 (StrictMode 이중 호출 방지)
  const called = useRef(false)
  
  useEffect(() => {
    // 파라미터 검증 실패 시 호출 건너뜀 (초기 상태에서 이미 error 처리됨)
    if (!paramsValid) return
    if (called.current) return
    called.current = true
    
    // POST /api/payments/confirm
    confirmPayment({paymentKey, orderId, amount})
      .then(data => {
        setResult(data)
        setStatus('success')
      })
      .catch(err => {
        console.error('결제 승인 실패:', err)
        setErrorMsg('결제 승인 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.')
        setStatus('error')
      })
  }, [paramsValid, paymentKey, orderId, amount])
  
  // ── 로딩 ────────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
        <div className="text-center space-y-4">
          <Loader2 size={40} className="animate-spin mx-auto" style={{color: 'var(--color-accent)'}}/>
          <p className="font-bold"
             style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
            결제 승인 처리 중
          </p>
          <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }
  
  // ── 오류 ────────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{background: 'var(--color-bg)'}}>
        <div
          className="w-full max-w-md rounded-3xl p-8 text-center space-y-5"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          <XCircle size={52} className="mx-auto" style={{color: 'var(--color-error)'}}/>
          <div>
            <h1
              className="text-xl font-bold mb-2"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              PAYMENT FAILED
            </h1>
            <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>{errorMsg}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-2)}
              className="flex-1 py-3 rounded-xl font-bold text-sm"
              style={{
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-border)'
              }}
            >
              다시 시도
            </button>
            <Link
              to="/"
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white text-center hover:text-white"
              style={{background: 'var(--color-primary)'}}
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  // ── 성공 ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background: 'var(--color-bg)'}}>
      <div
        className="w-full max-w-md rounded-3xl p-8 text-center space-y-6"
        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
      >
        {/* 아이콘 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{background: 'rgba(0,179,110,.12)'}}
        >
          <CheckCircle2 size={44} style={{color: 'var(--color-success)'}}/>
        </div>
        
        {/* 타이틀 */}
        <div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{
              color: 'var(--color-text-main)',
              fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              letterSpacing: '0.04em'
            }}
          >
            PAYMENT COMPLETE
          </h1>
          <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
            결제가 완료되었습니다. 판매자에게 배송 요청이 전달됩니다.
          </p>
        </div>
        
        {/* 결제 금액 */}
        {result && (
          <div
            className="rounded-2xl p-4"
            style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>결제 금액</p>
            <p
              className="text-2xl font-bold"
              style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'var(--color-primary)'}}
            >
              {formatPrice(result.amount)}
            </p>
            <p className="text-xs mt-1" style={{color: 'var(--color-text-hint)'}}>
              승인번호: {result.approvalNo ?? '-'}
            </p>
          </div>
        )}
        
        {/* 에스크로 안내 */}
        <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
          RE:FORM 에스크로 안전결제 — 상품 수령 확인 후 판매자에게 정산됩니다.
        </p>
        
        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          {result && (
            <Link
              to={`/trade/${result.tradeId}`}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white hover:text-white"
              style={{background: 'var(--color-accent)'}}
            >
              <ShoppingBag size={16}/>
              거래 현황 확인하기
            </Link>
          )}
          {result && (
            <Link
              to={`/chat`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm hover:text-[var(--color-accent)]"
              style={{
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-border)'
              }}
            >
              <MessageCircle size={15}/>
              판매자와 채팅하기
            </Link>
          )}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm hover:text-[var(--color-accent)]"
            style={{
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-main)',
              border: '1px solid var(--color-border)'
            }}
          >
            <ShoppingBag size={15}/>
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </div>
  )
}
