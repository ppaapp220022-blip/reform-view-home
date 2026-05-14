/**
 * communityApi.ts — 커뮤니티 REST API 함수 모음
 *
 * 백엔드 CommunityController (/api/community) 엔드포인트 연동
 *
 * 게시글:
 *   GET    /api/community                    — 목록 조회 (sport 필터, 페이지네이션)
 *   GET    /api/community/{commId}           — 상세 조회
 *   POST   /api/community                    — 작성
 *   PUT    /api/community/{commId}           — 수정 (작성자 본인)
 *   DELETE /api/community/{commId}           — 삭제 (작성자 본인)
 *   POST   /api/community/{commId}/like      — 좋아요 토글 → 최신 likeCount 반환
 *   GET    /api/community/posts/popular      — 인기글 조회 (Redis ZSet 기준)
 *
 * 댓글:
 *   GET    /api/community/{commId}/replies          — 댓글+대댓글 목록 조회
 *   POST   /api/community/{commId}/replies          — 댓글/대댓글 작성
 *   DELETE /api/community/replies/{replyId}         — 댓글 삭제 (작성자 본인)
 *   POST   /api/community/replies/{replyId}/like    — 댓글 좋아요 토글 → likeCount 반환
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import axiosInstance from '../../../lib/axios'
import type {PageResponse} from '../../../types/api'
import type {
  CommunityPostDetail,
  CommunityPostListItem,
  CommunityPostRequest,
  ReplyItem,
  ReplyRequest,
} from '../../../types/community'

// ── 인기글 타입 ───────────────────────────────────────────────────────────────

/** 인기글 항목 (PopularPostDTO — Redis ZSet 기준) */
export interface PopularPost {
  commId: number
  title: string
  score: number   // Redis ZSet score (좋아요+조회 합산)
}

// ── 게시글 수정 요청 타입 ─────────────────────────────────────────────────────

/** 게시글 수정 요청 (CommunityPostUpdateRequestDTO) */
export interface CommunityPostUpdateRequest {
  title?: string
  content?: string
  sport?: string
}

// ── 게시글 API ────────────────────────────────────────────────────────────────

/**
 * 게시글 목록 조회
 * GET /api/community
 */
export async function getCommunityPosts(params?: {
  page?: number
  size?: number
  sport?: string
}): Promise<PageResponse<CommunityPostListItem>> {
  const {data} = await axiosInstance.get<PageResponse<CommunityPostListItem>>(
    '/community',
    {params},
  )
  return data
}

/**
 * 게시글 상세 조회
 * GET /api/community/{commId}
 * 비로그인 시 isLiked = false
 */
export async function getCommunityPostDetail(commId: number): Promise<CommunityPostDetail> {
  const {data} = await axiosInstance.get<CommunityPostDetail>(`/community/${commId}`)
  return data
}

/**
 * 게시글 작성
 * POST /api/community
 * @returns 생성된 게시글 ID
 */
export async function createCommunityPost(
  request: CommunityPostRequest,
): Promise<{ commId: number }> {
  const {data} = await axiosInstance.post<{ commId: number }>('/community', request)
  return data
}

/**
 * 게시글 수정 (작성자 본인만 가능)
 * PUT /api/community/{commId}
 * @returns 수정된 게시글 ID
 */
export async function updateCommunityPost(
  commId: number,
  request: CommunityPostUpdateRequest,
): Promise<{ commId: number }> {
  const {data} = await axiosInstance.put<{ commId: number }>(
    `/community/${commId}`,
    request,
  )
  return data
}

/**
 * 게시글 삭제 (작성자 본인만 가능)
 * DELETE /api/community/{commId}
 */
export async function deleteCommunityPost(commId: number): Promise<void> {
  await axiosInstance.delete(`/community/${commId}`)
}

/**
 * 게시글 좋아요 토글
 * POST /api/community/{commId}/like
 * @returns 업데이트된 likeCount (number)
 */
export async function togglePostLike(commId: number): Promise<number> {
  const {data} = await axiosInstance.post<number>(`/community/${commId}/like`)
  return data
}

/**
 * 인기글 조회 (Redis ZSet 기준 상위 N개)
 * GET /api/community/posts/popular
 */
export async function getPopularPosts(size = 10): Promise<PopularPost[]> {
  const {data} = await axiosInstance.get<PopularPost[]>('/community/posts/popular', {
    params: {size},
  })
  return data
}

// ── 댓글 API ──────────────────────────────────────────────────────────────────

/**
 * 댓글 목록 조회 (대댓글 children 포함)
 * GET /api/community/{commId}/replies
 * 작성자는 익명 처리됨 (서버 정책)
 */
export async function getReplies(commId: number): Promise<ReplyItem[]> {
  const {data} = await axiosInstance.get<ReplyItem[]>(`/community/${commId}/replies`)
  return data
}

/**
 * 댓글 / 대댓글 작성
 * POST /api/community/{commId}/replies
 * parentId가 있으면 대댓글, 없으면 최상위 댓글
 */
export async function createReply(commId: number, request: ReplyRequest): Promise<ReplyItem> {
  const {data} = await axiosInstance.post<ReplyItem>(
    `/community/${commId}/replies`,
    request,
  )
  return data
}

/**
 * 댓글 삭제 (작성자 본인만 가능)
 * DELETE /api/community/replies/{replyId}
 * NOTE: 경로에 commId 없음 — 백엔드 설계 기준
 */
export async function deleteReply(replyId: number): Promise<void> {
  await axiosInstance.delete(`/community/replies/${replyId}`)
}

/**
 * 댓글 좋아요 토글
 * POST /api/community/replies/{replyId}/like
 * NOTE: 경로에 commId 없음 — 백엔드 설계 기준
 * @returns 업데이트된 likeCount (number)
 */
export async function toggleReplyLike(replyId: number): Promise<number> {
  const {data} = await axiosInstance.post<number>(
    `/community/replies/${replyId}/like`,
  )
  return data
}
