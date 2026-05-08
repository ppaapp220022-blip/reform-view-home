/**
 * HomePage — 홈 피드 (Screen 1)
 *
 * 구성:
 *   SportFilterBar   — 종목 탭 + 리그 칩 (GNB 바로 아래)
 *   HeroSection        — navy 배경, 피처 상품 + 통계
 *   [Sidebar | Grid]   — 필터 사이드바(220px) + 상품 5열 그리드
 *   AuctionSection     — LIVE 경매 3열
 *
 * 상태: 로컬 필터 (추후 URL params + useQuery 전환)
 * 데이터: 목 데이터 (백엔드 미연동)
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ChevronRight, SlidersHorizontal } from 'lucide-react'
import type {
  ListingItem, AuctionItem, HomeFilter,
  Grade, SportFilter,
} from '../types/listing'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MOCK_LISTINGS: ListingItem[] = [
  { id:1, title:'맨체스터 유나이티드 23/24 홈 어센틱', team:'맨체스터 유나이티드', league:'EPL', price:78000, grade:'S', size:'M', deliveryType:'DELIVERY', jerseyColor:'#B5222B', jerseyNumber:'7', likedCount:24, isLiked:false, sport:'SOCCER', timeAgo:'2시간 전' },
  { id:2, title:'리버풀 FC 07/08 어웨이 레플리카', team:'리버풀 FC', league:'EPL', price:55000, grade:'A', size:'L', deliveryType:'BOTH', jerseyColor:'#C8102E', jerseyNumber:'10', likedCount:18, isLiked:true, sport:'SOCCER', timeAgo:'5시간 전' },
  { id:3, title:'첼시 FC 11/12 홈 어센틱', team:'첼시 FC', league:'EPL', price:43000, grade:'B', size:'XL', deliveryType:'DELIVERY', jerseyColor:'#034694', jerseyNumber:'11', likedCount:7, isLiked:false, sport:'SOCCER', timeAgo:'어제' },
  { id:4, title:'레알 마드리드 21/22 서드 킷', team:'레알 마드리드', league:'라리가', price:92000, grade:'S', size:'S', deliveryType:'DIRECT', jerseyColor:'#6B0078', jerseyNumber:'9', likedCount:41, isLiked:false, sport:'SOCCER', timeAgo:'3일 전' },
  { id:5, title:'전북 현대 2024 홈 어센틱', team:'전북 현대', league:'K리그', price:66000, grade:'S', size:'M', deliveryType:'DELIVERY', jerseyColor:'#1A7A40', jerseyNumber:'27', likedCount:12, isLiked:false, sport:'SOCCER', timeAgo:'1주 전' },
  { id:6, title:'바르셀로나 22/23 어웨이 레플리카', team:'FC 바르셀로나', league:'라리가', price:48000, grade:'A', size:'M', deliveryType:'DELIVERY', jerseyColor:'#A50044', jerseyNumber:'10', likedCount:33, isLiked:true, sport:'SOCCER', timeAgo:'4시간 전' },
  { id:7, title:'두산 베어스 2023 홈 유니폼', team:'두산 베어스', league:'KBO', price:59000, grade:'S', size:'L', deliveryType:'DELIVERY', jerseyColor:'#002147', jerseyNumber:'36', likedCount:9, isLiked:false, sport:'BASEBALL', timeAgo:'6시간 전' },
  { id:8, title:'KT 위즈 2024 어웨이 유니폼', team:'KT 위즈', league:'KBO', price:44000, grade:'B', size:'XL', deliveryType:'BOTH', jerseyColor:'#D50032', jerseyNumber:'22', likedCount:5, isLiked:false, sport:'BASEBALL', timeAgo:'2일 전' },
  { id:9, title:'서울 SK 나이츠 23/24 홈', team:'서울 SK 나이츠', league:'KBL', price:71000, grade:'A', size:'M', deliveryType:'DIRECT', jerseyColor:'#E3001B', jerseyNumber:'14', likedCount:16, isLiked:false, sport:'BASKETBALL', timeAgo:'어제' },
  { id:10, title:'인천 대한항공 점보스 유니폼', team:'인천 대한항공', league:'V리그', price:38000, grade:'C', size:'S', deliveryType:'DELIVERY', jerseyColor:'#003087', jerseyNumber:'5', likedCount:3, isLiked:false, sport:'VOLLEYBALL', timeAgo:'3일 전' },
]

const MOCK_AUCTIONS: AuctionItem[] = [
  { id:101, title:'KIA 타이거즈 우승 기념 어센틱', team:'KIA 타이거즈', league:'KBO', currentPrice:287000, grade:'S', jerseyColor:'#D50032', sport:'BASEBALL', timeLeft:{hours:2, minutes:34, seconds:17}, bidCount:12, isLive:true },
  { id:102, title:'맨유 퍼거슨 시대 레트로 홈', team:'맨체스터 유나이티드', league:'EPL', currentPrice:145000, grade:'A', jerseyColor:'#B5222B', sport:'SOCCER', timeLeft:{hours:0, minutes:48, seconds:55}, bidCount:7, isLive:true },
  { id:103, title:'대한민국 국가대표 2002 어센틱', team:'대한민국', league:'국가대표', currentPrice:520000, grade:'S', jerseyColor:'#C0392B', sport:'SOCCER', timeLeft:{hours:5, minutes:12, seconds:40}, bidCount:23, isLive:true },
]

// ── 종목 카테고리 ──────────────────────────────────────────────────────────────

const SPORT_TABS: { key: SportFilter; label: string }[] = [
  { key:'all',        label:'전체' },
  { key:'BASEBALL',   label:'야구' },
  { key:'SOCCER',     label:'축구' },
  { key:'BASKETBALL', label:'농구' },
  { key:'VOLLEYBALL', label:'배구' },
  { key:'ESPORTS',    label:'e스포츠' },
  { key:'ETC',        label:'기타' },
]

const LEAGUES = ['전체', 'EPL', '라리가', '분데스리가', '세리에A', 'K리그', 'KBO', 'KBL', 'V리그']
const GRADES: { key: Grade | 'all'; label: string }[] = [
  { key:'all', label:'전체' },
  { key:'S', label:'S급' },
  { key:'A', label:'A급' },
  { key:'B', label:'B급' },
  { key:'C', label:'C급' },
]
const SORT_OPTIONS: { key: HomeFilter['sort']; label: string }[] = [
  { key:'latest',     label:'최신순' },
  { key:'popular',    label:'인기순' },
  { key:'price_asc',  label:'낮은가격' },
  { key:'price_desc', label:'높은가격' },
]

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function padTime(n: number) {
  return String(n).padStart(2, '0')
}

/** 등급별 배경색 */
function gradeStyle(grade: Grade): React.CSSProperties {
  const map: Record<Grade, string> = {
    S: 'var(--color-primary)',
    A: 'var(--color-accent)',
    B: 'var(--color-text-sub)',
    C: 'var(--color-text-hint)',
  }
  return { background: map[grade], color: '#fff' }
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
function Jersey({ color, number, size = 'sm' }: JerseyProps) {
  const w  = size === 'lg' ? 80  : 52
  const h  = size === 'lg' ? 96  : 64
  const sw = size === 'lg' ? 20  : 13  // sleeve width
  const sh = size === 'lg' ? 32  : 22  // sleeve height
  const numSize = size === 'lg' ? 32 : 20

  return (
    <svg
      width={w + sw * 2}
      height={h}
      viewBox={`0 0 ${w + sw * 2} ${h}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* 왼쪽 소매 */}
      <rect x={0} y={0} width={sw} height={sh} rx={4} fill={color} opacity={0.9} />
      {/* 오른쪽 소매 */}
      <rect x={w + sw} y={0} width={sw} height={sh} rx={4} fill={color} opacity={0.9} />
      {/* 몸통 */}
      <rect x={sw} y={0} width={w} height={h} rx={4} fill={color} />
      {/* 가로 스트라이프 */}
      <rect x={sw} y={size === 'lg' ? 24 : 16} width={w} height={size === 'lg' ? 6 : 4} fill="rgba(255,255,255,0.2)" />
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
  item: ListingItem
  onLike: (id: number) => void
}

function ProductCard({ item, onLike }: ProductCardProps) {
  return (
    <Link
      to={`/listing/${item.id}`}
      className="block no-underline rounded-[var(--r-card)] overflow-hidden hover:border-[var(--color-border-strong)] transition-colors"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 이미지 영역 */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 160, background: 'var(--color-surface-sunken)' }}
      >
        {/* 등급 배지 */}
        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-[5px]"
          style={gradeStyle(item.grade)}
        >
          {item.grade}
        </span>

        {/* 유니폼 */}
        <Jersey color={item.jerseyColor} number={item.jerseyNumber} />

        {/* 찜 버튼 */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onLike(item.id) }}
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
              color: item.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)',
              fill: item.isLiked ? 'var(--color-accent)' : 'none',
            }}
          />
        </button>
      </div>

      {/* 정보 영역 */}
      <div className="p-3">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.5px] mb-1"
          style={{ color: 'var(--color-text-hint)' }}
        >
          {item.team} · {item.league}
        </p>
        <p
          className="text-[14px] font-medium leading-snug mb-2 line-clamp-2"
          style={{ color: 'var(--color-text-main)' }}
        >
          {item.title}
        </p>
        <p
          className="text-[16px] font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          {formatPrice(item.price)}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-sub)',
            }}
          >
            {item.size}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-hint)' }}>
            {item.timeAgo}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── 경매 카드 ─────────────────────────────────────────────────────────────────

function AuctionCard({ item }: { item: AuctionItem }) {
  const { hours, minutes, seconds } = item.timeLeft
  const isUrgent = hours === 0 && minutes < 60

  return (
    <div
      className="rounded-[var(--r-card)] overflow-hidden shadow-card"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 상단: 썸네일 + 정보 */}
      <div className="flex gap-4 p-4">
        {/* 유니폼 썸네일 */}
        <div
          className="relative w-20 h-24 rounded-[9px] flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'var(--color-surface-sunken)' }}
        >
          <div style={{ transform: 'scale(0.75)' }}>
            <Jersey color={item.jerseyColor} />
          </div>
          {/* LIVE 배지 */}
          {item.isLive && (
            <span
              className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-[0.5px]"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              LIVE
            </span>
          )}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.5px] mb-1"
            style={{ color: 'var(--color-text-hint)' }}
          >
            {item.team} · {item.league}
          </p>
          <p
            className="text-[15px] font-medium leading-snug mb-2"
            style={{ color: 'var(--color-text-main)' }}
          >
            {item.title}
          </p>
          <div className="flex gap-1.5">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={gradeStyle(item.grade)}
            >
              {item.grade}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(255,46,77,0.08)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(255,46,77,0.2)',
              }}
            >
              입찰 {item.bidCount}회
            </span>
          </div>
        </div>
      </div>

      {/* 하단: 현재가 + 타이머 (navy 배경) */}
      <div
        className="flex items-center gap-6 px-4 py-3"
        style={{ background: 'var(--color-primary)' }}
      >
        <div>
          <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>현재 입찰가</p>
          <p
            className="text-[22px] leading-none text-white"
            style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
          >
            {formatPrice(item.currentPrice)}
          </p>
        </div>

        {/* 타이머 */}
        <div className="flex items-center gap-1.5 ml-auto">
          {[
            { val: hours,   unit: 'HR' },
            { val: minutes, unit: 'MIN' },
            { val: seconds, unit: 'SEC' },
          ].map(({ val, unit }, i) => (
            <div key={unit} className="flex items-center gap-1.5">
              <div
                className="rounded-[5px] px-2 py-1 text-center min-w-[38px]"
                style={{ background: isUrgent ? 'rgba(255,46,77,0.3)' : 'rgba(255,255,255,0.12)' }}
              >
                <div
                  className="text-[18px] text-white leading-none"
                  style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
                >
                  {padTime(val)}
                </div>
                <div className="text-[8px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {unit}
                </div>
              </div>
              {i < 2 && (
                <span
                  className="text-[18px] leading-none pb-2"
                  style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", color: 'rgba(255,255,255,0.3)' }}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 종목 카테고리 바 ──────────────────────────────────────────────────────────

interface SportFilterBarProps {
  active: SportFilter
  onSelect: (s: SportFilter) => void
}

function SportFilterBar({ active, onSelect }: SportFilterBarProps) {
  return (
    <div
      className="sticky top-[56px] z-30 flex items-center overflow-x-auto"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* 종목 탭 */}
      <div className="flex flex-shrink-0 px-8">
        {SPORT_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="px-5 h-11 flex items-center text-[13px] whitespace-nowrap transition-colors border-b-2"
            style={{
              borderColor: active === key ? 'var(--color-accent)' : 'transparent',
              color: active === key ? 'var(--color-accent)' : 'var(--color-text-sub)',
              fontWeight: active === key ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 mx-2 flex-shrink-0" style={{ background: 'var(--color-border-strong)' }} />

      {/* 리그 칩 */}
      <div className="flex gap-2 px-2 flex-shrink-0">
        {['EPL', '라리가', 'KBO', 'KBL'].map((lg) => (
          <span
            key={lg}
            className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap transition-colors"
            style={{
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text-sub)',
              background: 'transparent',
            }}
          >
            {lg}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Hero 섹션 ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div
      className="relative overflow-hidden px-8 py-10"
      style={{ background: 'var(--color-primary)' }}
    >
      {/* 장식 원 */}
      <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ border: '36px solid rgba(255,255,255,0.03)' }} />
      <div className="absolute right-20 -bottom-16 w-44 h-44 rounded-full pointer-events-none"
        style={{ border: '24px solid rgba(255,255,255,0.03)' }} />

      <div className="max-w-[1126px] mx-auto flex items-center gap-12">
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] tracking-[2px] uppercase mb-2 font-medium" style={{ color: 'var(--color-accent)' }}>
            FEATURED LISTING
          </p>
          <h2
            className="text-[48px] sm:text-[56px] leading-[1] text-white mb-3"
            style={{ fontFamily: "'Giants-Inline','IAMAPLAYER',Giants,sans-serif", letterSpacing: '2px' }}
          >
            MAN UTD 23/24<br />
            <span style={{ color: 'var(--color-accent)' }}>HOME</span> AUTHENTIC
          </h2>
          <p className="text-[13px] mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Size M · Grade S · 에스크로 안전결제 지원
          </p>
          <div className="flex gap-2.5">
            <Link
              to="/listing/1"
              className="inline-flex items-center h-11 px-7 rounded-[10px] text-[15px] font-medium text-white no-underline hover:text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}
            >
              지금 보기
            </Link>
            <button
              type="button"
              className="h-11 px-7 rounded-[10px] text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)' }}
            >
              찜하기
            </button>
          </div>

          {/* 통계 바 */}
          <div
            className="flex gap-8 mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            {[
              { num: '4,820', lbl: '누적 거래' },
              { num: '31,500', lbl: '등록 상품' },
              { num: '9,200', lbl: '활성 회원' },
              { num: '98%', lbl: '만족도' },
            ].map(({ num, lbl }) => (
              <div key={lbl}>
                <p
                  className="text-[28px] leading-none text-white"
                  style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
                >
                  {num}
                </p>
                <p className="text-[11px] mt-1 tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {lbl}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 유니폼 일러스트 (데스크탑만) */}
        <div className="hidden md:flex items-center justify-center w-56 flex-shrink-0 relative">
          <div style={{ transform: 'rotate(-4deg)', opacity: 0.9 }}>
            <Jersey color="#B5222B" number="7" size="lg" />
          </div>
          <div className="absolute right-6 -bottom-4" style={{ transform: 'rotate(6deg)', opacity: 0.45, zIndex: 0 }}>
            <Jersey color="#ffffff" number="" size="lg" />
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

function FilterSidebar({ filter, onChange }: FilterSidebarProps) {
  function set<K extends keyof HomeFilter>(key: K, value: HomeFilter[K]) {
    onChange({ ...filter, [key]: value })
  }

  return (
    <aside
      className="w-[220px] flex-shrink-0 py-5"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* 리그 */}
      <p className="text-[10px] font-medium uppercase tracking-[1px] px-5 mb-2 mt-1"
        style={{ color: 'var(--color-text-hint)' }}>리그</p>
      {LEAGUES.map((lg) => {
        const key = lg === '전체' ? 'all' : lg
        const isActive = filter.league === key
        return (
          <button
            key={lg}
            type="button"
            onClick={() => set('league', key)}
            className="flex items-center w-full gap-2.5 px-5 py-2.5 text-[13px] text-left transition-colors"
            style={{
              borderLeft: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
              background: isActive ? 'var(--color-surface-sunken)' : 'transparent',
              color: isActive ? 'var(--color-text-main)' : 'var(--color-text-sub)',
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {lg}
          </button>
        )
      })}

      {/* 컨디션 */}
      <p className="text-[10px] font-medium uppercase tracking-[1px] px-5 mb-2 mt-5"
        style={{ color: 'var(--color-text-hint)' }}>컨디션</p>
      <div className="flex gap-2 px-5 flex-wrap">
        {GRADES.map(({ key, label }) => {
          const isActive = filter.grade === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('grade', key)}
              className="text-[11px] px-2.5 py-1 rounded transition-colors"
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
      <p className="text-[10px] font-medium uppercase tracking-[1px] px-5 mb-2 mt-5"
        style={{ color: 'var(--color-text-hint)' }}>거래 방식</p>
      <div className="flex gap-2 px-5">
        {([['all','전체'],['DELIVERY','택배'],['DIRECT','직거래']] as const).map(([key, label]) => {
          const isActive = filter.deliveryType === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => set('deliveryType', key)}
              className="text-[11px] px-2.5 py-1 rounded transition-colors"
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
          className="w-full h-8 text-[12px] font-medium text-white rounded-[7px] transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
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
    league: 'all',
    grade: 'all',
    deliveryType: 'all',
    sort: 'latest',
  })
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  /* 찜 토글 */
  function handleLike(id: number) {
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  /* 클라이언트 필터링 (목 데이터용) */
  const filtered = MOCK_LISTINGS.filter((item) => {
    if (filter.sport !== 'all' && item.sport !== filter.sport) return false
    if (filter.league !== 'all' && item.league !== filter.league) return false
    if (filter.grade !== 'all' && item.grade !== filter.grade) return false
    if (filter.deliveryType !== 'all' && item.deliveryType !== filter.deliveryType) return false
    return true
  }).map((item) => ({ ...item, isLiked: likedIds.has(item.id) || item.isLiked }))

  return (
    <div style={{ background: 'var(--color-bg)' }}>
      {/* 종목 카테고리 바 */}
      <SportFilterBar
        active={filter.sport}
        onSelect={(s) => setFilter((f) => ({ ...f, sport: s }))}
      />

      {/* 히어로 */}
      <HeroSection />

      {/* 본문 */}
      <div className="flex max-w-[1280px] mx-auto" style={{ minHeight: 500 }}>
        {/* 사이드바 — md 이상에서만 표시 */}
        <div className="hidden md:block">
          <FilterSidebar filter={filter} onChange={setFilter} />
        </div>

        {/* 콘텐츠 */}
        <main className="flex-1 min-w-0 px-6 py-6">
          {/* 필터 행 */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>
              상품 <strong style={{ color: 'var(--color-text-main)' }}>{filtered.length}</strong>개
            </span>

            {/* 모바일 필터 버튼 */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-1.5 text-[13px] px-3 h-8 rounded-[7px] transition-colors"
              style={{
                border: '1px solid var(--color-border-strong)',
                color: 'var(--color-text-sub)',
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={1.75} />
              필터
            </button>

            {/* 정렬 */}
            <div className="flex gap-4 ml-auto">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, sort: key }))}
                  className="text-[13px] transition-colors"
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
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 mb-8">
              {filtered.map((item) => (
                <ProductCard key={item.id} item={item} onLike={handleLike} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[15px] font-medium mb-2" style={{ color: 'var(--color-text-main)' }}>
                조건에 맞는 상품이 없어요.
              </p>
              <p className="text-[13px]" style={{ color: 'var(--color-text-hint)' }}>
                필터를 조정해 다시 검색해 보세요.
              </p>
            </div>
          )}

          {/* 경매 섹션 */}
          <div className="mt-2 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-main)' }}>
                  실시간 경매
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  LIVE {MOCK_AUCTIONS.length}
                </span>
              </div>
              <button
                type="button"
                className="flex items-center gap-0.5 text-[12px] transition-colors hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                전체 보기 <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {MOCK_AUCTIONS.map((item) => (
                <AuctionCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
