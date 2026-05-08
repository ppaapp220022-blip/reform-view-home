/**
 * RegisterPage — 회원가입 페이지 Step 1 (UC-MEM-001, NFR-L01)
 *
 * 레이아웃: 중앙 카드 (max-w-[560px]), shadow-card, 상단 navy 액센트 바
 * 특징:
 *   - 3단계 스텝 인디케이터
 *   - 이메일 / 닉네임 / 비밀번호 / 비밀번호 확인
 *   - 비밀번호 요건 체크리스트 (강도바 대체)
 *   - 약관 동의 (전체동의 + 필수2 + 선택1), 보기 → TermsModal
 *   - 서버 에러 인라인 표시
 */
import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Check, X as XIcon } from 'lucide-react'
import { useRegister } from '../../features/auth/hooks/useRegister'
import TermsModal, { type TermsType } from '../../components/ui/TermsModal'
import Logo from '../../components/ui/Logo'
import type { AxiosError } from 'axios'

// ── 비밀번호 강도 바 ──────────────────────────────────────────────────────────

/** 0~4 점수 계산: 길이·대문자·숫자·특수문자 각 1점 */
function calcPwScore(pw: string): number {
  let s = 0
  if (pw.length >= 8)          s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const PW_LEVELS = [
  { label: '매우 약함', color: 'var(--color-error)' },
  { label: '약함',      color: 'var(--color-warning)' },
  { label: '보통',      color: 'var(--color-info)' },
  { label: '강함',      color: 'var(--color-success)' },
]

/**
 * PwStrengthBar — 비밀번호 강도 표시
 * 4칸 색상 바 + 레벨 텍스트 + 한 줄 안내 문구
 */
function PwStrengthBar({ password }: { password: string }) {
  if (!password) return null
  const score   = calcPwScore(password)
  const level   = PW_LEVELS[score - 1] ?? null   // score=0이면 null
  const barColor = level?.color ?? 'var(--color-border-strong)'

  return (
    <div className="mt-2">
      {/* 4칸 강도 바 */}
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="flex-1 h-[3px] rounded-sm transition-colors duration-200"
            style={{
              background: seg <= score ? barColor : 'var(--color-border-strong)',
            }}
          />
        ))}
      </div>

      {/* 레벨 + 안내 문구 한 줄 */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] font-medium"
          style={{ color: level ? level.color : 'var(--color-text-hint)' }}
        >
          {level ? level.label : ''}
        </span>
        <span className="text-[11px] text-[var(--color-text-hint)] text-right">
          8자 이상 · 대소문자 · 숫자 · 특수문자 조합 권장
        </span>
      </div>
    </div>
  )
}

// ── 스텝 인디케이터 ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: '계정 정보' },
    { n: 2, label: '관심 설정' },
    { n: 3, label: '완료' },
  ]

  return (
    <div className="flex items-center mb-8">
      {steps.map((step, idx) => {
        const isDone   = step.n < current
        const isActive = step.n === current

        return (
          <div key={step.n} className="contents">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition-colors"
                style={{
                  background: isDone
                    ? 'var(--color-success)'
                    : isActive
                    ? 'var(--color-primary)'
                    : 'transparent',
                  border: isDone || isActive
                    ? 'none'
                    : '2px solid var(--color-border-strong)',
                  color: isDone || isActive ? '#fff' : 'var(--color-text-hint)',
                }}
              >
                {isDone
                  ? <Check size={14} strokeWidth={2.5} color="#fff" />
                  : step.n
                }
              </div>
              <span
                className="text-[11px] whitespace-nowrap"
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isDone
                    ? 'var(--color-success)'
                    : isActive
                    ? 'var(--color-text-main)'
                    : 'var(--color-text-hint)',
                }}
              >
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className="flex-1 h-[1.5px] mx-2 mb-5 transition-colors"
                style={{
                  background: isDone
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

// ── 약관 동의 섹션 ────────────────────────────────────────────────────────────

interface TermsState {
  service: boolean
  privacy: boolean
  marketing: boolean
}

interface TermsSectionProps {
  terms: TermsState
  onChange: (next: TermsState) => void
  onView: (type: TermsType) => void
}

function TermsSection({ terms, onChange, onView }: TermsSectionProps) {
  const allChecked = terms.service && terms.privacy && terms.marketing

  function toggleAll(checked: boolean) {
    onChange({ service: checked, privacy: checked, marketing: checked })
  }

  function toggle(key: keyof TermsState) {
    onChange({ ...terms, [key]: !terms[key] })
  }

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* 전체 동의 행 — 살짝 강조 배경 */}
      <label
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        style={{ background: 'var(--color-surface-sunken)' }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
          className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer flex-shrink-0"
        />
        <span className="text-[13px] font-semibold text-[var(--color-text-main)]">
          전체 동의
        </span>
        <span className="text-[11px] text-[var(--color-text-hint)] ml-auto">
          선택 포함
        </span>
      </label>

      {/* 구분선 */}
      <div className="h-px" style={{ background: 'var(--color-border)' }} />

      {/* 개별 항목 */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* 이용약관 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="terms-service"
            checked={terms.service}
            onChange={() => toggle('service')}
            className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer flex-shrink-0"
          />
          <label htmlFor="terms-service" className="flex-1 cursor-pointer select-none text-[13px] text-[var(--color-text-sub)]">
            <span className="mr-1.5 font-medium" style={{ color: 'var(--color-text-hint)' }}>[필수]</span>
            이용약관 동의
          </label>
          <button
            type="button"
            onClick={() => onView('service')}
            className="text-[12px] text-[var(--color-text-hint)] hover:text-[var(--color-accent)] underline underline-offset-2 transition-colors flex-shrink-0"
          >
            보기
          </button>
        </div>

        {/* 개인정보처리방침 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="terms-privacy"
            checked={terms.privacy}
            onChange={() => toggle('privacy')}
            className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer flex-shrink-0"
          />
          <label htmlFor="terms-privacy" className="flex-1 cursor-pointer select-none text-[13px] text-[var(--color-text-sub)]">
            <span className="mr-1.5 font-medium" style={{ color: 'var(--color-text-hint)' }}>[필수]</span>
            개인정보처리방침 동의
          </label>
          <button
            type="button"
            onClick={() => onView('privacy')}
            className="text-[12px] text-[var(--color-text-hint)] hover:text-[var(--color-accent)] underline underline-offset-2 transition-colors flex-shrink-0"
          >
            보기
          </button>
        </div>

        {/* 마케팅 수신 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="terms-marketing"
            checked={terms.marketing}
            onChange={() => toggle('marketing')}
            className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer flex-shrink-0"
          />
          <label htmlFor="terms-marketing" className="flex-1 cursor-pointer select-none text-[13px] text-[var(--color-text-sub)]">
            <span className="mr-1.5 font-medium" style={{ color: 'var(--color-text-hint)' }}>[선택]</span>
            마케팅 정보 수신 동의
          </label>
          <button
            type="button"
            onClick={() => onView('marketing')}
            className="text-[12px] text-[var(--color-text-hint)] hover:text-[var(--color-accent)] underline underline-offset-2 transition-colors flex-shrink-0"
          >
            보기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 레이블 컴포넌트 ────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
      style={{ color: 'var(--color-text-hint)' }}
    >
      {children}
    </label>
  )
}

// ── 선행 조건 한 줄 안내 ──────────────────────────────────────────────────────

interface PreflightHintsProps {
  email: string
  isEmailValid: boolean
  nickname: string
  isNicknameValid: boolean
  password: string
  isPwValid: boolean
  pwConfirm: string
  isPwMatch: boolean
  isTermsService: boolean   // [필수] 이용약관 동의 여부
  isTermsPrivacy: boolean   // [필수] 개인정보처리방침 동의 여부
}

/**
 * PreflightHints — 미충족 조건을 우선순위 순으로 한 줄씩 빨간 텍스트로 표시
 *
 * - 비밀번호 입력이 시작된 이후에만 렌더링 (외부 gate: password.length > 0)
 * - 우선순위: 이메일 → 닉네임 → 비밀번호 강도 → 비밀번호 확인 → 필수 약관
 * - 한 번에 가장 먼저 해결해야 할 조건 하나만 표시
 */
function PreflightHints({
  email, isEmailValid,
  nickname, isNicknameValid,
  password, isPwValid,
  pwConfirm, isPwMatch,
  isTermsService, isTermsPrivacy,
}: PreflightHintsProps) {
  // 비밀번호 개별 요건 레이블 (미충족 항목만 추출해 한 줄로 합침)
  const unmetPwLabels = [
    { label: '8자 이상',    met: password.length >= 8 },
    { label: '대문자',      met: /[A-Z]/.test(password) },
    { label: '숫자',        met: /[0-9]/.test(password) },
    { label: '특수문자',    met: /[^A-Za-z0-9]/.test(password) },
  ]
    .filter((r) => !r.met)
    .map((r) => r.label)

  // 우선순위 순으로 첫 번째 미충족 조건 하나만 반환
  let message: string | null = null

  if (!isEmailValid) {
    message = email ? '올바른 이메일 형식이 아닙니다.' : '이메일 주소를 입력해 주세요.'
  } else if (!isNicknameValid) {
    message = nickname.trim().length > 0
      ? '닉네임은 2~20자 사이로 입력해 주세요.'
      : '닉네임을 입력해 주세요.'
  } else if (!isPwValid) {
    // 미충족 요건을 "·" 구분자로 이어붙여 한 줄로 표시
    message = unmetPwLabels.length > 0
      ? `비밀번호에 ${unmetPwLabels.join(' · ')} 조건이 필요합니다.`
      : '비밀번호 보안 수준을 높여 주세요.'
  } else if (!isPwMatch) {
    message = pwConfirm
      ? '비밀번호 확인이 일치하지 않습니다.'
      : '비밀번호 확인을 입력해 주세요.'
  } else if (!isTermsService || !isTermsPrivacy) {
    message = !isTermsService && !isTermsPrivacy
      ? '이용약관 및 개인정보처리방침에 동의해 주세요.'
      : !isTermsService
      ? '이용약관 동의가 필요합니다.'
      : '개인정보처리방침 동의가 필요합니다.'
  }

  if (!message) return null

  return (
    <p
      className="text-[12px] mb-3 leading-relaxed"
      style={{ color: 'var(--color-error)' }}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function RegisterPage() {
  // 폼 상태
  const [email, setEmail]         = useState('')
  const [nickname, setNickname]   = useState('')
  const [password, setPw]         = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showPwC, setShowPwC]     = useState(false)
  const [terms, setTerms]         = useState<TermsState>({
    service: false, privacy: false, marketing: false,
  })

  // 모달 상태
  const [modalType, setModalType] = useState<TermsType | null>(null)

  const { mutate: register, isPending, error } = useRegister()

  // ── 유효성 ─────────────────────────────────────────────────────────────────

  const isEmailValid    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20
  // 비밀번호: 최소 2가지 요건 충족 (길이 + 1가지 이상)
  const isPwValid       = calcPwScore(password) >= 2   // 최소 2가지 조건 충족
  const isPwMatch       = password === pwConfirm && pwConfirm.length > 0
  const isTermsRequired = terms.service && terms.privacy
  const canSubmit       = isEmailValid && isNicknameValid && isPwValid && isPwMatch && isTermsRequired && !isPending

  // ── 서버 에러 ───────────────────────────────────────────────────────────────

  const serverError = (() => {
    if (!error) return null
    const axiosErr = error as AxiosError<{ message?: string }>
    const status = axiosErr.response?.status
    if (status === 409) return '이미 사용 중인 이메일이거나 닉네임입니다.'
    if (status === 400) return axiosErr.response?.data?.message ?? '입력 정보를 확인해 주세요.'
    return axiosErr.response?.data?.message ?? '회원가입 중 오류가 발생했습니다.'
  })()

  // ── 제출 ────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return
      register({
        email,
        nickname: nickname.trim(),
        password,
        marketingAgreed: terms.marketing,
      })
    },
    [canSubmit, email, nickname, password, terms.marketing, register],
  )

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* 약관 모달 */}
      {modalType && (
        <TermsModal type={modalType} onClose={() => setModalType(null)} />
      )}

      {/* 카드 */}
      <div
        className="w-full max-w-[560px] rounded-2xl overflow-hidden shadow-card"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* 상단 navy 액센트 바 */}
        <div className="h-[3px]" style={{ background: 'var(--color-primary)' }} />

        <div className="px-8 py-8">
          {/* 로고 — Logo 컴포넌트 (다크모드 자동 전환) */}
          <div className="mb-6">
            <Logo variant="main" height={26} />
          </div>

          {/* 스텝 인디케이터 */}
          <StepIndicator current={1} />

          {/* 섹션 제목 */}
          <div className="mb-6">
            <h1 className="text-[20px] font-semibold text-[var(--color-text-main)] mb-1">
              계정 만들기
            </h1>
            <p className="text-[13px] text-[var(--color-text-sub)]">
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="font-medium no-underline hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                로그인
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* ── 계정 정보 그룹 ── */}
            <div className="flex flex-col gap-4 mb-5">

              {/* 이메일 */}
              <div>
                <FieldLabel htmlFor="reg-email">이메일</FieldLabel>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="input-base w-full"
                  required
                />
                {email && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: isEmailValid
                          ? 'var(--color-success)'
                          : 'var(--color-error)',
                      }}
                    />
                    <span
                      className="text-[11px]"
                      style={{
                        color: isEmailValid
                          ? 'var(--color-success)'
                          : 'var(--color-error)',
                      }}
                    >
                      {isEmailValid
                        ? '사용 가능한 이메일 형식입니다.'
                        : '올바른 이메일 형식이 아닙니다.'}
                    </span>
                  </div>
                )}
              </div>

              {/* 닉네임 */}
              <div>
                <FieldLabel htmlFor="reg-nickname">닉네임</FieldLabel>
                <input
                  id="reg-nickname"
                  type="text"
                  autoComplete="username"
                  placeholder="2~20자 이내"
                  value={nickname}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)}
                  className="input-base w-full"
                  maxLength={20}
                  required
                />
                {nickname && !isNicknameValid && (
                  <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-error)' }}>
                    닉네임은 2~20자 사이로 입력해 주세요.
                  </p>
                )}
              </div>

              {/* 비밀번호 */}
              <div>
                <FieldLabel htmlFor="reg-password">비밀번호</FieldLabel>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="8자 이상 입력"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPw(e.target.value)}
                    className="input-base w-full pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-text-hint)' }}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPw
                      ? <EyeOff size={16} strokeWidth={1.5} />
                      : <Eye size={16} strokeWidth={1.5} />
                    }
                  </button>
                </div>
                {/* 비밀번호 요건 체크리스트 */}
                <PwStrengthBar password={password} />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <FieldLabel htmlFor="reg-pw-confirm">비밀번호 확인</FieldLabel>
                <div className="relative">
                  <input
                    id="reg-pw-confirm"
                    type={showPwC ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={pwConfirm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPwConfirm(e.target.value)}
                    className="input-base w-full pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwC((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--color-text-hint)' }}
                    aria-label={showPwC ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPwC
                      ? <EyeOff size={16} strokeWidth={1.5} />
                      : <Eye size={16} strokeWidth={1.5} />
                    }
                  </button>
                </div>
                {pwConfirm && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: isPwMatch
                          ? 'var(--color-success)'
                          : 'var(--color-error)',
                      }}
                    />
                    <span
                      className="text-[11px]"
                      style={{
                        color: isPwMatch
                          ? 'var(--color-success)'
                          : 'var(--color-error)',
                      }}
                    >
                      {isPwMatch
                        ? '비밀번호가 일치합니다.'
                        : '비밀번호가 일치하지 않습니다.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="mb-5">
              <TermsSection
                terms={terms}
                onChange={setTerms}
                onView={(type) => setModalType(type)}
              />
            </div>

            {/* 서버 에러 */}
            {serverError && (
              <div
                className="text-[13px] mb-4 px-4 py-3 rounded-[8px] flex items-start gap-2"
                style={{
                  color: 'var(--color-error)',
                  background: 'rgba(255,46,77,0.07)',
                  border: '1px solid rgba(255,46,77,0.2)',
                }}
                role="alert"
              >
                <XIcon size={14} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            {/* 선행 조건 안내 — 미충족 항목이 있을 때만 표시 */}
            {!canSubmit && !isPending && password.length > 0 && (
              <PreflightHints
                email={email}
                isEmailValid={isEmailValid}
                nickname={nickname}
                isNicknameValid={isNicknameValid}
                password={password}
                isPwValid={isPwValid}
                pwConfirm={pwConfirm}
                isPwMatch={isPwMatch}
                isTermsService={terms.service}
                isTermsPrivacy={terms.privacy}
              />
            )}

            {/* 다음 단계 버튼 */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-[52px] rounded-[10px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)' }}
            >
              {isPending ? '처리 중...' : '다음 단계'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
