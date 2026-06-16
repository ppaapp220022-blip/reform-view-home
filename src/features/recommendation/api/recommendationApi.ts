/**
 * recommendationApi.ts — AI 개인화 추천 API
 *
 * GET /recommendations?size={n}
 *   - 로그인 회원의 관심 종목·키워드 + 최근 검색·클릭 이력 기반 맞춤 추천
 *   - 비로그인 시 빈 배열 반환
 */
import apiClient from '../../../lib/axios'
import type { DeliveryType, Grade, PostStatus, Sport } from '../../../types/listing'

/** 백엔드 RecommendPostCardDTO */
export interface RecommendPostCard {
  postId: number
  title: string
  team: string
  sport: Sport
  price: number
  grade: Grade
  size: string | null
  deliveryType: DeliveryType
  status: PostStatus
  viewCount: number
  wishCount: number
  thumbnailUrl: string | null
  createdAt: string
  /** "관심 종목 기반 추천" | "최근 활동 기반 추천" */
  recommendReason: string
}

/**
 * AI 개인화 추천 목록 조회
 * @param size 반환할 게시글 수 (기본 20, 최대 50)
 */
export async function getRecommendations(size = 20): Promise<RecommendPostCard[]> {
  const res = await apiClient.get<RecommendPostCard[]>('/recommendations', {
    params: { size },
  })
  // axios 인터셉터가 ApiResponse<T>를 언래핑해 data를 반환
  return res.data
}
