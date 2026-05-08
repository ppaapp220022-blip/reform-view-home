/**
 * listing.ts — 상품 관련 공통 TypeScript 타입
 */

/** 상품 컨디션 등급 */
export type Grade = 'S' | 'A' | 'B' | 'C'

/** 거래 방식 */
export type TradeType = 'direct' | 'delivery' | 'both'

/** 종목 카테고리 */
export type SportCategory = 'all' | 'soccer' | 'baseball' | 'basketball' | 'volleyball' | 'golf' | 'etc'

/** 상품 목록 아이템 */
export interface ListingItem {
  id: number
  title: string
  team: string
  league: string
  price: number
  grade: Grade
  size: string
  tradeType: TradeType
  /** 유니폼 대표 색 (CSS color) */
  jerseyColor: string
  /** 유니폼 번호 */
  jerseyNumber?: string
  likedCount: number
  isLiked: boolean
  sport: SportCategory
  /** 등록 후 경과 시간 표시 문자열 */
  timeAgo: string
}

/** 경매 아이템 */
export interface AuctionItem {
  id: number
  title: string
  team: string
  league: string
  currentPrice: number
  grade: Grade
  jerseyColor: string
  sport: SportCategory
  /** 남은 시간 */
  timeLeft: { hours: number; minutes: number; seconds: number }
  bidCount: number
  isLive: boolean
}

/** 홈 필터 상태 */
export interface HomeFilter {
  sport: SportCategory
  league: string   // 'all' | 'EPL' | '라리가' | 'KBO' | ...
  grade: Grade | 'all'
  tradeType: TradeType | 'all'
  sort: 'latest' | 'price_asc' | 'price_desc' | 'popular'
}
