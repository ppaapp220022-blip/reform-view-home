/**
 * LoginPage — 로그인 페이지 (UC-MEM-002, UC-MEM-003)
 *
 * 레이아웃:
 *   - 데스크탑: 좌측 브랜드 패널(navy) + 우측 폼 패널 (2열)
 *   - 모바일: 폼 단일 컬럼 (브랜드 패널 hidden)
 *
 * 인증 방식:
 *   - 카카오 / 구글 소셜 로그인 (OAuth 리다이렉트)
 *   - 이메일 + 비밀번호 (useMutation → authStore)
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Sparkles, CreditCard } from 'lucide-react'
import { useLogin } from '../../features/auth/hooks/useLogin'
import { redirectToKakao, redirectToGoogle } from '../../features/auth/api/authApi'
import type { AxiosError } from 'axios'

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

function FeatureItem({ icon, title, desc }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-3">
      {/* 아이콘 컨테이너 — navy 위 white/8% 배경 */}
      <div
        className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-medium text-white leading-tight">{title}</p>
        <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {desc}
        </p>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const { mutate: login, isPending, error } = useLogin()

  /** 서버 에러 메시지 파싱 */
  const serverError = (() => {
    if (!error) return null
    const axiosErr = error as AxiosError<{ message?: string }>
    const status = axiosErr.response?.status
    if (status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (status === 429) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    return axiosErr.response?.data?.message ?? '로그인 중 오류가 발생했습니다.'
  })()

  /** 폼 제출 핸들러 */
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    login({ email, password })
  }

  return (
    <div
      className="w-full max-w-[880px] rounded-2xl overflow-hidden flex shadow-card"
      style={{ minHeight: '560px' }}
    >
      {/* ── 좌측: 브랜드 패널 (데스크탑만 표시) ── */}
      <aside
        className="hidden md:flex w-[380px] flex-shrink-0 flex-col justify-center relative overflow-hidden px-12 py-16"
        style={{ background: 'var(--color-primary)' }}
        aria-hidden="true"
      >
        {/* 장식 원형 — 우상단 */}
        <div
          className="absolute -top-10 -right-10 w-56 h-56 rounded-full"
          style={{ border: '40px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }}
        />
        {/* 장식 원형 — 좌하단 */}
        <div
          className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full"
          style={{ border: '28px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }}
        />

        {/* 로고 워드마크 */}
        <div
          className="text-[48px] text-white mb-2 leading-none"
          style={{
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            letterSpacing: '4px',
          }}
        >
          RE:<span style={{ color: 'var(--color-accent)' }}>FORM</span>
        </div>

        {/* 태그라인 */}
        <p
          className="text-[14px] mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          스포츠 용품 리셀의 새로운 기준.
          <br />
          신뢰와 투명함이 함께합니다.
        </p>

        {/* 피처 리스트 */}
        <div className="flex flex-col gap-4">
          <FeatureItem
            icon={<ShieldCheck size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)" />}
            title="에스크로 안전결제"
            desc="거래 완료 전까지 RE:FORM이 보관"
          />
          <FeatureItem
            icon={<Sparkles size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)" />}
            title="AI 사기 탐지"
            desc="허위매물 실시간 차단 시스템"
          />
          <FeatureItem
            icon={<CreditCard size={18} strokeWidth={1.75} color="rgba(255,255,255,0.7)" />}
            title="간편 정산"
            desc="포인트 출금, 빠르고 명확하게"
          />
        </div>
      </aside>

      {/* ── 우측: 로그인 폼 패널 ── */}
      <section className="flex-1 flex flex-col justify-center px-10 py-12 bg-[var(--color-surface)]">
        {/* 제목 */}
        <h1
          className="text-[22px] font-medium text-[var(--color-text-main)] mb-1"
        >
          로그인
        </h1>
        <p className="text-[13px] text-[var(--color-text-sub)] mb-8">
          계정이 없으신가요?{' '}
          <Link
            to="/register"
            className="text-[var(--color-accent)] hover:text-[var(--color-accent)] font-medium no-underline"
          >
            회원가입
          </Link>
        </p>

        {/* ── 소셜 로그인 버튼 ── */}
        <div className="flex flex-col gap-[10px] mb-6">
          {/* 카카오 */}
          <button
            type="button"
            onClick={redirectToKakao}
            className="w-full h-[52px] rounded-[10px] flex items-center gap-3 px-5 text-[14px] font-medium transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              background: '#FEE500',
              color: '#191919',
              border: 'none',
            }}
          >
            <KakaoIcon />
            카카오로 계속하기
          </button>

          {/* 구글 */}
          <button
            type="button"
            onClick={redirectToGoogle}
            className="w-full h-[52px] rounded-[10px] flex items-center gap-3 px-5 text-[14px] font-medium transition-colors hover:bg-[var(--color-surface-raised)]"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-main)',
              border: '1.5px solid var(--color-border-strong)',
            }}
          >
            <GoogleIcon />
            Google로 계속하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-[12px] text-[var(--color-text-hint)]">또는</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* ── 이메일 폼 ── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-3 mb-5">
            {/* 이메일 */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-[11px] font-medium tracking-wide uppercase text-[var(--color-text-hint)] mb-2"
              >
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[11px] font-medium tracking-wide uppercase text-[var(--color-text-hint)] mb-2"
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
                  onChange={(e) => setPassword(e.target.value)}
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
                    ? <EyeOff size={16} strokeWidth={1.5} />
                    : <Eye size={16} strokeWidth={1.5} />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* 로그인 유지 + 비밀번호 찾기 */}
          <div className="flex items-center justify-between mb-5">
            <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-sub)] cursor-pointer select-none">
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
              className="text-[12px] text-[var(--color-accent)] hover:text-[var(--color-accent)] no-underline"
            >
              비밀번호 찾기
            </Link>
          </div>

          {/* 서버 에러 메시지 */}
          {serverError && (
            <p
              className="text-[13px] mb-4 px-4 py-3 rounded-[8px]"
              style={{
                color: 'var(--color-error)',
                background: 'rgba(255,46,77,0.08)',
                border: '1px solid rgba(255,46,77,0.2)',
              }}
              role="alert"
            >
              {serverError}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="w-full h-[52px] rounded-[10px] text-[15px] font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
          >
            {isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </section>
    </div>
  )
}
