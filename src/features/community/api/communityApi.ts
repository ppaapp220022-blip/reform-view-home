/**
 * communityApi.ts — 커뮤니티 REST API 함수 모음
 *
 * 백엔드 커뮤니티 Controller 기준 엔드포인트:
 *   GET    /api/community              — 게시글 목록 조회 (페이지네이션)
 *   POST   /api/community              — 게시글 작성
 *   GET    /api/community/{commId}     — 게시글 상세 조회
 *   POST   /api/community/{commId}/like — 좋아요 토글
 *   GET    /api/community/{commId}/replies       — 댓글 목록 조회
 *   POST   /api/community/{commId}/replies       — 댓글/대댓글 작성
 *   POST   /api/community/{commId}/replies/{replyId}/like — 댓글 좋아요 토글
 *   DELETE /api/community/{commId}/replies/{replyId}      — 댓글 삭제
 *
 * NOTE: 백엔드 커뮤니티 Controller는 현재 미구현 상태 (DTO·도메인만 완성)
 *       실제 서버 연결 전까지 호출 시 404 응답 예상
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import axiosInstance from '../../../lib/axios'
import type { PageResponse } from '../../../types/api'
import type {
  CommunityPostDetail,
  CommunityPostListItem,
  CommunityPostRequest,
  ReplyItem,
  ReplyRequest,
} from '../../../types/community'

// ── 게시글 API ────────────────────────────────────────────────────────────────

/**
 * 게시글 목록 조회
 * GET /api/community
 * page: 0-based 페이지 번호
 */
export async function getCommunityPosts(params?: {
  page?: number
  size?: number
  sport?: string
  sort?: 'latest' | 'popular'
}): Promise<PageResponse<CommunityPostListItem>> {
  const { data } = await axiosInstance.get<PageResponse<CommunityPostListItem>>(
    '/community',
    { params },
  )
  return data
}

/**
 * 게시글 상세 조회
 * GET /api/community/{commId}
 */
export async function getCommunityPostDetail(commId: number): Promise<CommunityPostDetail> {
  const { data } = await axiosInstance.get<CommunityPostDetail>(`/community/${commId}`)
  return data
}

/**
 * 게시글 작성
 * POST /api/community
 * @returns 생성된 게시글 상세 (commId 포함)
 */
export async function createCommunityPost(
  request: CommunityPostRequest,
): Promise<CommunityPostDetail> {
  const { data } = await axiosInstance.post<CommunityPostDetail>('/community', request)
  return data
}

/**
 * 게시글 좋아요 토글
 * POST /api/community/{commId}/like
 * @returns 업데이트된 likeCount + isLiked 여부
 */
export async function togglePostLike(
  commId: number,
): Promise<{ likeCount: number; isLiked: boolean }> {
  const { data } = await axiosInstance.post<{ likeCount: number; isLiked: boolean }>(
    `/community/${commId}/like`,
  )
  return data
}

// ── 댓글 API ──────────────────────────────────────────────────────────────────

/**
 * 댓글 목록 조회 (대댓글 children 포함)
 * GET /api/community/{commId}/replies
 */
export async function getReplies(commId: number): Promise<ReplyItem[]> {
  const { data } = await axiosInstance.get<ReplyItem[]>(`/community/${commId}/replies`)
  return data
}

/**
 * 댓글 / 대댓글 작성
 * POST /api/community/{commId}/replies
 * parentId가 있으면 대댓글, 없으면 최상위 댓글
 */
export async function createReply(commId: number, request: ReplyRequest): Promise<ReplyItem> {
  const { data } = await axiosInstance.post<ReplyItem>(
    `/community/${commId}/replies`,
    request,
  )
  return data
}

/**
 * 댓글 좋아요 토글
 * POST /api/community/{commId}/replies/{replyId}/like
 */
export async function toggleReplyLike(
  commId: number,
  replyId: number,
): Promise<{ likeCount: number; isLiked: boolean }> {
  const { data } = await axiosInstance.post<{ likeCount: number; isLiked: boolean }>(
    `/community/${commId}/replies/${replyId}/like`,
  )
  return data
}

/**
 * 댓글 삭제 (soft delete — isDeleted: true 처리)
 * DELETE /api/community/{commId}/replies/{replyId}
 */
export async function deleteReply(commId: number, replyId: number): Promise<void> {
  await axiosInstance.delete(`/community/${commId}/replies/${replyId}`)
}
