/**
 * HomePage — 홈 피드 (Screen 1)
 *
 * 구성:
 *   SportFilterBar   — 종목 탭 (GNB 바로 아래)
 *   HeroSection        — navy 배경, 피처 상품 + 통계
 *   [Sidebar | Grid]   — 필터 사이드바(220px) + 상품 5열 그리드
 *
 * 상태: 로컬 필터 (추후 URL params + useQuery 전환)
 * 데이터: 통계 — /api/statistics (백엔드 연동), 상품 목록 — /api/listings (백엔드 연동)
 */
import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {ChevronDown, ChevronUp, Heart, Loader2, RotateCcw, Search, SlidersHorizontal, Sparkles, X} from 'lucide-react'
import {useQuery} from '@tanstack/react-query'
import {formatPrice} from '../utils/format'
import {resolveImageUrl} from '../utils/image'
import type {PostCard} from '../features/listing/api/listingApi'
import {getListings, toggleWish} from '../features/listing/api/listingApi'
import {getStatistics} from '../features/statistics/api/statisticsApi'
import type {StatisticsResponse} from '../features/statistics/api/statisticsApi'
import type {DeliveryType, Grade, Sport} from '../types/listing'
import ConditionBadge from '../components/ui/ConditionBadge'
import Pagination from '../components/ui/Pagination'

// ── 필터 상수 ─────────────────────────────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'BASEBALL', label: '야구'},
  {key: 'SOCCER', label: '축구'},
  {key: 'BASKETBALL', label: '농구'},
  {key: 'VOLLEYBALL', label: '배구'},
  {key: 'ESPORTS', label: 'e스포츠'},
  {key: 'ETC', label: '기타'},
]

const GRADE_OPTIONS: { key: Grade | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'S', label: 'S급'},
  {key: 'A', label: 'A급'},
  {key: 'B', label: 'B급'},
  {key: 'C', label: 'C급'},
]

const SIZE_OPTIONS = ['전체', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

const DELIVERY_OPTIONS: { key: DeliveryType | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'DELIVERY', label: '택배'},
  {key: 'DIRECT', label: '직거래'},
  {key: 'BOTH', label: '모두 가능'},
]

const SORT_OPTIONS = [
  {key: 'ai_recommend', label: 'AI추천'},
  {key: 'latest', label: '최신순'},
  {key: 'popular', label: '인기순'},
  {key: 'price_asc', label: '낮은가격'},
  {key: 'price_desc', label: '높은가격'},
]

// ── 유틸 ──────────────────────────────────────────────────────────────────────


// ── 상품 카드 (SearchPage와 동일한 스타일) ───────────────────────────────────

/**
 * ProductCard — SearchPage와 동일한 4/5 비율·네이비 배경·외부 찜버튼 구조
 * isWished: wishedOverride 적용 후 최종 찜 상태
 */
function ProductCard({
                       item,
                       isWished,
                       onLike,
                     }: {
  item: PostCard
  isWished: boolean
  onLike: (postId: number) => void
}) {
  const imgSrc = resolveImageUrl(item.thumbnailUrl)
  return (
    <article
      className="rounded-xl overflow-hidden transition-shadow hover:shadow-md relative"
      style={{border: '1px solid var(--color-border)', background: 'var(--color-surface)'}}
    >
      <Link to={`/listing/${item.postId}`} className="block no-underline">
        {/* 썸네일 — API 이미지 우선, 없으면 네이비 플레이스홀더 */}
        <div className="relative" style={{aspectRatio: '4/5', background: '#1A3051'}}>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <>
              {/* 대각선 스트라이프 배경 */}
              <div
                className="absolute inset-0"
                style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}
              />
              {/* 등번호 워터마크 */}
              <span
                className="absolute inset-0 flex items-center justify-center select-none"
                style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 80, color: 'rgba(255,255,255,.13)'}}
              >
                {item.postId % 99}
              </span>
            </>
          )}
          {/* 등급 배지 */}
          <ConditionBadge grade={item.grade} size="sm" className="absolute top-2 left-2"/>
        </div>
        
        {/* 정보 영역 */}
        <div className="p-3">
          <p className="text-[13px] mb-0.5" style={{color: 'var(--color-text-hint)'}}>{item.team}</p>
          <p className="text-sm font-semibold leading-snug line-clamp-2" style={{color: 'var(--color-text-main)'}}>
            {item.title}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span
              className="font-bold text-sm"
              style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            >
              {formatPrice(item.price)}
            </span>
            <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>{item.timeAgo}</span>
          </div>
        </div>
      </Link>
      
      {/* 찜 버튼 — Link 바깥 (article 위에 absolute) */}
      <button
        onClick={() => onLike(item.postId)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{background: 'rgba(255,255,255,.88)'}}
        aria-label="찜하기"
      >
        <Heart
          size={15}
          fill={isWished ? 'var(--color-accent)' : 'none'}
          color={isWished ? 'var(--color-accent)' : '#0D1B2A'}
        />
      </button>
    </article>
  )
}


// SportFilterBar 컴포넌트 제거됨 — 종목 탭은 FilterSidebar 내부로 이동 (2026-05-14)

// ── Hero 섹션 ─────────────────────────────────────────────────────────────────

/**
 * HeroSection — navy 배경의 피처 상품 + 통계 영역
 *
 * @param stats  백엔드 /api/statistics 응답. null이면 스켈레톤 표시.
 */
function HeroSection({stats}: {stats: StatisticsResponse | null}) {
  /**
   * 숫자를 로케일 형식으로 변환 (예: 31500 → "31,500")
   * 만족도는 뒤에 % 붙임
   */
  function fmt(value: number, suffix = '') {
    return value.toLocaleString('ko-KR') + suffix
  }

  // 통계 항목 정의 (백엔드 필드 → 레이블 매핑)
  const statItems = stats
    ? [
        {num: fmt(stats.tradeCount),   lbl: '누적 거래'},
        {num: fmt(stats.productCount), lbl: '등록 상품'},
        {num: fmt(stats.memberCount),  lbl: '활성 회원'},
        {num: fmt(stats.satisfaction, '%'), lbl: '만족도'},
      ]
    : [
        // stats 로딩 전 플레이스홀더 — 레이아웃 shift 방지
        {num: '—', lbl: '누적 거래'},
        {num: '—', lbl: '등록 상품'},
        {num: '—', lbl: '활성 회원'},
        {num: '—', lbl: '만족도'},
      ]

  return (
    <div
      className="relative overflow-hidden px-8 py-10"
      style={{background: 'var(--color-primary)'}}
    >
      {/* 장식 원 */}
      <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none"
           style={{border: '36px solid rgba(255,255,255,0.03)'}}/>
      <div className="absolute right-20 -bottom-16 w-44 h-44 rounded-full pointer-events-none"
           style={{border: '24px solid rgba(255,255,255,0.03)'}}/>

      <div className="max-w-[1126px] mx-auto flex items-center gap-12">
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] tracking-[2px] uppercase mb-2 font-medium" style={{color: 'var(--color-accent)'}}>
            FEATURED LISTING
          </p>
          <h2
            className="text-[48px] sm:text-[56px] leading-[1] text-white mb-3"
            style={{fontFamily: "'Giants-Inline','IAMAPLAYER',Giants,sans-serif", letterSpacing: '2px'}}
          >
            MAN UTD 23/24<br/>
            <span style={{color: 'var(--color-accent)'}}>HOME</span> AUTHENTIC
          </h2>
          <p className="text-[14px] mb-6 leading-relaxed" style={{color: 'rgba(255,255,255,0.5)'}}>
            Size M · Grade S · 안전결제 지원
          </p>
          <div className="flex gap-2.5">
            <Link
              to="/listing/1"
              className="inline-flex items-center h-11 px-7 rounded-[10px] text-[15px] font-medium text-white no-underline hover:text-white transition-opacity hover:opacity-90"
              style={{background: 'var(--color-accent)'}}
            >
              지금 보기
            </Link>
            <button
              type="button"
              className="h-11 px-7 rounded-[10px] text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              style={{border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)'}}
            >
              찜하기
            </button>
          </div>

          {/* 통계 바 — /api/statistics 실시간 조회 */}
          <div
            className="flex gap-8 mt-8 pt-6"
            style={{borderTop: '1px solid rgba(255,255,255,0.08)'}}
          >
            {statItems.map(({num, lbl}) => (
              <div key={lbl}>
                <p
                  className="text-[28px] leading-none text-white"
                  style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                >
                  {num}
                </p>
                <p className="text-[13px] mt-1 tracking-[0.5px]" style={{color: 'rgba(255,255,255,0.4)'}}>
                  {lbl}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 장식 일러스트 (데스크탑만) — 대각선 패턴 + 숫자 워터마크 */}
        <div className="hidden md:flex items-center justify-center w-56 flex-shrink-0 relative select-none">
          <div
            className="w-36 h-44 rounded-2xl relative overflow-hidden"
            style={{transform: 'rotate(-4deg)', background: '#B5222B', opacity: 0.9}}
          >
            <div className="absolute inset-0"
                 style={{backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 2px,transparent 2px 16px)'}}/>
            <span className="absolute inset-0 flex items-end justify-center pb-4"
                  style={{
                    fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                    fontSize: 64,
                    color: 'rgba(255,255,255,.25)'
                  }}>7</span>
          </div>
          <div
            className="absolute right-6 -bottom-4 w-28 h-36 rounded-2xl overflow-hidden"
            style={{transform: 'rotate(6deg)', background: 'rgba(255,255,255,.12)', zIndex: 0}}
          >
            <div className="absolute inset-0"
                 style={{backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 2px,transparent 2px 16px)'}}/>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── 필터 섹션 (SearchPage와 동일한 구조) ─────────────────────────────────────

/**
 * FilterSection — 접을 수 있는 필터 그룹 래퍼
 * SearchPage의 FilterSection과 동일한 컴포넌트
 */
function FilterSection({title, children, collapsible, open, onToggle}: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}) {
  return (
    <div style={{padding: '14px 16px', borderBottom: '1px solid var(--color-border)'}}>
      <button
        className="w-full flex items-center justify-between mb-2"
        onClick={collapsible ? onToggle : undefined}
        style={{cursor: collapsible ? 'pointer' : 'default'}}
      >
        <span
          className="text-xs font-semibold tracking-widest"
          style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          {title}
        </span>
        {collapsible && (open
            ? <ChevronUp size={14} color="var(--color-text-hint)"/>
            : <ChevronDown size={14} color="var(--color-text-hint)"/>
        )}
      </button>
      {(!collapsible || open) && children}
    </div>
  )
}

/**
 * FilterContent — 필터 패널 내용 (SearchPage와 동일한 디자인)
 * 데스크탑 사이드바 & 모바일 드로어 양쪽에서 공용
 */
function FilterContent({
                         sport, setSport,
                         grade, setGrade,
                         size, setSize,
                         delivery, setDelivery,
                         maxPrice, setMaxPrice,
                         onReset,
                       }: {
  sport: Sport | 'all'
  setSport: (v: Sport | 'all') => void
  grade: Grade | 'all'
  setGrade: (v: Grade | 'all') => void
  size: string
  setSize: (v: string) => void
  delivery: DeliveryType | 'all'
  setDelivery: (v: DeliveryType | 'all') => void
  maxPrice: number
  setMaxPrice: (v: number) => void
  onReset: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 필터 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{borderColor: 'var(--color-border)'}}
      >
        <span className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>필터</span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{color: 'var(--color-accent)'}}
        >
          <RotateCcw size={12}/>초기화
        </button>
      </div>
      
      {/* 종목 */}
      <FilterSection title="SPORT">
        <div className="flex flex-col gap-0.5">
          {SPORT_OPTIONS.map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="radio"
                checked={sport === o.key}
                onChange={() => setSport(o.key)}
                className="accent-[var(--color-primary)]"
              />
              <span
                className="text-sm"
                style={{
                  color: sport === o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)',
                  fontWeight: sport === o.key ? 600 : 400,
                }}
              >
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
      
      {/* 컨디션 */}
      <FilterSection title="CONDITION">
        <div className="grid grid-cols-4 gap-1.5">
          {GRADE_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setGrade(o.key)}
              className="py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: grade === o.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                color: grade === o.key ? '#fff' : 'var(--color-text-sub)',
                border: `1px solid ${grade === o.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </FilterSection>
      
      {/* 사이즈 */}
      <FilterSection title="SIZE">
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: size === s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                color: size === s ? '#fff' : 'var(--color-text-sub)',
                border: `1px solid ${size === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
      
      {/* 거래 방식 */}
      <FilterSection title="TRADE">
        <div className="flex flex-col gap-0.5">
          {DELIVERY_OPTIONS.map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input
                type="radio"
                checked={delivery === o.key}
                onChange={() => setDelivery(o.key)}
                className="accent-[var(--color-primary)]"
              />
              <span
                className="text-sm"
                style={{
                  color: delivery === o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)',
                  fontWeight: delivery === o.key ? 600 : 400,
                }}
              >
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
      
      {/* 가격 범위 */}
      <FilterSection title="PRICE">
        <p
          className="text-sm font-bold mb-2"
          style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
        >
          ₩0 — ₩{(maxPrice * 1000).toLocaleString('ko-KR')}
        </p>
        <input
          type="range"
          min={10}
          max={300}
          value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full"
          style={{accentColor: 'var(--color-accent)'}}
        />
      </FilterSection>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function HomePage() {
  /* ── 필터 상태 (SearchPage와 동일한 개별 state 방식) ── */
  const [sport, setSport] = useState<Sport | 'all'>('all')
  const [grade, setGrade] = useState<Grade | 'all'>('all')
  const [size, setSize] = useState('전체')              // 클라이언트 측 필터링
  const [delivery, setDelivery] = useState<DeliveryType | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState(300)         // 슬라이더: 10~300 (×1000원)
  const [sort, setSort] = useState<'latest' | 'price_asc' | 'price_desc' | 'popular' | 'ai_recommend'>('latest')
  const [page, setPage] = useState(0)                   // 0-based 페이지
  
  /* ── UI 상태 ── */
  const [filterOpen, setFilterOpen] = useState(false)   // 모바일 필터 드로어
  const [searchInput, setSearchInput] = useState('')     // 키워드 검색창
  const navigate = useNavigate()
  
  /* ── 찜 낙관적 UI (postId → 최종 찜 여부 오버라이드) ── */
  const [wishedOverride, setWishedOverride] = useState<Map<number, boolean>>(new Map())
  
  /* ── 필터 변경 시 page 0 초기화 래퍼 ── */
  function setSportR(v: Sport | 'all') {
    setSport(v);
    setPage(0)
  }
  
  function setGradeR(v: Grade | 'all') {
    setGrade(v);
    setPage(0)
  }
  
  function setSizeR(v: string) {
    setSize(v);
    setPage(0)
  }
  
  function setDeliveryR(v: DeliveryType | 'all') {
    setDelivery(v);
    setPage(0)
  }
  
  function setMaxPriceR(v: number) {
    setMaxPrice(v);
    setPage(0)
  }
  
  /* ── 필터 전체 초기화 ── */
  function resetFilter() {
    setSport('all');
    setGrade('all');
    setSize('전체')
    setDelivery('all');
    setMaxPrice(300);
    setPage(0)
  }
  
  /* ── API 파라미터 ── */
  const queryParams = {
    sport: sport !== 'all' ? sport : undefined,
    condition: grade !== 'all' ? grade : undefined,
    tradeType: delivery !== 'all' ? delivery : undefined,
    maxPrice: maxPrice < 300 ? maxPrice * 1000 : undefined,
    // 'ai_recommend' 선택 시 백엔드 popular 폴백 (백엔드 구현 후 직접 전달 예정)
    sort: sort === 'ai_recommend' ? 'popular' : sort,
    page,
    size: 20,
  }
  
  /* ── 메인 통계 조회 (/api/statistics) ── */
  const {data: statsData} = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    staleTime: 60_000,          // 1분 캐시 (Redis 갱신 주기 고려)
    retry: false,               // 실패해도 폴백(—) 표시로 충분
  })

  /* ── 판매글 목록 조회 ── */
  const {data, isLoading, isError} = useQuery({
    queryKey: ['listings', queryParams],
    queryFn: () => getListings(queryParams),
    staleTime: 30_000,
    placeholderData: prev => prev,   // 필터 바뀌어도 이전 결과 유지
  })
  
  /* ── 사이즈 클라이언트 필터 + 찜 오버라이드 병합 ── */
  const allItems: PostCard[] = data?.content ?? []
  const results: PostCard[] = size !== '전체'
    ? allItems.filter(item => item.size === size)
    : allItems
  
  const totalPages = data?.totalPages ?? 1
  
  /* ── 찜 토글 ── */
  async function toggleLike(postId: number) {
    const current = wishedOverride.has(postId)
      ? wishedOverride.get(postId)!
      : (allItems.find(i => i.postId === postId)?.isWished ?? false)
    setWishedOverride(prev => new Map(prev).set(postId, !current))
    try {
      await toggleWish(postId)
    } catch {
      setWishedOverride(prev => new Map(prev).set(postId, current))
    }
  }
  
  function isItemWished(item: PostCard): boolean {
    return wishedOverride.has(item.postId)
      ? wishedOverride.get(item.postId)!
      : item.isWished
  }
  
  /* ── 활성 필터 수 (모바일 배지용) ── */
  const activeFilterCount = [
    sport !== 'all', grade !== 'all',
    size !== '전체', delivery !== 'all', maxPrice < 300,
  ].filter(Boolean).length
  
  /* ── FilterContent에 전달할 props ── */
  const filterProps = {
    sport, setSport: setSportR,
    grade, setGrade: setGradeR,
    size, setSize: setSizeR,
    delivery, setDelivery: setDeliveryR,
    maxPrice, setMaxPrice: setMaxPriceR,
    onReset: resetFilter,
  }
  
  return (
    <div style={{background: 'var(--color-bg)'}}>
      {/* ── 히어로 — 통계 실시간 연동 ── */}
      <HeroSection stats={statsData ?? null}/>
      
      {/* ── 모바일 필터 드로어 오버레이 ── */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{background: 'rgba(13,27,42,.45)', backdropFilter: 'blur(2px)'}}
          onClick={() => setFilterOpen(false)}
        />
      )}
      {/* ── 모바일 필터 드로어 ── */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 md:hidden w-72 overflow-y-auto transition-transform duration-300"
        style={{
          background: 'var(--color-surface)',
          transform: filterOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: filterOpen ? '4px 0 24px rgba(0,33,71,.18)' : 'none',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{borderBottom: '1px solid var(--color-border)'}}
        >
          <span className="font-display font-bold" style={{color: 'var(--color-text-main)'}}>필터</span>
          <button onClick={() => setFilterOpen(false)} aria-label="닫기">
            <X size={20} color="var(--color-text-sub)"/>
          </button>
        </div>
        <FilterContent {...filterProps}/>
        <div className="p-4">
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{background: 'var(--color-primary)'}}
            onClick={() => setFilterOpen(false)}
          >
            적용하기
          </button>
        </div>
      </div>
      
      {/* ── 본문 ── */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6">
        
        {/* 키워드 검색창 — /search 로 이동 */}
        <form
          onSubmit={e => {
            e.preventDefault()
            const q = searchInput.trim()
            navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
          }}
          className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-2xl"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          <Search size={16} strokeWidth={1.75} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="유니폼, 구단, 선수명으로 검색..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{color: 'var(--color-text-main)'}}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="검색어 지우기"
              style={{color: 'var(--color-text-hint)'}}
            >
              <X size={14}/>
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex-shrink-0"
            style={{background: 'var(--color-primary)'}}
          >
            검색
          </button>
        </form>
        
        <div className="flex gap-6">
          
          {/* 데스크탑 필터 사이드바 */}
          <aside
            className="hidden md:block flex-shrink-0 rounded-2xl overflow-hidden sticky self-start"
            style={{
              width: 220,
              top: 72,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 12px -2px rgba(0,33,71,.08)',
            }}
          >
            <FilterContent {...filterProps}/>
          </aside>
          
          {/* 결과 영역 */}
          <div className="flex-1 min-w-0">
            {/* 정렬 + 모바일 필터 버튼 */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                {/* 모바일 필터 버튼 */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium relative"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-sub)',
                  }}
                >
                  <SlidersHorizontal size={15}/>
                  필터
                  {activeFilterCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[12px] font-bold text-white flex items-center justify-center"
                      style={{background: 'var(--color-accent)'}}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                  <span
                    className="font-bold"
                    style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                  >
                    {data?.totalElements ?? results.length}
                  </span>개 상품
                </span>
              </div>
              
              {/* 정렬 버튼 */}
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map(o => {
                  /* AI추천 버튼은 그라디언트 + Sparkles 아이콘으로 특별 스타일 적용 */
                  const isAi = o.key === 'ai_recommend'
                  const isActive = sort === o.key
                  return (
                    <button
                      key={o.key}
                      onClick={() => {
                        setSort(o.key as typeof sort);
                        setPage(0)
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1"
                      style={
                        isAi && isActive
                          ? {background: 'var(--color-accent)', color: '#fff', border: 'none'}
                          : isAi
                            ? {
                              background: 'var(--color-surface)',
                              color: 'var(--color-accent)',
                              border: '1px solid var(--color-accent)'
                            }
                            : {
                              background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                              color: isActive ? '#fff' : 'var(--color-text-sub)',
                              border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }
                      }
                    >
                      {isAi && <Sparkles size={11}/>}
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* 로딩 */}
            {isLoading && (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
              </div>
            )}
            
            {/* 에러 */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <p className="font-display font-bold text-base" style={{color: 'var(--color-text-main)'}}>
                  데이터를 불러오지 못했습니다
                </p>
                <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>잠시 후 다시 시도해주세요.</p>
              </div>
            )}
            
            {/* 상품 그리드 or 빈 상태 */}
            {!isLoading && !isError && (
              results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <p className="font-display font-bold text-base mb-1" style={{color: 'var(--color-text-main)'}}>
                    조건에 맞는 상품이 없어요
                  </p>
                  <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>필터를 조정해 다시 검색해 보세요.</p>
                  <button
                    onClick={resetFilter}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{background: 'var(--color-primary)'}}
                  >
                    필터 초기화
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {results.map(item => (
                    <ProductCard
                      key={item.postId}
                      item={item}
                      isWished={isItemWished(item)}
                      onLike={toggleLike}
                    />
                  ))}
                </div>
              )
            )}
            
            {/* 페이지네이션 */}
            {!isLoading && totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={p => {
                  setPage(p)
                  window.scrollTo({top: 0, behavior: 'smooth'})
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
