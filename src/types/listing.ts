/**
 * listing.ts — 상품 관련 공통 TypeScript 타입
 * 백엔드 Enum과 동일한 UPPERCASE 값 사용
 */

// ── 기본 Enum 타입 ────────────────────────────────────────────────────────────

/** 상품 컨디션 등급 (백엔드 Grade enum 일치) */
export type Grade = 'S' | 'A' | 'B' | 'C'

/** 배송/거래 방식 (백엔드 DeliveryType enum 일치) */
export type DeliveryType = 'DIRECT' | 'DELIVERY' | 'BOTH'

/** 배송 방식 UI 필터 — 전체 탭 포함 */
export type DeliveryFilter = DeliveryType | 'all'

/**
 * 종목 카테고리 (백엔드 Sport enum 일치)
 * ETC: 골프·기타 종목 포함
 */
export type Sport =
  | 'SOCCER'
  | 'BASEBALL'
  | 'BASKETBALL'
  | 'VOLLEYBALL'
  | 'ESPORTS'
  | 'ETC'

/** 종목 UI 필터 — 전체 탭 포함 */
export type SportFilter = Sport | 'all'

/** 판매글 상태 (백엔드 PostStatus enum 일치) */
export type PostStatus = 'ON_SALE' | 'RESERVED' | 'SOLD' | 'HIDDEN' | 'DELETED'

/** 거래 진행 상태 (백엔드 TradeStatus enum 일치) */
export type TradeStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'DISPUTED'

/** AI 사기 탐지 위험도 (백엔드 RiskLevel enum 일치) */
export type RiskLevel = 'LOW' | 'MID' | 'HIGH'

// ── 인터페이스 ─────────────────────────────────────────────────────────────────

/** 상품 목록 카드 아이템 */
export interface ListingItem {
  id: number
  title: string
  team: string
  league: string
  price: number
  grade: Grade
  size: string
  deliveryType: DeliveryType          // 구 tradeType → 백엔드 필드명으로 통일
  jerseyColor: string                 // 유니폼 대표 색 (CSS color)
  jerseyNumber?: string               // 유니폼 등번호
  likedCount: number
  isLiked: boolean
  sport: Sport
  timeAgo: string                     // "3시간 전" 등 표시용 문자열
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
  sport: Sport
  timeLeft: { hours: number; minutes: number; seconds: number }
  bidCount: number
  isLive: boolean
}

/** 홈 피드 필터 상태 */
export interface HomeFilter {
  sport: SportFilter
  league: string            // 'all' | 'EPL' | '라리가' | 'KBO' | ...
  grade: Grade | 'all'
  deliveryType: DeliveryFilter   // 구 tradeType
  sort: 'latest' | 'price_asc' | 'price_desc' | 'popular'
}
