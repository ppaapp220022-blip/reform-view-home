/**
 * LoginPage — 로그인 페이지 (UC-MEM-002, UC-MEM-003)
 *
 * 레이아웃:
 *   - 데스크탑: 좌측 브랜드 패널(navy) + 우측 폼 패널 (2열)
 *   - 모바일: 폼 단일 컬럼 (브랜드 패널 hidden)
 *
 * 인증 방식:
 *   - 카카오 / 구글 소셜 로그인 (OAuth 리다이렉트)
 *   - 이메일 + 비밀번호 2단계 인증:
 *       Step 1) 이메일+비밀번호 제출 → 이메일로 6자리 코드 발송
 *       Step 2) 인증코드 입력 → JWT 발급 → 홈 이동
 */
import {type FormEvent, type KeyboardEvent, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {AlertCircle, CreditCard, Eye, EyeOff, Mail, ShieldCheck, Sparkles} from 'lucide-react'
import {useLogin} from '../../features/auth/hooks/useLogin'
import {redirectToGoogle, redirectToKakao} from '../../features/auth/api/authApi'
import type {AxiosError} from 'axios'

// ── 소셜 로그인 아이콘 SVG ─────────────────────────────────────────────────────

/** 카카오 'K' 말풍선 아이콘 */
function KakaoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2C6.029 2 2 5.29 2 9.35c0 2.558 1.614 4.807 4.062 6.131l-.997 3.718a.25.25 0 0 0 .375.27L9.88 17.1A10.7 10.7 0 0 0 11 17.7c4.971 0 9-3.29 9-7.35S15.971 2 11 2Z"
        fill="#191919"
      />
    </svg>
  )
}

/** 구글 'G' 컬러 아이콘 */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35Z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.604 0-4.809-1.759-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.405 11.9A6.015 6.015 0 0 1 4.09 10c0-.663.114-1.308.314-1.9V5.51H1.064A9.996 9.996 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59Z"
        fill="#FBBC04"
      />
      <path
        d="M10 3.977c1.468 0 2.786.505 3.822 1.496l2.868-2.868C14.959.99 12.695 0 10 0A9.996 9.996 0 0 0 1.064 5.51l3.34 2.59C5.192 5.736 7.396 3.977 10 3.977Z"
        fill="#E94235"
      />
    </svg>
  )
}

// ── 브랜드 패널 피처 아이템 ────────────────────────────────────────────────────

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function FeatureItem({icon, title, desc}: FeatureItemProps) {
  return (
    <div className="flex items-center gap-3">
      {/* 아이콘 컨테이너 — navy 위 white/8% 배경 */}
      <div
        className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
        style={{background: 'rgba(255,255,255,0.08)'}}
      >
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-medium text-white leading-tight">{title}</p>
        <p className="text-[13px] leading-tight" style={{color: 'rgba(255,255,255,0.45)'}}>
          {desc}
        </p>
      </div>
    </div>
  )
}

// ── Step 2: 인증코드 입력 폼 ──────────────────────────────────────────────────

interface CodeFormProps {
  email: string
  onSubmit: (code: string) => void
  isPending: boolean
  errorMessage: string | null   // 파싱된 에러 문자열 직접 수신 (mutation 상태 의존 제거)
  onBack: () => void
}

/**
 * 6자리 인증코드 입력 UI
 * 각 digit을 개별 input으로 렌더링, 자동 포커스 이동
 */
function CodeForm({email, onSubmit, isPending, errorMessage, onBack}: CodeFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  
  function handleInput(idx: number, val: string) {
    // 숫자만 허용
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = digit
    setDigits(next)
    // 다음 칸으로 자동 포커스
    if (digit && idx < 5) refs.current[idx + 1]?.focus()
  }
  
  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }
  
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length === 6) onSubmit(code)
  }
  
  const isFilled = digits.every((d) => d !== '')
  
  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* 안내 */}
      <div className="flex items-start gap-3 mb-6 p-4 rounded-[10px] bg-[var(--color-surface-raised)]">
        <Mail size={18} strokeWidth={1.75} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]"/>
        <p className="text-[14px] text-[var(--color-text-sub)] leading-relaxed">
          <span className="font-medium text-[var(--color-text-main)]">{email}</span>
          로 인증코드 6자리를 발송했습니다. 이메일을 확인해 주세요.
        </p>
      </div>
      
      {/* 6자리 digit 입력 */}
      <div className="flex gap-2 mb-5 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-[22px] font-medium rounded-[10px] border transition-colors
              bg-[var(--color-surface)] text-[var(--color-text-main)]
              border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
            style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            aria-label={`인증코드 ${i + 1}번째 자리`}
          />
        ))}
      </div>
      
      {/* 에러 메시지 — 로컬 상태 기반 (mutation 재시도 시에도 유지) */}
      {errorMessage && (
        <div
          className="flex items-start gap-2.5 mb-4 px-4 py-3 rounded-[10px]"
          style={{
            color: 'var(--color-accent)',
            background: 'rgba(255,46,77,0.08)',
            border: '1px solid rgba(255,46,77,0.25)',
          }}
          role="alert"
        >
          <AlertCircle size={16} strokeWidth={1.75} style={{flexShrink: 0, marginTop: 1}}/>
          <span className="text-[14px] leading-snug">{errorMessage}</span>
        </div>
      )}
      
      {/* 확인 버튼 */}
      <button
        type="submit"
        disabled={isPending || !isFilled}
        className="w-full h-[52px] rounded-[10px] text-[15px] font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        style={{background: 'var(--color-primary)'}}
      >
        {isPending ? '확인 중...' : '인증 완료'}
      </button>
      
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={onBack}
        className="w-full h-[44px] rounded-[10px] text-[14px] text-[var(--color-text-sub)] hover:text-[var(--color-text-main)] transition-colors"
      >
        다시 로그인하기
      </button>
    </form>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const {step1, step2, challenge} = useLogin()
  
  // 로컬 에러 상태 — mutation.error 대신 별도 관리
  // 이유: mutation 재시도 시 error가 null로 초기화되어 메시지가 사라지는 버그 방지
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  
  /** Step 1 에러 메시지 파싱 */
  function parseStep1Error(err: unknown): string {
    const axiosErr = err as AxiosError<{ message?: string }>
    const status = axiosErr.response?.status
    if (status === 401 || status === 403) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (status === 429) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    return axiosErr.response?.data?.message ?? '로그인 중 오류가 발생했습니다.'
  }
  
  /** Step 2 에러 메시지 파싱 */
  function parseStep2Error(err: unknown): string {
    const axiosErr = err as AxiosError<{ message?: string }>
    const status = axiosErr.response?.status
    if (status === 400) return '인증코드가 올바르지 않거나 만료되었습니다.'
    if (status === 429) return '시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.'
    return axiosErr.response?.data?.message ?? '코드 인증 중 오류가 발생했습니다.'
  }
  
  /** 폼 제출 핸들러 (Step 1) */
  function handleStep1Submit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setStep1Error(null)  // 재시도 시 기존 에러 초기화
    step1.mutate(
      {email, password},
      {onError: (err) => setStep1Error(parseStep1Error(err))},
    )
  }
  
  /** 인증코드 제출 핸들러 (Step 2) */
  function handleStep2Submit(code: string) {
    if (!challenge) return
    setStep2Error(null)  // 재시도 시 기존 에러 초기화
    step2.mutate(
      {challengeId: challenge.challengeId, code},
      {onError: (err) => setStep2Error(parseStep2Error(err))},
    )
  }
  
  return (
    <div
      className="w-full max-w-[880px] rounded-2xl overflow-hidden flex shadow-card"
      style={{minHeight: '560px'}}
    >
      {/* ── 좌측: 브랜드 패널 (데스크탑만 표시) ── */}
      <aside
        className="hidden md:flex w-[380px] flex-shrink-0 flex-col justify-center relative overflow-hidden px-12 py-16"
        style={{background: 'var(--color-primary)'}}
        aria-hidden="true"
      >
        {/* 장식 원형 — 우상단 */}
        <div
          className="absolute -top-10 -right-10 w-56 h-56 rounded-full"
          style={{border: '40px solid rgba(255,255,255,0.04)', pointerEvents: 'none'}}
        />
        {/* 장식 원형 — 좌하단 */}
        <div
          className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full"
          style={{border: '28px solid rgba(255,255,255,0.04)', pointerEvents: 'none'}}
        />
        
        {/* 로고 워드마크 */}
        <div
          className="text-[48px] text-white mb-2 leading-none"
          style={{
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            letterSpacing: '4px',
          }}
        >
          RE:<span style={{color: 'var(--color-accent)'}}>FORM</span>
        </div>
        
        {/* 태그라인 */}
        <p
          className="text-[14px] mb-10 leading-relaxed"
          style={{color: 'rgba(255,255,255,0.55)'}}
        >
          스포츠 용품 리셀의 새로운 기준.
          <br/>
          신뢰와 투명함이 함께합니다.
        </p>
        
        {/* 피처 리스트 */}
        <div className="flex flex-col gap-4">
          <FeatureItem
            icon={<ShieldCheck size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)"/>}
            title="에스크로 안전결제"
            desc="거래 완료 전까지 RE:FORM이 보관"
          />
          <FeatureItem
            icon={<Sparkles size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)"/>}
            title="AI 사기 탐지"
            desc="허위매물 실시간 차단 시스템"
          />
          <FeatureItem
            icon={<CreditCard size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)"/>}
            title="간편 정산"
            desc="포인트 출금, 빠르고 명확하게"
          />
        </div>
      </aside>
      
      {/* ── 우측: 폼 패널 ── */}
      <section className="flex-1 flex flex-col justify-center px-10 py-12 bg-[var(--color-surface)]">
        
        {/* Step 2: 인증코드 입력 */}
        {challenge ? (
          <>
            <h1 className="text-[22px] font-medium text-[var(--color-text-main)] mb-1">
              이메일 인증
            </h1>
            <p className="text-[14px] text-[var(--color-text-sub)] mb-8">
              이메일로 발송된 6자리 코드를 입력해 주세요.
            </p>
            <CodeForm
              email={challenge.email}
              onSubmit={handleStep2Submit}
              isPending={step2.isPending}
              errorMessage={step2Error}
              onBack={() => {
                step1.reset();
                setStep2Error(null)
              }}
            />
          </>
        ) : (
          <>
            {/* Step 1: 이메일 + 비밀번호 */}
            <h1 className="text-[22px] font-medium text-[var(--color-text-main)] mb-1">
              로그인
            </h1>
            <p className="text-[14px] text-[var(--color-text-sub)] mb-8">
              계정이 없으신가요?{' '}
              <Link
                to="/register"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent)] font-medium no-underline"
              >
                회원가입
              </Link>
            </p>
            
            {/* 소셜 로그인 버튼 */}
            <div className="flex flex-col gap-[10px] mb-6">
              {/* 카카오 */}
              <button
                type="button"
                onClick={redirectToKakao}
                className="w-full h-[52px] rounded-[10px] border-0 flex items-center gap-3 px-5 text-[14px] font-medium transition-opacity hover:opacity-90 active:opacity-75"
                style={{
                  /* 카카오 브랜드 전용 색상 — CSS 변수/Tailwind 불가 */
                  background: '#FEE500',
                  color: '#191919',
                }}
              >
                <KakaoIcon/>
                카카오로 계속하기
              </button>
              
              {/* 구글 */}
              <button
                type="button"
                onClick={redirectToGoogle}
                className="w-full h-[52px] rounded-[10px] flex items-center gap-3 px-5 text-[14px] font-medium
                  bg-[var(--color-surface)] text-[var(--color-text-main)]
                  border border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                <GoogleIcon/>
                Google로 계속하기
              </button>
            </div>
            
            {/* 구분선 */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[var(--color-border)]"/>
              <span className="text-[13px] text-[var(--color-text-hint)]">또는</span>
              <div className="flex-1 h-px bg-[var(--color-border)]"/>
            </div>
            
            {/* 이메일 + 비밀번호 폼 */}
            <form onSubmit={handleStep1Submit} noValidate>
              <div className="flex flex-col gap-3 mb-5">
                {/* 이메일 */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-[13px] font-medium tracking-wide uppercase text-[var(--color-text-hint)] mb-2"
                  >
                    이메일
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setStep1Error(null)
                    }}
                    className="input-base w-full"
                    required
                  />
                </div>
                
                {/* 비밀번호 */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-[13px] font-medium tracking-wide uppercase text-[var(--color-text-hint)] mb-2"
                  >
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setStep1Error(null)
                      }}
                      className="input-base w-full pr-11"
                      required
                    />
                    {/* 비밀번호 표시/숨김 토글 */}
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-hint)] hover:text-[var(--color-text-sub)] transition-colors"
                      aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPw
                        ? <EyeOff size={16} strokeWidth={1.5}/>
                        : <Eye size={16} strokeWidth={1.5}/>
                      }
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 로그인 유지 + 비밀번호 찾기 */}
              <div className="flex items-center justify-between mb-5">
                <label
                  className="flex items-center gap-2 text-[14px] text-[var(--color-text-sub)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                  로그인 유지
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent)] no-underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              
              {/* 로그인 실패 에러 배너 — 로컬 상태 기반, 버튼 직전에 항상 노출 */}
              {step1Error && (
                <div
                  className="flex items-start gap-2.5 mb-4 px-4 py-3 rounded-[10px]"
                  style={{
                    color: 'var(--color-accent)',
                    background: 'rgba(255,46,77,0.08)',
                    border: '1px solid rgba(255,46,77,0.25)',
                  }}
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle size={16} strokeWidth={1.75} style={{flexShrink: 0, marginTop: 1}}/>
                  <span className="text-[14px] leading-snug font-medium">{step1Error}</span>
                </div>
              )}
              
              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={step1.isPending || !email || !password}
                className="w-full h-[52px] rounded-[10px] text-[15px] font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{background: 'var(--color-primary)'}}
              >
                {step1.isPending ? '확인 중...' : '다음'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
