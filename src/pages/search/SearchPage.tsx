/**
 * SearchPage — 검색 결과 (Screen 4)
 *
 * 구성:
 *   SearchBar       — URL param 연동 검색 입력 + 초기화
 *   FilterSidebar   — 종목/리그/컨디션/사이즈/거래방식/가격 필터 (md 이상)
 *   MobileFilter    — 필터 드로어 (모바일)
 *   SortBar         — 정렬 + 결과 수 표시
 *   ResultGrid      — 상품 카드 그리드 (2/3/4열 반응형)
 *   EmptyState      — 검색 결과 없을 때
 *
 * 상태: 로컬 필터 (추후 URL searchParams + useQuery 전환)
 */
import { formatPrice } from '../../utils/format'
import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, Heart, ChevronRight,
  RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { ListingItem, Grade, Sport, DeliveryType } from '../../types/listing'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const ALL_LISTINGS: ListingItem[] = [
  { id:1,  title:'맨체스터 유나이티드 23/24 홈 어센틱',     team:'맨체스터 유나이티드', league:'EPL',    price:78000,  grade:'S', size:'M',  deliveryType:'BOTH',     jerseyColor:'#B5222B', jerseyNumber:'7',  likedCount:24, isLiked:false, sport:'SOCCER',     timeAgo:'2시간 전' },
  { id:2,  title:'리버풀 FC 07/08 어웨이 레플리카',         team:'리버풀 FC',          league:'EPL',    price:55000,  grade:'A', size:'L',  deliveryType:'BOTH',     jerseyColor:'#C8102E', jerseyNumber:'10', likedCount:18, isLiked:true,  sport:'SOCCER',     timeAgo:'5시간 전' },
  { id:3,  title:'첼시 FC 11/12 홈 어센틱',               team:'첼시 FC',            league:'EPL',    price:43000,  grade:'B', size:'XL', deliveryType:'DELIVERY', jerseyColor:'#034694', jerseyNumber:'11', likedCount:7,  isLiked:false, sport:'SOCCER',     timeAgo:'어제' },
  { id:4,  title:'레알 마드리드 21/22 서드 킷',            team:'레알 마드리드',       league:'라리가', price:92000,  grade:'S', size:'S',  deliveryType:'DIRECT',   jerseyColor:'#6B0078', jerseyNumber:'9',  likedCount:41, isLiked:false, sport:'SOCCER',     timeAgo:'3일 전' },
  { id:5,  title:'전북 현대 2024 홈 어센틱',               team:'전북 현대',           league:'K리그',  price:66000,  grade:'S', size:'M',  deliveryType:'DELIVERY', jerseyColor:'#1A7A40', jerseyNumber:'27', likedCount:12, isLiked:false, sport:'SOCCER',     timeAgo:'1주 전' },
  { id:6,  title:'바르셀로나 22/23 어웨이 레플리카',        team:'FC 바르셀로나',       league:'라리가', price:48000,  grade:'A', size:'M',  deliveryType:'DELIVERY', jerseyColor:'#A50044', jerseyNumber:'10', likedCount:33, isLiked:true,  sport:'SOCCER',     timeAgo:'4시간 전' },
  { id:7,  title:'두산 베어스 2023 홈 유니폼',             team:'두산 베어스',         league:'KBO',    price:59000,  grade:'S', size:'L',  deliveryType:'DELIVERY', jerseyColor:'#002147', jerseyNumber:'36', likedCount:9,  isLiked:false, sport:'BASEBALL',   timeAgo:'6시간 전' },
  { id:8,  title:'KT 위즈 2024 어웨이 유니폼',            team:'KT 위즈',            league:'KBO',    price:44000,  grade:'B', size:'XL', deliveryType:'BOTH',     jerseyColor:'#D50032', jerseyNumber:'22', likedCount:5,  isLiked:false, sport:'BASEBALL',   timeAgo:'2일 전' },
  { id:9,  title:'서울 SK 나이츠 23/24 홈',               team:'서울 SK 나이츠',      league:'KBL',    price:71000,  grade:'A', size:'M',  deliveryType:'DIRECT',   jerseyColor:'#E3001B', jerseyNumber:'14', likedCount:16, isLiked:false, sport:'BASKETBALL', timeAgo:'어제' },
  { id:10, title:'인천 대한항공 점보스 유니폼',            team:'인천 대한항공',       league:'V리그',  price:38000,  grade:'C', size:'S',  deliveryType:'DELIVERY', jerseyColor:'#003087', jerseyNumber:'5',  likedCount:3,  isLiked:false, sport:'VOLLEYBALL', timeAgo:'3일 전' },
  { id:11, title:'PSG 23/24 홈 어센틱',                   team:'파리 생제르맹',       league:'리그앙', price:110000, grade:'S', size:'L',  deliveryType:'DELIVERY', jerseyColor:'#004170', jerseyNumber:'7',  likedCount:55, isLiked:false, sport:'SOCCER',     timeAgo:'1일 전' },
  { id:12, title:'T1 2024 스프링 유니폼',                 team:'T1',                 league:'LCK',    price:85000,  grade:'A', size:'M',  deliveryType:'BOTH',     jerseyColor:'#C8102E', jerseyNumber:'',   likedCount:72, isLiked:false, sport:'ESPORTS',    timeAgo:'3시간 전' },
  { id:13, title:'KIA 타이거즈 2023 홈 어센틱',           team:'KIA 타이거즈',        league:'KBO',    price:67000,  grade:'S', size:'L',  deliveryType:'DELIVERY', jerseyColor:'#D50032', jerseyNumber:'53', likedCount:28, isLiked:false, sport:'BASEBALL',   timeAgo:'5일 전' },
  { id:14, title:'토트넘 22/23 홈 어센틱',                team:'토트넘 홋스퍼',       league:'EPL',    price:89000,  grade:'S', size:'M',  deliveryType:'BOTH',     jerseyColor:'#FFFFFF', jerseyNumber:'10', likedCount:45, isLiked:false, sport:'SOCCER',     timeAgo:'6시간 전' },
  { id:15, title:'현대캐피탈 스카이워커스 유니폼',        team:'현대캐피탈',          league:'V리그',  price:42000,  grade:'B', size:'XL', deliveryType:'DIRECT',   jerseyColor:'#003087', jerseyNumber:'11', likedCount:8,  isLiked:false, sport:'VOLLEYBALL', timeAgo:'2일 전' },
]

// ── 상수 ─────────────────────────────────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport | 'all'; label: string }[] = [
  { key:'all',        label:'전체' },
  { key:'SOCCER',     label:'축구' },
  { key:'BASEBALL',   label:'야구' },
  { key:'BASKETBALL', label:'농구' },
  { key:'VOLLEYBALL', label:'배구' },
  { key:'ESPORTS',    label:'e스포츠' },
  { key:'ETC',        label:'기타' },
]

const LEAGUE_OPTIONS = ['전체', 'EPL', '라리가', '리그앙', '분데스리가', 'K리그', 'KBO', 'KBL', 'V리그', 'LCK']
const GRADE_OPTIONS: { key: Grade | 'all'; label: string }[] = [
  { key:'all', label:'전체' },
  { key:'S', label:'S급' },
  { key:'A', label:'A급' },
  { key:'B', label:'B급' },
  { key:'C', label:'C급' },
]
const SIZE_OPTIONS = ['전체', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const DELIVERY_OPTIONS: { key: DeliveryType | 'all'; label: string }[] = [
  { key:'all',      label:'전체' },
  { key:'DELIVERY', label:'택배' },
  { key:'DIRECT',   label:'직거래' },
  { key:'BOTH',     label:'모두 가능' },
]
const SORT_OPTIONS = [
  { key:'latest',     label:'최신순' },
  { key:'popular',    label:'인기순' },
  { key:'price_asc',  label:'낮은가격' },
  { key:'price_desc', label:'높은가격' },
]

// ── 등급/유틸 ─────────────────────────────────────────────────────────────────

const GRADE_META: Record<Grade, { label: string; bg: string; text: string; border: string }> = {
  S: { label:'S급', bg:'rgba(255,184,0,.12)',  text:'#B38000', border:'rgba(255,184,0,.35)' },
  A: { label:'A급', bg:'rgba(0,33,71,.08)',    text:'#002147', border:'rgba(0,33,71,.25)' },
  B: { label:'B급', bg:'rgba(90,106,122,.10)', text:'#5A6A7A', border:'rgba(90,106,122,.3)' },
  C: { label:'C급', bg:'rgba(255,149,0,.10)',  text:'#CC7700', border:'rgba(255,149,0,.3)' },
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

/** 상품 카드 */
function ProductCard({ item, onLike }: { item: ListingItem; onLike: (id: number) => void }) {
  const m = GRADE_META[item.grade]
  return (
    <article className="rounded-xl overflow-hidden transition-shadow hover:shadow-md relative" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <Link to={`/listing/${item.id}`} className="block">
        {/* 썸네일 */}
        <div className="relative" style={{ aspectRatio: '4/5', background: item.jerseyColor ?? '#1A3051' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)' }} />
          <span className="absolute inset-0 flex items-center justify-center select-none" style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif", fontSize:80, color:'rgba(255,255,255,.13)' }}>
            {item.jerseyNumber}
          </span>
          {/* 등급 배지 */}
          <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background:m.bg, color:m.text, border:`1px solid ${m.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
            {m.label}
          </span>
        </div>
        {/* 정보 */}
        <div className="p-3">
          <p className="text-[11px] mb-0.5" style={{ color:'var(--color-text-hint)' }}>{item.league} · {item.team}</p>
          <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color:'var(--color-text-main)' }}>{item.title}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-sm" style={{ color:'var(--color-primary)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
              {formatPrice(item.price)}
            </span>
            <span className="text-xs" style={{ color:'var(--color-text-hint)' }}>{item.timeAgo}</span>
          </div>
        </div>
      </Link>
      {/* 찜 버튼 */}
      <button
        onClick={() => onLike(item.id)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{ background:'rgba(255,255,255,.88)' }}
        aria-label="찜하기"
      >
        <Heart size={15} fill={item.isLiked ? 'var(--color-accent)' : 'none'} color={item.isLiked ? 'var(--color-accent)' : '#0D1B2A'} />
      </button>
    </article>
  )
}

/** 필터 사이드바 내용 (데스크탑/모바일 공용) */
// Section 컴포넌트는 FilterContent 외부에 선언 (render 중 생성 방지)
function FilterSection({ title, children, collapsible, open, onToggle }: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
}) {
  return (
    <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--color-border)' }}>
      <button
        className="w-full flex items-center justify-between mb-2"
        onClick={collapsible ? onToggle : undefined}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <span className="text-xs font-semibold tracking-widest" style={{ color:'var(--color-text-hint)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
          {title}
        </span>
        {collapsible && (open ? <ChevronUp size={14} color="var(--color-text-hint)" /> : <ChevronDown size={14} color="var(--color-text-hint)" />)}
      </button>
      {(!collapsible || open) && children}
    </div>
  )
}

function FilterContent({
  sport, setSport,
  league, setLeague,
  grade, setGrade,
  size, setSize,
  delivery, setDelivery,
  maxPrice, setMaxPrice,
  onReset,
}: {
  sport: Sport | 'all'
  setSport: (v: Sport | 'all') => void
  league: string
  setLeague: (v: string) => void
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
  const [leagueOpen, setLeagueOpen] = useState(true)

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:`1px solid ${border}` }}>
        <span className="text-sm font-display font-bold" style={{ color:'var(--color-text-main)' }}>필터</span>
        <button onClick={onReset} className="flex items-center gap-1 text-xs transition-colors" style={{ color:'var(--color-accent)' }}>
          <RotateCcw size={12} />초기화
        </button>
      </div>

      {/* 종목 */}
      <FilterSection title="SPORT">
        <div className="flex flex-col gap-0.5">
          {SPORT_OPTIONS.map(o => (
            <label key={o.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="radio" checked={sport===o.key} onChange={() => setSport(o.key)} className="accent-[var(--color-primary)]" />
              <span className="text-sm" style={{ color: sport===o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)', fontWeight: sport===o.key ? 600 : 400 }}>{o.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* 리그 */}
      <FilterSection title="LEAGUE" collapsible open={leagueOpen} onToggle={() => setLeagueOpen(p=>!p)}>
        <div className="flex flex-col gap-0.5">
          {LEAGUE_OPTIONS.map(l => (
            <label key={l} className="flex items-center gap-2 py-1.5 cursor-pointer">
              <input type="radio" checked={league===l} onChange={() => setLeague(l)} className="accent-[var(--color-primary)]" />
              <span className="text-sm" style={{ color: league===l ? 'var(--color-text-main)' : 'var(--color-text-sub)', fontWeight: league===l ? 600 : 400 }}>{l}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* 컨디션 */}
      <FilterSection title="CONDITION">
        <div className="grid grid-cols-4 gap-1.5">
          {GRADE_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setGrade(o.key)} className="py-1.5 rounded-lg text-xs font-bold transition-all" style={{
              background: grade===o.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color: grade===o.key ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${grade===o.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
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
            <button key={s} onClick={() => setSize(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{
              background: size===s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
              color: size===s ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${size===s ? 'var(--color-primary)' : 'var(--color-border)'}`,
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
              <input type="radio" checked={delivery===o.key} onChange={() => setDelivery(o.key)} className="accent-[var(--color-primary)]" />
              <span className="text-sm" style={{ color: delivery===o.key ? 'var(--color-text-main)' : 'var(--color-text-sub)', fontWeight: delivery===o.key ? 600 : 400 }}>{o.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* 가격 */}
      <FilterSection title="PRICE">
        <p className="text-sm font-bold mb-2" style={{ color:'var(--color-text-main)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
          {'₩'}0 — {'₩'}{(maxPrice * 1000).toLocaleString('ko-KR')}
        </p>
        <input
          type="range" min={10} max={300} value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full"
          style={{ accentColor:'var(--color-accent)' }}
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
  const [league, setLeague] = useState('전체')
  const [grade, setGrade] = useState<Grade | 'all'>('all')
  const [size, setSize] = useState('전체')
  const [delivery, setDelivery] = useState<DeliveryType | 'all'>('all')
  const [maxPrice, setMaxPrice] = useState(300)
  const [sort, setSort] = useState('latest')

  /* 모바일 필터 드로어 */
  const [filterOpen, setFilterOpen] = useState(false)

  /* 찜 상태 (로컬) */
  const [liked, setLiked] = useState<Set<number>>(
    () => new Set(ALL_LISTINGS.filter(l => l.isLiked).map(l => l.id))
  )

  function toggleLike(id: number) {
    setLiked(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
  }

  /* 필터 초기화 */
  function resetFilter() {
    setSport('all'); setLeague('전체'); setGrade('all')
    setSize('전체'); setDelivery('all'); setMaxPrice(300)
  }

  /* 검색 실행 */
  function handleSearch() { setQuery(inputVal) }

  /* 필터링 + 정렬 */
  const results = useMemo(() => {
    let list = ALL_LISTINGS.map(l => ({ ...l, isLiked: liked.has(l.id) }))

    if (query) {
      const q = query.toLowerCase()
      list = list.filter(l => l.title.toLowerCase().includes(q) || l.team.toLowerCase().includes(q) || l.league.toLowerCase().includes(q))
    }
    if (sport !== 'all') list = list.filter(l => l.sport === sport)
    if (league !== '전체') list = list.filter(l => l.league === league)
    if (grade !== 'all') list = list.filter(l => l.grade === grade)
    if (size !== '전체') list = list.filter(l => l.size === size)
    if (delivery !== 'all') list = list.filter(l => l.deliveryType === delivery || l.deliveryType === 'BOTH')
    list = list.filter(l => l.price <= maxPrice * 1000)

    switch (sort) {
      case 'popular':    return list.sort((a,b) => b.likedCount - a.likedCount)
      case 'price_asc':  return list.sort((a,b) => a.price - b.price)
      case 'price_desc': return list.sort((a,b) => b.price - a.price)
      default:           return list
    }
  }, [query, sport, league, grade, size, delivery, maxPrice, sort, liked])

  /* 활성 필터 수 */
  const activeFilterCount = [
    sport !== 'all', league !== '전체', grade !== 'all',
    size !== '전체', delivery !== 'all', maxPrice < 300,
  ].filter(Boolean).length

  const filterProps = {
    sport, setSport, league, setLeague, grade, setGrade,
    size, setSize, delivery, setDelivery, maxPrice, setMaxPrice,
    onReset: resetFilter,
  }

  return (
    <div className="min-h-screen" style={{ background:'var(--color-bg)' }}>
      {/* 모바일 필터 드로어 오버레이 */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background:'rgba(13,27,42,.45)', backdropFilter:'blur(2px)' }}
          onClick={() => setFilterOpen(false)}
        />
      )}
      {/* 모바일 필터 드로어 */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 md:hidden w-72 overflow-y-auto transition-transform duration-300"
        style={{
          background:'var(--color-surface)',
          transform: filterOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: filterOpen ? '4px 0 24px rgba(0,33,71,.18)' : 'none',
        }}
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom:'1px solid var(--color-border)' }}>
          <span className="font-display font-bold" style={{ color:'var(--color-text-main)' }}>필터</span>
          <button onClick={() => setFilterOpen(false)} aria-label="닫기">
            <X size={20} color="var(--color-text-sub)" />
          </button>
        </div>
        <FilterContent {...filterProps} />
        <div className="p-4">
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background:'var(--color-primary)' }}
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
            style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}
          >
            <Search size={18} color="var(--color-text-hint)" className="flex-shrink-0" />
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="팀, 종목, 상품명 검색..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color:'var(--color-text-main)' }}
            />
            {inputVal && (
              <button onClick={() => { setInputVal(''); setQuery('') }} aria-label="지우기">
                <X size={16} color="var(--color-text-hint)" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-3 rounded-xl font-bold text-sm text-white flex-shrink-0 transition-colors"
            style={{ background:'var(--color-primary)' }}
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
              background:'var(--color-surface)',
              border:'1px solid var(--color-border)',
              boxShadow:'0 4px 12px -2px rgba(0,33,71,.08)',
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
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', color:'var(--color-text-sub)' }}
                >
                  <SlidersHorizontal size={15} />
                  필터
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background:'var(--color-accent)' }}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <span className="text-sm" style={{ color:'var(--color-text-sub)' }}>
                  <span className="font-bold" style={{ color:'var(--color-text-main)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>{results.length}</span>개 상품
                  {query && <span>  &quot;{query}&quot; 검색 결과</span>}
                </span>
              </div>

              {/* 정렬 */}
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    onClick={() => setSort(o.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: sort===o.key ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: sort===o.key ? '#fff' : 'var(--color-text-sub)',
                      border: `1px solid ${sort===o.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
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
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background:'rgba(0,33,71,.08)', color:'var(--color-primary)' }}>
                    {SPORT_OPTIONS.find(o=>o.key===sport)?.label}
                    <button onClick={() => setSport('all')} aria-label="삭제"><X size={12} /></button>
                  </span>
                )}
                {league !== '전체' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background:'rgba(0,33,71,.08)', color:'var(--color-primary)' }}>
                    {league}
                    <button onClick={() => setLeague('전체')} aria-label="삭제"><X size={12} /></button>
                  </span>
                )}
                {grade !== 'all' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background:'rgba(0,33,71,.08)', color:'var(--color-primary)' }}>
                    {GRADE_OPTIONS.find(o=>o.key===grade)?.label}
                    <button onClick={() => setGrade('all')} aria-label="삭제"><X size={12} /></button>
                  </span>
                )}
                {size !== '전체' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background:'rgba(0,33,71,.08)', color:'var(--color-primary)' }}>
                    {size}
                    <button onClick={() => setSize('전체')} aria-label="삭제"><X size={12} /></button>
                  </span>
                )}
                <button onClick={resetFilter} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background:'rgba(255,46,77,.08)', color:'var(--color-accent)', border:'1px solid rgba(255,46,77,.2)' }}>
                  전체 초기화
                </button>
              </div>
            )}

            {/* 그리드 or EmptyState */}
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background:'var(--color-surface-raised)' }}
                >
                  <Search size={28} color="var(--color-text-hint)" />
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-base mb-1" style={{ color:'var(--color-text-main)' }}>
                    검색 결과가 없어요
                  </p>
                  <p className="text-sm" style={{ color:'var(--color-text-sub)' }}>
                    다른 키워드나 필터를 시도해보세요.
                  </p>
                </div>
                <button onClick={resetFilter} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:'var(--color-primary)' }}>
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {results.map(item => (
                  <ProductCard key={item.id} item={item} onLike={toggleLike} />
                ))}
              </div>
            )}

            {/* 더보기 버튼 (목 — 추후 무한스크롤 전환) */}
            {results.length > 0 && (
              <div className="flex justify-center mt-8">
                <button
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', color:'var(--color-text-sub)' }}
                >
                  더 보기 <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
