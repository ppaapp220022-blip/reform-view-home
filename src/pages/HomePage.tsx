/**
 * HomePage — 홈 피드 (Screen 1)
 *
 * 구성:
 *   SportFilterBar   — 종목 탭 (GNB 바로 아래)
 *   HeroSection        — navy 배경, 피처 상품 + 통계
 *   [Sidebar | Grid]   — 필터 사이드바(220px) + 상품 5열 그리드
 *
 * 상태: 로컬 필터 (추후 URL params + useQuery 전환)
 * 데이터: 목 데이터 (백엔드 미연동)
 */
import {useCallback, useState} from 'react'
import {Link} from 'react-router-dom'
import {AlertCircle, Heart, SlidersHorizontal} from 'lucide-react'
import {useQuery} from '@tanstack/react-query'
import {formatPrice} from '../utils/format'
import {resolveImageUrl} from '../utils/image'
import type {PostCard} from '../features/listing/api/listingApi'
import {getListings, toggleWish} from '../features/listing/api/listingApi'
import type {Grade, HomeFilter, SportFilter,} from '../types/listing'

// ── 종목 카테고리 ──────────────────────────────────────────────────────────────

const SPORT_TABS: { key: SportFilter; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'BASEBALL', label: '야구'},
  {key: 'SOCCER', label: '축구'},
  {key: 'BASKETBALL', label: '농구'},
  {key: 'VOLLEYBALL', label: '배구'},
  {key: 'ESPORTS', label: 'e스포츠'},
  {key: 'ETC', label: '기타'},
]

const GRADES: { key: Grade | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'S', label: 'S급'},
  {key: 'A', label: 'A급'},
  {key: 'B', label: 'B급'},
  {key: 'C', label: 'C급'},
]
const SORT_OPTIONS: { key: HomeFilter['sort']; label: string }[] = [
  {key: 'latest', label: '최신순'},
  {key: 'popular', label: '인기순'},
  {key: 'price_asc', label: '낮은가격'},
  {key: 'price_desc', label: '높은가격'},
]

// ── 유틸 ──────────────────────────────────────────────────────────────────────


/** 등급별 배경색 */
function gradeStyle(grade: Grade): React.CSSProperties {
  const map: Record<Grade, string> = {
    S: 'var(--color-primary)',
    A: 'var(--color-accent)',
    B: 'var(--color-text-sub)',
    C: 'var(--color-text-hint)',
  }
  return {
    background: map[grade],
    color: '#fff',
    // Tier 1: 등급 레이블(S/A/B/C)은 영문 단독 → IAMAPLAYER
    fontFamily: "'IAMAPLAYER',Giants,sans-serif",
  }
}

// ── 유니폼 SVG 일러스트 ────────────────────────────────────────────────────────

interface JerseyProps {
  color: string
  number?: string
  size?: 'sm' | 'lg'
}

/**
 * Jersey — CSS 유니폼 형태 일러스트
 * 와이어프레임의 .j 계열 클래스를 SVG/JSX로 재현
 */
function Jersey({color, number, size = 'sm'}: JerseyProps) {
  const w = size === 'lg' ? 80 : 52
  const h = size === 'lg' ? 96 : 64
  const sw = size === 'lg' ? 20 : 13  // sleeve width
  const sh = size === 'lg' ? 32 : 22  // sleeve height
  const numSize = size === 'lg' ? 32 : 20
  
  return (
    <svg
      width={w + sw * 2}
      height={h}
      viewBox={`0 0 ${w + sw * 2} ${h}`}
      aria-hidden="true"
      style={{overflow: 'visible'}}
    >
      {/* 왼쪽 소매 */}
      <rect x={0} y={0} width={sw} height={sh} rx={4} fill={color} opacity={0.9}/>
      {/* 오른쪽 소매 */}
      <rect x={w + sw} y={0} width={sw} height={sh} rx={4} fill={color} opacity={0.9}/>
      {/* 몸통 */}
      <rect x={sw} y={0} width={w} height={h} rx={4} fill={color}/>
      {/* 가로 스트라이프 */}
      <rect x={sw} y={size === 'lg' ? 24 : 16} width={w} height={size === 'lg' ? 6 : 4} fill="rgba(255,255,255,0.2)"/>
      {/* 등번호 */}
      {number && (
        <text
          x={sw + w / 2}
          y={size === 'lg' ? 70 : 48}
          textAnchor="middle"
          fontSize={numSize}
          fill="rgba(255,255,255,0.35)"
          fontFamily="Giants, sans-serif"
        >
          {number}
        </text>
      )}
    </svg>
  )
}

// ── 상품 카드 ─────────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: PostCard
  onLike: (id: number) => void
}

/** 팀별 고정 색상 (실제 이미지 없을 때 폴백) */
const JERSEY_COLORS = [
  '#B5222B', '#1A3051', '#034694', '#1A7A40', '#A50044',
  '#6B0078', '#C8102E', '#003087', '#002147', '#E3001B',
]

function fallbackColor(id: number) {
  return JERSEY_COLORS[id % JERSEY_COLORS.length]
}

function ProductCard({item, onLike}: ProductCardProps) {
  return (
    <Link
      to={`/listing/${item.postId}`}
      className="block no-underline rounded-[var(--r-card)] overflow-hidden hover:border-[var(--color-border-strong)] transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 이미지 영역 */}
      <div
        className="relative flex items-center justify-center"
        style={{height: 160, background: 'var(--color-surface-sunken)'}}
      >
        {/* 등급 배지 */}
        <span
          className="absolute top-2.5 left-2.5 text-[12px] font-bold px-1.5 py-0.5 rounded-[5px]"
          style={gradeStyle(item.grade)}
        >
          {item.grade}
        </span>
        
        {/* 유니폼 이미지: 실제 썸네일 우선, 없으면 색상 폴백
             resolveImageUrl: bare filename·미확인 도메인 → null 처리 */}
        {resolveImageUrl(item.thumbnailUrl) ? (
          <img
            src={resolveImageUrl(item.thumbnailUrl)!}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{position: 'absolute', inset: 0}}
            onError={(e) => {
              // 이미지 로드 실패 시 숨기고 폴백 표시
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <Jersey color={fallbackColor(item.postId)} number={String(item.postId % 99)}/>
        )}
        
        {/* 찜 버튼 */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onLike(item.postId)
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="찜하기"
        >
          <Heart
            size={13}
            strokeWidth={1.75}
            style={{
              color: item.isWished ? 'var(--color-accent)' : 'var(--color-text-hint)',
              fill: item.isWished ? 'var(--color-accent)' : 'none',
            }}
          />
        </button>
      </div>
      
      {/* 정보 영역 */}
      <div className="p-3">
        <p
          className="text-[12px] font-medium uppercase tracking-[0.5px] mb-1"
          style={{color: 'var(--color-text-hint)'}}
        >
          {item.team} · {item.sport}
        </p>
        <p
          className="text-[14px] font-medium leading-snug mb-2 line-clamp-2"
          style={{color: 'var(--color-text-main)'}}
        >
          {item.title}
        </p>
        <p
          className="text-[16px] font-medium"
          style={{
            color: 'var(--color-primary)',
            // Tier 1: 가격(₩ + 숫자)은 IAMAPLAYER
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
          }}
        >
          {formatPrice(item.price)}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span
            className="text-[12px] px-1.5 py-0.5 rounded-full"
            style={{
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-sub)',
            }}
          >
            {item.size}
          </span>
          <span className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
            {item.timeAgo}
          </span>
        </div>
      </div>
    </Link>
  )
}


// SportFilterBar 컴포넌트 제거됨 — 종목 탭은 FilterSidebar 내부로 이동 (2026-05-14)

// ── Hero 섹션 ─────────────────────────────────────────────────────────────────

function HeroSection() {
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
            Size M · Grade S · 에스크로 안전결제 지원
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
          
          {/* 통계 바 */}
          <div
            className="flex gap-8 mt-8 pt-6"
            style={{borderTop: '1px solid rgba(255,255,255,0.08)'}}
          >
            {[
              {num: '4,820', lbl: '누적 거래'},
              {num: '31,500', lbl: '등록 상품'},
              {num: '9,200', lbl: '활성 회원'},
              {num: '98%', lbl: '만족도'},
            ].map(({num, lbl}) => (
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
        
        {/* 유니폼 일러스트 (데스크탑만) */}
        <div className="hidden md:flex items-center justify-center w-56 flex-shrink-0 relative">
          <div style={{transform: 'rotate(-4deg)', opacity: 0.9}}>
            <Jersey color="#B5222B" number="7" size="lg"/>
          </div>
          <div className="absolute right-6 -bottom-4" style={{transform: 'rotate(6deg)', opacity: 0.45, zIndex: 0}}>
            <Jersey color="#ffffff" number="" size="lg"/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 필터 사이드바 ─────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filter: HomeFilter
  onChange: (f: HomeFilter) => void
}

function FilterSidebar({filter, onChange}: FilterSidebarProps) {
  function set<K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) {
    onChange({...filter, [key]: value})
  }
  
  return (
    <aside
      className="w-[220px] flex-shrink-0 py-5"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      
      {/* 종목 — 수직 탭 리스트 */}
      <p className="text-[12px] font-medium uppercase tracking-[1px] px-5 mb-2"
         style={{color: 'var(--color-text-hint)'}}>종목</p>
      <div className="flex flex-col">
        {SPORT_TABS.map(({key, label}) => {
          const isActive = filter.sport === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('sport', key)}
              className="flex items-center gap-2 px-5 h-9 text-[14px] text-left transition-colors"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-sub)',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(255,46,77,.06)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      
      {/* 컨디션 */}
      <p className="text-[12px] font-medium uppercase tracking-[1px] px-5 mb-2 mt-5"
         style={{color: 'var(--color-text-hint)'}}>컨디션</p>
      <div className="flex gap-2 px-5 flex-wrap">
        {GRADES.map(({key, label}) => {
          const isActive = filter.grade === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('grade', key)}
              className="text-[13px] px-2.5 py-1 rounded transition-colors"
              style={{
                background: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-sub)',
                border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      
      {/* 거래 방식 */}
      <p className="text-[12px] font-medium uppercase tracking-[1px] px-5 mb-2 mt-5"
         style={{color: 'var(--color-text-hint)'}}>거래 방식</p>
      <div className="flex gap-2 px-5">
        {([['all', '전체'], ['DELIVERY', '택배'], ['DIRECT', '직거래']] as const).map(([key, label]) => {
          const isActive = filter.deliveryType === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('deliveryType', key)}
              className="text-[13px] px-2.5 py-1 rounded transition-colors"
              style={{
                background: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-sub)',
                border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      
      {/* 적용 버튼 */}
      <div className="px-4 mt-6">
        <button
          type="button"
          className="w-full h-8 text-[13px] font-medium text-white rounded-[7px] transition-opacity hover:opacity-90"
          style={{background: 'var(--color-accent)'}}
        >
          필터 적용
        </button>
      </div>
    </aside>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [filter, setFilter] = useState<HomeFilter>({
    sport: 'all',
    grade: 'all',
    deliveryType: 'all',
    sort: 'latest',
  })
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  
  /**
   * 찜 토글 핸들러
   * 낙관적 UI: 즉시 likedIds 상태 반전 → toggleWish API 호출 → 실패 시 롤백
   * likedIds는 "현재 세션에서 서버 기본값을 반전한 id 목록"
   */
  const handleLike = useCallback(async (id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    try {
      await toggleWish(id)
    } catch {
      /* API 실패 시 낙관적 변경을 롤백 */
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }
  }, [])
  
  /* API 쿼리 파라미터 빌드 */
  const queryParams = {
    sport: filter.sport !== 'all' ? filter.sport : undefined,
    condition: filter.grade !== 'all' ? filter.grade as Grade : undefined,
    tradeType: filter.deliveryType !== 'all' ? filter.deliveryType : undefined,
    sort: filter.sort,
    size: 20,
    page: 0,
  }
  
  /* 판매글 목록 조회 */
  const {data, isLoading, isError} = useQuery({
    queryKey: ['listings', queryParams],
    queryFn: () => getListings(queryParams),
    staleTime: 30_000,  // 30초 동안 재요청 없음
  })
  
  /* 찜 상태를 로컬 토글과 병합 */
  const listings: PostCard[] = (data?.content ?? []).map((item) => ({
    ...item,
    isWished: likedIds.has(item.postId) ? !item.isWished : item.isWished,
  }))
  
  return (
    <div style={{background: 'var(--color-bg)'}}>
      {/* 히어로 */}
      <HeroSection/>
      
      {/* 본문 */}
      <div className="flex max-w-[1280px] mx-auto" style={{minHeight: 500}}>
        {/* 사이드바 — md 이상에서만 표시 */}
        <div className="hidden md:block">
          <FilterSidebar filter={filter} onChange={setFilter}/>
        </div>
        
        {/* 콘텐츠 */}
        <main className="flex-1 min-w-0 px-6 py-6">
          {/* 필터 행 */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className="text-[14px]" style={{color: 'var(--color-text-sub)'}}>
              상품 <strong style={{color: 'var(--color-text-main)'}}>{data?.totalElements ?? 0}</strong>개
            </span>
            
            {/* 모바일 필터 버튼 */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-1.5 text-[14px] px-3 h-8 rounded-[7px] transition-colors"
              style={{
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-sub)',
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.75}/>
              필터
            </button>
            
            {/* 정렬 */}
            <div className="flex gap-4 ml-auto">
              {SORT_OPTIONS.map(({key, label}) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter((f) => ({...f, sort: key}))}
                  className="text-[14px] transition-colors"
                  style={{
                    color: filter.sort === key ? 'var(--color-accent)' : 'var(--color-text-hint)',
                    fontWeight: filter.sort === key ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 상품 그리드 — 2열(모바일) / 3열(md) / 4열(lg) / 5열(xl) */}
          {isLoading ? (
            /* 스켈레톤 로딩 */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 mb-8">
              {Array.from({length: 10}).map((_, i) => (
                <div key={i} className="rounded-[var(--r-card)] overflow-hidden animate-pulse"
                     style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                  <div style={{height: 160, background: 'var(--color-surface-raised)'}}/>
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 rounded" style={{background: 'var(--color-surface-raised)', width: '60%'}}/>
                    <div className="h-4 rounded" style={{background: 'var(--color-surface-raised)'}}/>
                    <div className="h-5 rounded" style={{background: 'var(--color-surface-raised)', width: '40%'}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            /* 에러 상태 */
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <AlertCircle size={32} color="var(--color-error)"/>
              <p className="text-[15px] font-medium" style={{color: 'var(--color-text-main)'}}>
                상품을 불러오지 못했습니다
              </p>
              <p className="text-[14px]" style={{color: 'var(--color-text-hint)'}}>
                잠시 후 다시 시도해주세요.
              </p>
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 mb-8">
              {listings.map((item) => (
                <ProductCard key={item.postId} item={item} onLike={handleLike}/>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[15px] font-medium mb-2" style={{color: 'var(--color-text-main)'}}>
                조건에 맞는 상품이 없어요.
              </p>
              <p className="text-[14px]" style={{color: 'var(--color-text-hint)'}}>
                필터를 조정해 다시 검색해 보세요.
              </p>
            </div>
          )}
        
        </main>
      </div>
    </div>
  )
}
