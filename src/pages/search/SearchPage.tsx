/**
 * SearchPage — 검색 결과 (Screen 4)
 *
 * 구성:
 *   SearchBar       — URL param 연동 검색 입력 + 초기화
 *   FilterSidebar   — 종목/컨디션/사이즈/거래방식/가격 필터 (md 이상)
 *   MobileFilter    — 필터 드로어 (모바일)
 *   SortBar         — 정렬 + 결과 수 표시
 *   ResultGrid      — 상품 카드 그리드 (2/3/4열 반응형)
 *   EmptyState      — 검색 결과 없을 때
 *
 * 상태: 로컬 필터 (추후 URL searchParams + useQuery 전환)
 */
import {formatPrice} from '../../utils/format'
import {useState} from 'react'
import {Link, useSearchParams} from 'react-router-dom'
import {ChevronDown, ChevronUp, Heart, Loader2, RotateCcw, Search, SlidersHorizontal, X,} from 'lucide-react'
import Pagination from '../../components/ui/Pagination'
import {useQuery} from '@tanstack/react-query'
import {getListings, toggleWish} from '../../features/listing/api/listingApi'
import type {PostCard} from '../../features/listing/api/listingApi'
import {resolveImageUrl} from '../../utils/image'
import ConditionBadge from '../../components/ui/ConditionBadge'
import type {DeliveryType, Grade, Sport} from '../../types/listing'


// ── 상수 ─────────────────────────────────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'SOCCER', label: '축구'},
  {key: 'BASEBALL', label: '야구'},
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
  {key: 'latest', label: '최신순'},
  {key: 'popular', label: '인기순'},
  {key: 'price_asc', label: '낮은가격'},
  {key: 'price_desc', label: '높은가격'},
]

// ── 등급/유틸 ─────────────────────────────────────────────────────────────────



// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

/** 상품 카드 — PostCard(API) 기반 */
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
      <Link to={`/listing/${item.postId}`} className="block">
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
              <div
                className="absolute inset-0"
                style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}
              />
              <span
                className="absolute inset-0 flex items-center justify-center select-none"
                style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 80, color: 'rgba(255,255,255,.13)'}}
              >
                {item.postId % 99}
              </span>
            </>
          )}
          {/* 등급 배지 — HomePage와 동일한 ConditionBadge 컴포넌트 사용 */}
          <ConditionBadge grade={item.grade} size="sm" className="absolute top-2 left-2"/>
        </div>
        {/* 정보 */}
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
      {/* 찜 버튼 */}
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

/** 필터 사이드바 내용 (데스크탑/모바일 공용) */
// Section 컴포넌트는 FilterContent 외부에 선언 (render 중 생성 방지)
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
        <span className="text-xs font-semibold tracking-widest"
              style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
          {title}
        </span>
        {collapsible && (open ? <ChevronUp size={14} color="var(--color-text-hint)"/> :
          <ChevronDown size={14} color="var(--color-text-hint)"/>)}
      </button>
      {(!collapsible || open) && children}
    </div>
  )
}

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
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{borderColor: "var(--color-border)"}}>
        <span className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>필터</span>
        <button onClick={onReset} className="flex items-center gap-1 text-xs transition-colors"
                style={{color: 'var(--color-accent)'}}>
          <RotateCcw size={12}/>초기화
        </button>
      </div>
      
      {/* 종목 */}
      <FilterSection title="SPORT">
        <div className="flex flex-col gap-0.5">
          {SPORT_OPTIONS.map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="radio" checked={sport === o.key} onChange={() => setSport(o.key)}
                     className="accent-[var(--color-primary)]"/>
              <span className="text-sm" style={{
                color: sport === o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)',
                fontWeight: sport === o.key ? 600 : 400
              }}>{o.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      
      {/* 컨디션 */}
      <FilterSection title="CONDITION">
        <div className="grid grid-cols-4 gap-1.5">
          {GRADE_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setGrade(o.key)}
                    className="py-1.5 rounded-lg text-xs font-bold transition-all" style={{
              background: grade === o.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color: grade === o.key ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${grade === o.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </FilterSection>
      
      {/* 사이즈 */}
      <FilterSection title="SIZE">
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map(s => (
            <button key={s} onClick={() => setSize(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{
              background: size === s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color: size === s ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${size === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}>
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
      
      {/* 거래방식 */}
      <FilterSection title="TRADE">
        <div className="flex flex-col gap-0.5">
          {DELIVERY_OPTIONS.map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="radio" checked={delivery === o.key} onChange={() => setDelivery(o.key)}
                     className="accent-[var(--color-primary)]"/>
              <span className="text-sm" style={{
                color: delivery === o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)',
                fontWeight: delivery === o.key ? 600 : 400
              }}>{o.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>
      
      {/* 가격 */}
      <FilterSection title="PRICE">
        <p className="text-sm font-bold mb-2"
           style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
          {'₩'}0 — {'₩'}{(maxPrice * 1000).toLocaleString('ko-KR')}
        </p>
        <input
          type="range" min={10} max={300} value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full"
          style={{accentColor: 'var(--color-accent)'}}
        />
      </FilterSection>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  
  /* 검색 상태 */
  const [query, setQuery] = useState(initialQuery)
  const [inputVal, setInputVal] = useState(initialQuery)
  
  /* 필터 상태 */
  const [sport, setSport] = useState<Sport | 'all'>((searchParams.get('sport') as Sport) ?? 'all')
  const [grade, setGrade] = useState<Grade | 'all'>('all')
  const [size, setSize] = useState('전체')
  const [delivery, setDelivery] = useState<DeliveryType | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState(300)
  const [sort, setSort] = useState<'latest' | 'price_asc' | 'price_desc' | 'popular'>('latest')
  const [page, setPage] = useState(0) // 0-based 페이지
  
  /* 모바일 필터 드로어 */
  const [filterOpen, setFilterOpen] = useState(false)
  
  /* 찜 낙관적 UI 오버라이드 (postId → true/false) */
  const [wishedOverride, setWishedOverride] = useState<Map<number, boolean>>(new Map())
  
  
  /* API — 실제 DB 데이터 조회 */
  const {data, isLoading, isError} = useQuery({
    queryKey: ['searchListings', query, sport, grade, delivery, maxPrice, sort, page],
    queryFn: () =>
      getListings({
        keyword: query || undefined,
        sport: sport !== 'all' ? sport : undefined,
        condition: grade !== 'all' ? grade : undefined,
        tradeType: delivery !== 'all' ? delivery : undefined,
        maxPrice: maxPrice < 300 ? maxPrice * 1000 : undefined,
        sort,
        page,
        size: 20,
      }),
    staleTime: 30_000,
    placeholderData: prev => prev, // 필터 바뀌어도 이전 결과 유지 (깜빡임 방지)
  })
  
  /* 사이즈 필터는 API 미지원 → 클라이언트 측 필터링 */
  const allItems: PostCard[] = data?.content ?? []
  const results: PostCard[] = size !== '전체'
    ? allItems.filter(item => item.size === size)
    : allItems
  
  const totalPages = data?.totalPages ?? 1
  
  /* 찜 토글 — 낙관적 UI + API 호출 */
  async function toggleLike(postId: number) {
    const current = wishedOverride.has(postId)
      ? wishedOverride.get(postId)!
      : (allItems.find(i => i.postId === postId)?.isWished ?? false)
    setWishedOverride(prev => new Map(prev).set(postId, !current))
    try {
      await toggleWish(postId)
    } catch {
      // 실패 시 롤백
      setWishedOverride(prev => new Map(prev).set(postId, current))
    }
  }
  
  /* 이 아이템이 찜 상태인지 판단 (낙관적 override 우선) */
  function isItemWished(item: PostCard): boolean {
    return wishedOverride.has(item.postId)
      ? wishedOverride.get(item.postId)!
      : item.isWished
  }
  
  /* 필터 초기화 */
  function resetFilter() {
    setSport('all');
    setGrade('all')
    setSize('전체');
    setDelivery('all');
    setMaxPrice(300)
  }
  
  /* 검색 실행 — 새 검색어 입력 시 페이지 초기화 */
  function handleSearch() {
    setQuery(inputVal)
    setPage(0)
  }
  
  /* 활성 필터 수 */
  const activeFilterCount = [
    sport !== 'all', grade !== 'all',
    size !== '전체', delivery !== 'all', maxPrice < 300,
  ].filter(Boolean).length
  
  /* 필터 변경 시 page를 0으로 리셋하는 래퍼 setter */
  const filterProps = {
    sport,
    setSport: (v: Sport | 'all') => { setSport(v); setPage(0) },
    grade,
    setGrade: (v: Grade | 'all') => { setGrade(v); setPage(0) },
    size,
    setSize: (v: string) => { setSize(v); setPage(0) },
    delivery,
    setDelivery: (v: DeliveryType | 'all') => { setDelivery(v); setPage(0) },
    maxPrice,
    setMaxPrice: (v: number) => { setMaxPrice(v); setPage(0) },
    onReset: resetFilter,
  }
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      {/* 모바일 필터 드로어 오버레이 */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{background: 'rgba(13,27,42,.45)', backdropFilter: 'blur(2px)'}}
          onClick={() => setFilterOpen(false)}
        />
      )}
      {/* 모바일 필터 드로어 */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 md:hidden w-72 overflow-y-auto transition-transform duration-300"
        style={{
          background: 'var(--color-surface)',
          transform: filterOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: filterOpen ? '4px 0 24px rgba(0,33,71,.18)' : 'none',
        }}
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-4 py-4"
             style={{borderBottom: '1px solid var(--color-border)'}}>
          <span className="font-display font-bold" style={{color: 'var(--color-text-main)'}}>필터</span>
          <button onClick={() => setFilterOpen(false)} aria-label="닫기">
            <X size={20} color="var(--color-text-sub)"/>
          </button>
        </div>
        <FilterContent {...filterProps} />
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
      
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6">
        {/* 검색바 */}
        <div className="flex gap-3 mb-6">
          <div
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <Search size={18} color="var(--color-text-hint)" className="flex-shrink-0"/>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="팀, 종목, 상품명 검색..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{color: 'var(--color-text-main)'}}
            />
            {inputVal && (
              <button onClick={() => {
                setInputVal('');
                setQuery('')
              }} aria-label="지우기">
                <X size={16} color="var(--color-text-hint)"/>
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-3 rounded-xl font-bold text-sm text-white flex-shrink-0 transition-colors"
            style={{background: 'var(--color-primary)'}}
          >
            검색
          </button>
        </div>
        
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
            <FilterContent {...filterProps} />
          </aside>
          
          {/* 결과 영역 */}
          <div className="flex-1 min-w-0">
            {/* 정렬 + 필터 버튼 */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                {/* 모바일 필터 버튼 */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium relative"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-sub)'
                  }}
                >
                  <SlidersHorizontal size={15}/>
                  필터
                  {activeFilterCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[12px] font-bold text-white flex items-center justify-center"
                      style={{background: 'var(--color-accent)'}}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                  <span className="font-bold" style={{
                    color: 'var(--color-text-main)',
                    fontFamily: "'IAMAPLAYER',Giants,sans-serif"
                  }}>{data?.totalElements ?? results.length}</span>개 상품
                  {query && <span>  &quot;{query}&quot; 검색 결과</span>}
                </span>
              </div>
              
              {/* 정렬 */}
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { setSort(o.key as 'latest' | 'price_asc' | 'price_desc' | 'popular'); setPage(0) }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: sort === o.key ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: sort === o.key ? '#fff' : 'var(--color-text-sub)',
                      border: `1px solid ${sort === o.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 활성 필터 칩 */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {sport !== 'all' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{background: 'rgba(0,33,71,.08)', color: 'var(--color-primary)'}}>
                    {SPORT_OPTIONS.find(o => o.key === sport)?.label}
                    <button onClick={() => setSport('all')} aria-label="삭제"><X size={12}/></button>
                  </span>
                )}
                {grade !== 'all' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{background: 'rgba(0,33,71,.08)', color: 'var(--color-primary)'}}>
                    {GRADE_OPTIONS.find(o => o.key === grade)?.label}
                    <button onClick={() => setGrade('all')} aria-label="삭제"><X size={12}/></button>
                  </span>
                )}
                {size !== '전체' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{background: 'rgba(0,33,71,.08)', color: 'var(--color-primary)'}}>
                    {size}
                    <button onClick={() => setSize('전체')} aria-label="삭제"><X size={12}/></button>
                  </span>
                )}
                <button onClick={resetFilter} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{
                  background: 'rgba(255,46,77,.08)',
                  color: 'var(--color-accent)',
                  border: '1px solid rgba(255,46,77,.2)'
                }}>
                  전체 초기화
                </button>
              </div>
            )}
            
            {/* 로딩 스피너 */}
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
                <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                  잠시 후 다시 시도해주세요.
                </p>
              </div>
            )}
            
            {/* 그리드 or EmptyState */}
            {!isLoading && !isError && (
              results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{background: 'var(--color-surface-raised)'}}
                  >
                    <Search size={28} color="var(--color-text-hint)"/>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-bold text-base mb-1" style={{color: 'var(--color-text-main)'}}>
                      검색 결과가 없어요
                    </p>
                    <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                      다른 키워드나 필터를 시도해보세요.
                    </p>
                  </div>
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
                onChange={(p) => {
                  setPage(p)
                  // 페이지 변경 시 결과 상단으로 스크롤
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
