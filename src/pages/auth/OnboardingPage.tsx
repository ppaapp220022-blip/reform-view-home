/**
 * OnboardingPage — 회원가입 Step 2 : 관심 설정 (UC-MEM-005)
 *
 * 섹션 구성:
 *   1) 관심 종목 선택  — 복수 선택 가능
 *   2) 관심 구단 선택  — 선택된 종목의 팀 카드 노출, 최대 5개
 *   3) 관심 키워드     — 텍스트 입력 + Enter/쉼표로 태그 추가
 *   4) 선택 요약 뱃지  — 선택된 전체 항목을 하단에 뱃지 표시, X로 제거
 *
 * 완료 → POST /user/interest-setting → 홈(/)
 * 건너뛰기 → 홈(/) (API 호출 없음)
 */
import {
  useState,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import {useNavigate} from 'react-router-dom'
import {Check, X as XIcon, SkipForward, ChevronRight} from 'lucide-react'
import {useOnboarding} from '../../features/auth/hooks/useOnboarding'
import type {SportType} from '../../features/auth/api/authApi'
import Logo from '../../components/ui/Logo'

// ── 정적 데이터 ───────────────────────────────────────────────────────────────

/** 종목 메타 */
interface SportOption {
  value: SportType
  label: string       // 한글
  labelEn: string     // IAMAPLAYER 영문
  /** 24×24 인라인 SVG path 배열 */
  iconPaths: string[]
}

const SPORT_OPTIONS: SportOption[] = [
  {
    value: 'BASEBALL',
    label: '야구',
    labelEn: 'BASEBALL',
    iconPaths: [
      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
      'M8.5 5.5 C10 8 10 10 9 12 C8 14 7.5 16 8.5 18.5',
      'M15.5 5.5 C14 8 14 10 15 12 C16 14 16.5 16 15.5 18.5',
    ],
  },
  {
    value: 'SOCCER',
    label: '축구',
    labelEn: 'SOCCER',
    iconPaths: [
      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
      'M12 7l2.5 1.8-.95 3-3.1 0-.95-3L12 7z',
      'M7.2 9.5L5 11.5l.8 3 2.5-.5.9-2.8-2-1.7z',
      'M16.8 9.5L19 11.5l-.8 3-2.5-.5-.9-2.8 2-1.7z',
      'M9.2 17.2l.5-2.7 2.3.5 2.3-.5.5 2.7-2.8.8-2.8-.8z',
    ],
  },
  {
    value: 'BASKETBALL',
    label: '농구',
    labelEn: 'BASKETBALL',
    iconPaths: [
      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
      'M12 2 L12 22',
      'M2 12 L22 12',
      'M5.5 5.5 C8 9 8 15 5.5 18.5',
      'M18.5 5.5 C16 9 16 15 18.5 18.5',
    ],
  },
  {
    value: 'VOLLEYBALL',
    label: '배구',
    labelEn: 'VOLLEYBALL',
    iconPaths: [
      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
      'M4.5 7.5 C8 9 12 8.5 16 6',
      'M3.5 14 C7 13 12 13.5 16.5 16',
      'M12 2 C10 6 10 10 12 14 C14 18 14 20 12 22',
    ],
  },
  {
    value: 'ESPORTS',
    label: '이스포츠',
    labelEn: 'E-SPORTS',
    iconPaths: [
      'M6 10 C6 7 8 5 12 5 C16 5 18 7 18 10 L19 16 C19 18 17 19 16 18 L14 16 L10 16 L8 18 C7 19 5 18 5 16 Z',
      'M9 10 L9 12 M8 11 L10 11',
      'M15 10.5 a0.5 0.5 0 1 0 0-.01',
      'M16.5 12 a0.5 0.5 0 1 0 0-.01',
    ],
  },
]


/** 팀 데이터 */
interface TeamData {
  name: string
  /** 팀 대표 컬러 — 불가피한 하드코딩 (팀 브랜드 컬러) */
  color: string
}

/**
 * 종목별 팀 목록
 * color: 각 구단의 공식 1차 컬러 (하드코딩 불가피 — 라이트/다크 무관하게 팀 아이덴티티 표현)
 */
const TEAMS_BY_SPORT: Record<SportType, TeamData[]> = {
  SOCCER: [
    // EPL
    {name: '토트넘', color: '#132257'},
    {name: '맨유', color: '#DA291C'},
    {name: '첼시', color: '#034694'},
    {name: '맨시티', color: '#6CABDD'},
    {name: '리버풀', color: '#C8102E'},
    {name: '아스날', color: '#EF0107'},
    {name: '뉴캐슬', color: '#241F20'},
    {name: '에버튼', color: '#003399'},
    // 라리가
    {name: '레알 마드리드', color: '#FEBE10'},
    {name: '바르셀로나', color: '#A50044'},
    {name: '아틀레티코 마드리드', color: '#CB3524'},
    {name: '빌바오', color: '#EE2523'},
    // 분데스리가
    {name: '바이에른 뮌헨', color: '#DC052D'},
    {name: '보루시아 도르트문트', color: '#FDE100'},
    {name: '레버쿠젠', color: '#E32221'},
    // 세리에A
    {name: '인터 밀란', color: '#010E80'},
    {name: '유벤투스', color: '#000000'},
    {name: 'AC 밀란', color: '#FB090B'},
    {name: 'AS 로마', color: '#8E1F2F'},
    // 리그앙
    {name: '파리 생제르맹', color: '#004170'},
    {name: '올랭피크 마르세유', color: '#009AC7'},
    {name: '올랭피크 리옹', color: '#003B8E'},
    // K리그
    {name: '전북 현대', color: '#004C97'},
    {name: 'FC 서울', color: '#C8102E'},
    {name: '울산 HD', color: '#0070B8'},
    {name: '포항 스틸러스', color: '#E31937'},
    {name: '수원 삼성', color: '#005BAC'},
    // 국가대표
    {name: '대한민국', color: '#C60C30'},
    {name: '일본', color: '#003087'},
    {name: '브라질', color: '#009C3B'},
    {name: '독일', color: '#000000'},
    {name: '잉글랜드', color: '#012169'},
    {name: '프랑스', color: '#002395'},
    {name: '스페인', color: '#AA151B'},
    {name: '아르헨티나', color: '#74ACDF'},
  ],
  BASEBALL: [
    // KBO
    {name: '두산 베어스', color: '#131230'},
    {name: 'LG 트윈스', color: '#C30452'},
    {name: '키움 히어로즈', color: '#820024'},
    {name: '한화 이글스', color: '#FF6600'},
    {name: 'SSG 랜더스', color: '#CE0E2D'},
    {name: 'NC 다이노스', color: '#315288'},
    {name: 'KT 위즈', color: '#000000'},
    {name: '삼성 라이온즈', color: '#074CA1'},
    {name: 'KIA 타이거즈', color: '#EA0029'},
    {name: '롯데 자이언츠', color: '#002B5B'},
    // MLB
    {name: 'LA 다저스', color: '#005A9C'},
    {name: '뉴욕 양키스', color: '#003087'},
    {name: '보스턴 레드삭스', color: '#BD3039'},
    {name: '뉴욕 메츠', color: '#002D72'},
    {name: '샌디에이고 파드리스', color: '#2F241D'},
  ],
  BASKETBALL: [
    // KBL
    {name: '서울 SK 나이츠', color: '#E31837'},
    {name: '원주 DB 프로미', color: '#003A8C'},
    {name: '안양 KGC 인삼공사', color: '#8B0000'},
    {name: '전주 KCC 이지스', color: '#004B9B'},
    {name: '서울 삼성 썬더스', color: '#1D5492'},
    // NBA
    {name: 'LA 레이커스', color: '#552583'},
    {name: '골든스테이트 워리어스', color: '#1D428A'},
    {name: '보스턴 셀틱스', color: '#007A33'},
    {name: '시카고 불스', color: '#CE1141'},
    {name: '마이애미 히트', color: '#98002E'},
  ],
  VOLLEYBALL: [
    // V리그
    {name: '현대캐피탈 스카이워커스', color: '#003087'},
    {name: '대한항공 점보스', color: '#0032A0'},
    {name: 'KB손해보험 스타즈', color: '#FFCD00'},
    {name: '우리카드 우리WON', color: '#003087'},
    {name: '한국전력 빅스톰', color: '#003087'},
    {name: 'GS칼텍스 서울 KIXX', color: '#0066CC'},
    {name: '흥국생명 핑크스파이더스', color: '#E4007F'},
    {name: '현대건설 힐스테이트', color: '#005BAC'},
  ],
  ESPORTS: [
    // LCK
    {name: 'T1', color: '#C89B3C'},
    {name: 'Gen.G', color: '#8B7536'},
    {name: '한화생명 e스포츠', color: '#FF6600'},
    {name: '농심 레드포스', color: '#E31837'},
    {name: 'KT 롤스터', color: '#E60012'},
    {name: 'DRX', color: '#1E3A8A'},
    {name: '광동 프릭스', color: '#FF5A00'},
    // LPL
    {name: 'JDG', color: '#1A1A1A'},
    {name: 'BLG', color: '#003087'},
    {name: 'Weibo Gaming', color: '#E60012'},
    {name: 'EDward Gaming', color: '#E60012'},
    // LEC
    {name: 'G2 Esports', color: '#1A1A1A'},
    {name: 'Fnatic', color: '#FF6600'},
    {name: 'Team Vitality', color: '#FAED02'},
  ],
}

const MAX_TEAMS = 5  // 구단 최대 선택 수

// ── 헬퍼 함수 ────────────────────────────────────────────────────────────────

/** 선택된 종목 배열에서 사용 가능한 팀 목록 반환 (중복 제거) */
function getAvailableTeams(sports: SportType[]): TeamData[] {
  const seen = new Set<string>()
  return sports.flatMap((s) => TEAMS_BY_SPORT[s]).filter((t) => {
    if (seen.has(t.name)) return false
    seen.add(t.name)
    return true
  })
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** StepIndicator — 3단계 진행 표시 (RegisterPage와 동일 스타일) */
function StepIndicator({current}: { current: 1 | 2 | 3 }) {
  const steps = [
    {n: 1, label: '계정 정보'},
    {n: 2, label: '관심 설정'},
    {n: 3, label: '완료'},
  ]
  return (
    <div className="flex items-center mb-8">
      {steps.map((step, idx) => {
        const isDone = step.n < current
        const isActive = step.n === current
        return (
          <div key={step.n} className="contents">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-medium transition-colors"
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
                {isDone ? <Check size={14} strokeWidth={2.5} color="#fff"/> : step.n}
              </div>
              <span
                className="text-[13px] whitespace-nowrap"
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
                style={{background: isDone ? 'var(--color-success)' : 'var(--color-border)'}}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** SportIcon — 종목별 인라인 SVG */
function SportIcon({paths, size = 26, color = 'currentColor'}: {
  paths: string[]
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d, i) => <path key={i} d={d}/>)}
    </svg>
  )
}

/** SportCard — 종목 선택 카드 (복수 선택) */
function SportCard({
                     option, selected, onClick,
                   }: {
  option: SportOption
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-[10px] transition-all duration-150 cursor-pointer select-none flex-1 min-w-[60px]"
      style={{
        background: selected ? 'var(--color-accent-subtle)' : 'var(--color-surface-sunken)',
        border: selected ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
        color: selected ? 'var(--color-accent)' : 'var(--color-text-sub)',
      }}
      aria-pressed={selected}
    >
      <SportIcon
        paths={option.iconPaths}
        size={24}
        color={selected ? 'var(--color-accent)' : 'var(--color-text-hint)'}
      />
      <span
        className="text-[12px] tracking-widest leading-none"
        style={{
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
          color: selected ? 'var(--color-accent)' : 'var(--color-text-hint)'
        }}
      >
        {option.labelEn}
      </span>
      <span
        className="text-[13px] font-semibold"
        style={{color: selected ? 'var(--color-accent)' : 'var(--color-text-main)'}}
      >
        {option.label}
      </span>
    </button>
  )
}

/** TeamCard — 구단 선택 카드 */
function TeamCard({
                    team, selected, disabled, onClick,
                  }: {
  team: TeamData
  selected: boolean
  disabled: boolean   // MAX_TEAMS 초과 시 비선택 카드 비활성
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 p-3 rounded-[10px] transition-all duration-150 cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: selected ? 'var(--color-surface-sunken)' : 'var(--color-surface-sunken)',
        border: selected
          ? '2px solid var(--color-accent)'
          : '1.5px solid var(--color-border)',
      }}
      aria-pressed={selected}
    >
      {/* 팀 컬러 스와치 — 팀 브랜드 컬러 하드코딩 불가피 */}
      <div
        className="w-8 h-8 rounded-[6px] flex-shrink-0"
        style={{background: team.color}}
      />
      <div className="min-w-0">
        <p
          className="text-[13px] font-semibold truncate"
          style={{color: selected ? 'var(--color-accent)' : 'var(--color-text-main)'}}
        >
          {team.name}
        </p>
      </div>
    </button>
  )
}

/**
 * SelectionBadge — 선택 요약 영역의 개별 뱃지
 * label: 표시 텍스트, onRemove: X 클릭 핸들러
 */
function SelectionBadge({label, onRemove}: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-[13px] font-medium"
      style={{
        background: 'var(--color-primary)',
        color: '#fff',
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
        style={{background: 'rgba(255,255,255,0.2)'}}
        aria-label={`${label} 선택 해제`}
      >
        <XIcon size={10} strokeWidth={2.5} color="#fff"/>
      </button>
    </span>
  )
}

/** SectionLabel — 섹션 제목 */
function SectionLabel({children, hint}: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span
        className="text-[14px] font-semibold"
        style={{color: 'var(--color-text-main)'}}
      >
        {children}
      </span>
      {hint && (
        <span className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
          {hint}
        </span>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  // ── 상태 ────────────────────────────────────────────────────────────────────
  const [selectedSports, setSelectedSports] = useState<SportType[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')

  const navigate = useNavigate()
  const {mutate: saveInterest, isPending, error} = useOnboarding()

  // ── 파생 데이터 ─────────────────────────────────────────────────────────────
  /** 선택된 종목에 해당하는 전체 팀 목록 */
  const availableTeams = getAvailableTeams(selectedSports)

  // ── 핸들러 — 종목 ───────────────────────────────────────────────────────────
  const toggleSport = useCallback((sport: SportType) => {
    setSelectedSports((prev) => {
      if (prev.includes(sport)) {
        // 종목 제거 → 해당 종목 팀도 연쇄 제거
        const removedTeamNames = new Set(TEAMS_BY_SPORT[sport].map((t) => t.name))
        setSelectedTeams((ts) => ts.filter((t) => !removedTeamNames.has(t)))
        return prev.filter((s) => s !== sport)
      }
      return [...prev, sport]
    })
  }, [])

  // ── 핸들러 — 구단 ───────────────────────────────────────────────────────────
  const toggleTeam = useCallback((teamName: string) => {
    setSelectedTeams((prev) => {
      if (prev.includes(teamName)) return prev.filter((t) => t !== teamName)
      if (prev.length >= MAX_TEAMS) return prev  // 최대 초과 시 무시
      return [...prev, teamName]
    })
  }, [])

  // ── 핸들러 — 키워드 ─────────────────────────────────────────────────────────
  /** 입력값을 파싱해 태그 추가 (쉼표/Enter 기준) */
  const commitKeywords = useCallback((raw: string) => {
    const tokens = raw
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 30)
    if (tokens.length === 0) return
    setKeywords((prev) => {
      const next = [...prev]
      tokens.forEach((t) => {
        if (!next.includes(t)) next.push(t)
      })
      return next
    })
    setKwInput('')
  }, [])

  const handleKwKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        commitKeywords(kwInput)
      } else if (e.key === 'Backspace' && kwInput === '' && keywords.length > 0) {
        // 입력창이 비어있을 때 Backspace → 마지막 키워드 제거
        setKeywords((prev) => prev.slice(0, -1))
      }
    },
    [kwInput, keywords, commitKeywords],
  )

  const handleKwBlur = useCallback(() => {
    if (kwInput.trim()) commitKeywords(kwInput)
  }, [kwInput, commitKeywords])

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  // ── 핸들러 — 제출 ───────────────────────────────────────────────────────────
  function handleComplete() {
    if (isPending) return
    // 키워드 입력창에 미완성 텍스트가 있으면 함께 제출
    const finalKeywords = kwInput.trim()
      ? [...keywords, ...kwInput.split(/[,，]/).map((s) => s.trim()).filter(Boolean)]
      : keywords
    // 백엔드 OnboardingRequestDTO: sport(단일), team(단일 선택), keywords[]
    // UI에서 복수 선택 가능하지만 백엔드는 단일 값만 수신
    saveInterest({
      sport: selectedSports[0] ?? 'BASEBALL',   // 첫 번째 선택 종목
      team: selectedTeams[0] ?? undefined,     // 첫 번째 선택 구단 (없으면 undefined)
      keywords: finalKeywords,
    })
  }

  function handleSkip() {
    navigate('/', {replace: true})
  }

  // ── 선택 요약 데이터 (하단 뱃지) ──────────────────────────────────────────
  const hasAnySelection =
    selectedSports.length > 0 ||
    selectedTeams.length > 0 ||
    keywords.length > 0

  // 서버 에러
  const serverError = error
    ? '관심 설정 저장 중 오류가 발생했습니다. 다시 시도하거나 건너뛰세요.'
    : null

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="w-full max-w-[680px] rounded-2xl overflow-hidden shadow-card"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 상단 navy 액센트 바 */}
      <div className="h-[3px]" style={{background: 'var(--color-primary)'}}/>

      <div className="px-8 py-8">
        {/* 로고 */}
        <div className="mb-6">
          <Logo variant="main" height={26}/>
        </div>

        {/* 스텝 인디케이터 */}
        <StepIndicator current={2}/>

        {/* 페이지 제목 */}
        <div className="mb-7">
          <h1 className="text-[20px] font-semibold text-[var(--color-text-main)] mb-1">
            관심 종목과 구단을 선택하세요
          </h1>
          <p className="text-[14px] text-[var(--color-text-sub)]">
            선택한 정보를 기반으로 맞춤 매물과 알림을 제공합니다.
          </p>
        </div>

        {/* ── 1. 종목 선택 ── */}
        <div className="mb-6">
          <SectionLabel hint="복수 선택 가능">종목 선택</SectionLabel>
          <div className="flex gap-2">
            {SPORT_OPTIONS.map((opt) => (
              <SportCard
                key={opt.value}
                option={opt}
                selected={selectedSports.includes(opt.value)}
                onClick={() => toggleSport(opt.value)}
              />
            ))}
          </div>
        </div>


        {/* ── 2. 관심 구단 (종목 선택 후 노출) ── */}
        {selectedSports.length > 0 && (
          <div
            className="mb-6 animate-fadeInUp"
            style={{animationDuration: '180ms', animationFillMode: 'both'}}
          >
            <SectionLabel hint={`최대 ${MAX_TEAMS}개 · ${selectedTeams.length}/${MAX_TEAMS} 선택됨`}>
              관심 구단
            </SectionLabel>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableTeams.map((team) => {
                const isSelected = selectedTeams.includes(team.name)
                const isDisabled = !isSelected && selectedTeams.length >= MAX_TEAMS
                return (
                  <TeamCard
                    key={team.name}
                    team={team}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggleTeam(team.name)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── 3. 관심 키워드 ── */}
        <div className="mb-6">
          <SectionLabel hint="직접 입력 · Enter 또는 쉼표로 추가">관심 키워드</SectionLabel>
          <input
            type="text"
            className="input-base w-full"
            placeholder="예: 손흥민, 레트로, 국대"
            value={kwInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setKwInput(e.target.value)}
            onKeyDown={handleKwKeyDown}
            onBlur={handleKwBlur}
            maxLength={50}
          />
          {/* 키워드 태그 목록 */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[13px] font-medium"
                  style={{
                    background: 'var(--color-surface-sunken)',
                    border: '1.5px solid var(--color-border-strong)',
                    color: 'var(--color-text-main)',
                  }}
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                    style={{background: 'var(--color-border-strong)'}}
                    aria-label={`키워드 ${kw} 제거`}
                  >
                    <XIcon size={9} strokeWidth={2.5} style={{color: 'var(--color-text-hint)'}}/>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. 선택 요약 뱃지 ── */}
        {hasAnySelection && (
          <div
            className="mb-6 p-4 rounded-[10px] animate-fadeInUp"
            style={{
              background: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border)',
              animationDuration: '200ms',
              animationFillMode: 'both',
            }}
          >
            <p
              className="text-[13px] font-semibold uppercase tracking-wide mb-3"
              style={{color: 'var(--color-text-hint)'}}
            >
              선택된 항목
            </p>
            <div className="flex flex-wrap gap-2">
              {/* 종목 뱃지 */}
              {selectedSports.map((sport) => {
                const label = SPORT_OPTIONS.find((o) => o.value === sport)?.label ?? sport
                return (
                  <SelectionBadge
                    key={`sport-${sport}`}
                    label={label}
                    onRemove={() => toggleSport(sport)}
                  />
                )
              })}
              {/* 구단 뱃지 */}
              {selectedTeams.map((team) => (
                <SelectionBadge
                  key={`team-${team}`}
                  label={team}
                  onRemove={() => toggleTeam(team)}
                />
              ))}
              {/* 키워드 뱃지 */}
              {keywords.map((kw) => (
                <SelectionBadge
                  key={`kw-${kw}`}
                  label={`# ${kw}`}
                  onRemove={() => removeKeyword(kw)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 서버 에러 */}
        {serverError && (
          <div
            className="text-[14px] mb-4 px-4 py-3 rounded-[8px]"
            style={{
              color: 'var(--color-error)',
              background: 'rgba(255,46,77,0.07)',
              border: '1px solid rgba(255,46,77,0.2)',
            }}
            role="alert"
          >
            {serverError}
          </div>
        )}

        {/* ── 액션 버튼 ── */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending}
            className="w-full h-[52px] rounded-[10px] text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            style={{background: 'var(--color-primary)'}}
          >
            {isPending ? (
              '저장 중...'
            ) : (
              <>
                완료 — 시작하기
                <ChevronRight size={18} strokeWidth={2}/>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending}
            className="w-full h-[44px] rounded-[10px] text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            style={{color: 'var(--color-text-hint)', background: 'transparent'}}
          >
            <SkipForward size={15} strokeWidth={1.75}/>
            나중에 설정하기
          </button>
        </div>
      </div>
    </div>
  )
}
