/**
 * WelcomePage — 회원가입 Step 3 : 가입 완료 & 환영 (UC-MEM-005 완료)
 *
 * 주요 요소:
 *   1) StepIndicator  — 1·2 완료 / 3 활성
 *   2) PlayerCard     — 스포츠 트레이딩 카드 스타일의 신규 선수 카드
 *                       닉네임 · 관심 팀 컬러 · 매너 점수 점 표시 · 스피드라인
 *   3) BadgeUnlock    — "NEW PLAYER 배지 획득" 알림
 *   4) InterestChips  — 선택한 종목/리그/구단 요약 칩 (router state)
 *   5) FeedPreview    — 관심 종목 관련 매물 카운트 (mock)
 *   6) CTA            — 홈 피드 / 판매하기
 *
 * 전달 데이터: useLocation().state (useOnboarding이 navigate 시 주입)
 *   { sports, leagues, teams, keywords }
 */
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ShoppingBag, Plus, Star } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import type { SportType } from '../../features/auth/api/authApi'

// ── 종목 한글 레이블 맵 ────────────────────────────────────────────────────────
const SPORT_LABEL: Record<SportType, string> = {
    BASEBALL:   '야구',
  SOCCER:     '축구',
  BASKETBALL: '농구',
  VOLLEYBALL: '배구',
  ESPORTS:    '이스포츠',
}

// ── 팀 컬러 맵 (하드코딩 불가피 — 팀 브랜드 컬러) ─────────────────────────────
const TEAM_COLOR_MAP: Record<string, string> = {
  '토트넘': '#132257', '맨유': '#DA291C', '첼시': '#034694',
  '맨시티': '#6CABDD', '리버풀': '#C8102E', '아스날': '#EF0107',
  '레알 마드리드': '#FEBE10', '바르셀로나': '#A50044',
  '전북 현대': '#004C97', 'FC 서울': '#C8102E', '울산 HD': '#0070B8',
  '두산 베어스': '#131230', 'LG 트윈스': '#C30452', 'KIA 타이거즈': '#EA0029',
  '서울 SK 나이츠': '#E31837', 'LA 레이커스': '#552583',
  '현대캐피탈 스카이워커스': '#003087',
  'T1': '#C89B3C', 'Gen.G': '#8B7536', '한화생명 e스포츠': '#FF6600',
}

/** 팀 목록에서 가장 먼저 매칭되는 컬러 반환 (없으면 navy) */
function getPrimaryTeamColor(teams: string[]): string {
  for (const t of teams) {
    if (TEAM_COLOR_MAP[t]) return TEAM_COLOR_MAP[t]
  }
  return '#002147'  // navy fallback
}

// ── 모의 매물 카운트 (종목에 따라 달라지는 척) ──────────────────────────────────
const MOCK_COUNTS: Record<SportType, number> = {
  SOCCER: 2847, BASEBALL: 1432, BASKETBALL: 893,
  VOLLEYBALL: 341, ESPORTS: 576,
}
function getMockCount(sports: SportType[]): number {
  return sports.reduce((acc, s) => acc + (MOCK_COUNTS[s] ?? 0), 0)
}

// ── StepIndicator ─────────────────────────────────────────────────────────────
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
                {isDone ? <Check size={14} strokeWidth={2.5} color="#fff" /> : step.n}
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
                style={{ background: isDone ? 'var(--color-success)' : 'var(--color-border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── PlayerCard ────────────────────────────────────────────────────────────────

/**
 * PlayerCard — 스포츠 트레이딩 카드 스타일
 *
 * 구성:
 *   - 상단 팀컬러 바 + 스피드라인 패턴 (브랜드 요소)
 *   - 중앙 아바타 원 (닉네임 이니셜)
 *   - IAMAPLAYER 닉네임
 *   - 포지션 라벨 "ROOKIE" + 매너 점수 점 5개
 *   - 하단 멤버 태그 "RE:FORM PLAYER"
 */
function PlayerCard({
  nickname,
  teamColor,
  mannerScore,
}: {
  nickname: string
  teamColor: string         // 팀 브랜드 컬러 hex
  mannerScore: number       // 0~5
}) {
  /** 닉네임에서 표시 이니셜 추출 (최대 2자) */
  const initial = nickname.trim().slice(0, 2).toUpperCase()

  return (
    <div
      className="relative mx-auto overflow-hidden select-none"
      style={{
        width: 220,
        height: 300,
        borderRadius: 16,
        /* 카드 배경: navy 그라디언트 — 브랜드 이미지 표현용, 라이트/다크 공통 */
        background: 'linear-gradient(160deg, #002147 0%, #0D1B2A 60%, #1A3051 100%)',
        boxShadow: '0 20px 60px rgba(0,33,71,0.45)',
      }}
    >
      {/* 팀컬러 상단 바 */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 6, background: teamColor }}
      />

      {/* 스피드라인 패턴 — 브랜드 요소 (대각선 줄) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.06 }}
        aria-hidden="true"
      >
        {[-40, -20, 0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240].map((x) => (
          <div
            key={x}
            className="absolute top-0 bottom-0"
            style={{
              left: x,
              width: 8,
              background: '#fff',
              transform: 'skewX(-18deg)',
            }}
          />
        ))}
      </div>

      {/* RE:FORM 브랜드 태그 — 상단 좌측 */}
      <div
        className="absolute top-[14px] left-[14px] px-2 py-0.5 rounded-sm"
        style={{
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
          fontSize: 9,
          letterSpacing: '0.15em',
          background: 'rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        RE:FORM
      </div>

      {/* 오른쪽 상단 팀컬러 다이아몬드 */}
      <div
        className="absolute top-[10px] right-[14px]"
        style={{
          width: 14,
          height: 14,
          background: teamColor,
          transform: 'rotate(45deg)',
          borderRadius: 2,
          opacity: 0.9,
        }}
      />

      {/* 중앙 아바타 원 */}
      <div
        className="absolute flex items-center justify-center rounded-full font-bold"
        style={{
          top: 52,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 72,
          height: 72,
          background: `${teamColor}33`,  // 팀 컬러 20% 알파
          border: `2px solid ${teamColor}`,
          fontSize: 22,
          color: '#fff',
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
          letterSpacing: '0.05em',
        }}
      >
        {initial}
      </div>

      {/* 닉네임 — IAMAPLAYER */}
      <div
        className="absolute left-0 right-0 text-center px-4"
        style={{
          top: 138,
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
          fontSize: 22,
          letterSpacing: '0.08em',
          color: '#fff',
          lineHeight: 1,
        }}
      >
        {/* IAMAPLAYER는 영문/숫자만 — 한글 닉네임은 Pretendard로 폴백 */}
        {nickname}
      </div>

      {/* 구분선 */}
      <div
        className="absolute left-[28px] right-[28px]"
        style={{
          top: 170,
          height: 1,
          background: 'rgba(255,255,255,0.12)',
        }}
      />

      {/* 포지션 + 매너 점수 */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-7"
        style={{ top: 184 }}
      >
        <span
          style={{
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            fontSize: 12,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          ROOKIE
        </span>
        {/* 매너 점수 — 점 5개 */}
        <div className="flex gap-1 items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={10}
              strokeWidth={0}
              fill={n <= Math.round(Math.min(5, Math.max(0, mannerScore))) ? '#FFB800' : 'rgba(255,255,255,0.2)'}
            />
          ))}
        </div>
      </div>

      {/* 통계 행 */}
      <div
        className="absolute left-[28px] right-[28px] flex justify-between"
        style={{ top: 210 }}
      >
        {[
          { label: 'TRADE', value: '0' },
          { label: 'SCORE', value: '36.5' },
          { label: 'MANNER', value: '5.0' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div
              style={{
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                fontSize: 17,
                color: '#fff',
                letterSpacing: '0.03em',
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                fontSize: 8,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.12em',
                marginTop: 3,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 멤버 태그 */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{ bottom: 16 }}
      >
        <span
          style={{
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            fontSize: 8,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          RE:FORM PLAYER
        </span>
      </div>
    </div>
  )
}

// ── BadgeUnlock ────────────────────────────────────────────────────────────────

/** BadgeUnlock — "NEW PLAYER 배지 획득" 알림 컴포넌트 */
function BadgeUnlock() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[10px] animate-fadeInUp"
      style={{
        background: 'linear-gradient(90deg, rgba(255,184,0,0.12) 0%, rgba(255,184,0,0.04) 100%)',
        border: '1px solid rgba(255,184,0,0.35)',
        animationDuration: '350ms',
        animationFillMode: 'both',
        animationDelay: '200ms',
      }}
    >
      {/* 골드 배지 아이콘 */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,184,0,0.18)', border: '1.5px solid rgba(255,184,0,0.5)' }}
      >
        <Star size={16} strokeWidth={0} fill="#FFB800" />
      </div>
      <div>
        {/* 배지 획득 타이틀: 잘 보여야 하므로 font-display(Giants) */}
        <p className="text-[13px] font-display font-semibold" style={{ color: 'var(--color-text-main)' }}>
          NEW PLAYER 배지 획득
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-hint)' }}>
          첫 거래 완료 시 ROOKIE 배지로 업그레이드됩니다
        </p>
      </div>
    </div>
  )
}

// ── FeedPreview ───────────────────────────────────────────────────────────────

/** FeedPreview — 관심 종목 관련 매물 카운트 */
function FeedPreview({ count, sportLabels }: { count: number; sportLabels: string[] }) {
  if (count === 0) return null
  const formatted = count.toLocaleString('ko-KR')
  const label = sportLabels.length > 0
    ? sportLabels.join(' · ')
    : '전체 종목'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[10px]"
      style={{
        background: 'var(--color-surface-sunken)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-accent-subtle)', border: '1.5px solid var(--color-accent)' }}
      >
        <ShoppingBag size={16} style={{ color: 'var(--color-accent)' }} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-main)' }}>
          <span style={{ color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
            {formatted}개
          </span>
          의 유니폼이 기다리고 있어요
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-hint)' }}>
          {label} 관심 매물 기준
        </p>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface WelcomeState {
  sports:   SportType[]
  leagues:  string[]
  teams:    string[]
  keywords: string[]
}

export default function WelcomePage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const user = useAuthStore((s) => s.user)

  /** router state로 전달된 관심 설정 (온보딩을 건너뛴 경우 빈 배열) */
  const state = (location.state ?? {}) as Partial<WelcomeState>

  /**
   * sports / teams를 useMemo로 안정화 — 매 렌더마다 새 배열 참조가 생기면
   * 하위 useMemo의 deps 비교가 항상 달라져 불필요한 재계산이 발생함
   */
  const sports = useMemo(() => state.sports ?? [], [state.sports])
  const teams  = useMemo(() => state.teams  ?? [], [state.teams])

  /** 닉네임 — authStore에서 읽거나 '선수' 폴백 */
  const nickname = user?.nickname ?? '선수'

  /** 관심 팀 기준 대표 컬러 (없으면 navy) */
  const teamColor = useMemo(() => getPrimaryTeamColor(teams), [teams])

  /** 초기 매너 점수 */
  /** mannerScore: 0~5.0 스케일 (당근마켓 별점 방식). 신규 가입자 기본값 3.65 ≈ ★★★★ */
  const mannerScore = user?.mannerScore ?? 3.65

  /** 매물 카운트 (mock) */
  const feedCount = useMemo(() => getMockCount(sports), [sports])

  /** 종목 한글 라벨 */
  const sportLabels = sports.map((s) => SPORT_LABEL[s])

  return (
    <div
      className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-card animate-fadeInUp"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        animationDuration: '300ms',
      }}
    >
      {/* 상단 navy 액센트 바 */}
      <div className="h-[3px]" style={{ background: 'var(--color-primary)' }} />

      <div className="px-8 py-8">
        {/* 스텝 인디케이터 — Step 3 활성, 1·2 완료 */}
        <StepIndicator current={3} />

        {/* 헤드라인 */}
        <div className="mb-7 text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-success)' }}
          >
            가입 완료
          </p>
          <h1
            className="leading-none mb-3"
            style={{
              fontFamily: "'Giants-Inline','IAMAPLAYER',Giants,sans-serif",
              fontSize: 32,
              letterSpacing: '0.06em',
              color: 'var(--color-text-main)',
            }}
          >
            WELCOME TO THE SQUAD
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--color-text-sub)' }}>
            {nickname}님, RE:FORM에 오신 걸 환영합니다.
          </p>
        </div>

        {/* 플레이어 카드 */}
        <div className="flex justify-center mb-6">
          <PlayerCard
            nickname={nickname}
            teamColor={teamColor}
            mannerScore={mannerScore}
          />
        </div>

        {/* 배지 획득 알림 */}
        <div className="mb-4">
          <BadgeUnlock />
        </div>

        {/* 관심 종목 매물 카운트 */}
        {feedCount > 0 && (
          <div className="mb-4">
            <FeedPreview count={feedCount} sportLabels={sportLabels} />
          </div>
        )}

        {/* 선택된 관심 요약 칩 */}
        {(sports.length > 0 || teams.length > 0) && (
          <div
            className="mb-6 px-4 py-3 rounded-[10px]"
            style={{
              background: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-hint)' }}
            >
              내 관심 설정
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sports.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                  }}
                >
                  {SPORT_LABEL[s]}
                </span>
              ))}
              {teams.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: 'var(--color-surface-raised, var(--color-surface))',
                    border: '1.5px solid var(--color-border-strong)',
                    color: 'var(--color-text-sub)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA 버튼 */}
        <div className="flex flex-col gap-3">
          {/* 홈 피드 */}
          <Link
            to="/"
            replace
            className="w-full h-[52px] rounded-[10px] text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:text-white hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            홈 피드 보러 가기
          </Link>

          {/* 판매하기 */}
          <button
            type="button"
            onClick={() => navigate('/listing/new')}
            className="w-full h-[44px] rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{
              background: 'var(--color-accent-subtle)',
              border: '1.5px solid var(--color-accent)',
              color: 'var(--color-accent)',
            }}
          >
            <Plus size={16} strokeWidth={2} />
            첫 유니폼 판매하기
          </button>
        </div>
      </div>
    </div>
  )
}
