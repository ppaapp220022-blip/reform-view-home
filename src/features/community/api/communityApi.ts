/**
 * communityApi.ts — 커뮤니티 REST API 함수
 *
 * 백엔드 예상 endpoints (DTO 기준, Controller 구현 대기 중):
 *   GET  /api/community              — 게시글 목록 조회 (페이지네이션)
 *   POST /api/community              — 게시글 작성
 *   GET  /api/community/{commId}     — 게시글 상세 조회
 *   PUT  /api/community/{commId}     — 게시글 수정
 *   DELETE /api/community/{commId}   — 게시글 삭제
 *   POST /api/community/{commId}/like — 좋아요 토글
 *   GET  /api/community/{commId}/replies          — 댓글 목록
 *   POST /api/community/{commId}/replies          — 댓글 작성
 *   POST /api/community/{commId}/replies/{replyId}/like — 댓글 좋아요 토글
 *   DELETE /api/community/{commId}/replies/{replyId}    — 댓글 삭제
 */
import axiosInstance from '../../../lib/axios'
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
 * page: 0-based 페이지 번호
 */
export async function getCommunityPosts(params?: {
  page?: number
  size?: number
  sport?: string
  sort?: 'latest' | 'popular'
}): Promise<CommunityPostListItem[]> {
  const { data } = await axiosInstance.get<CommunityPostListItem[]>('/api/community', { params })
  return data
}

/**
 * 게시글 상세 조회
 */
export async function getCommunityPostDetail(commId: number): Promise<CommunityPostDetail> {
  const { data } = await axiosInstance.get<CommunityPostDetail>(`/api/community/${commId}`)
  return data
}

/**
 * 게시글 작성
 */
export async function createCommunityPost(request: CommunityPostRequest): Promise<CommunityPostDetail> {
  const { data } = await axiosInstance.post<CommunityPostDetail>('/api/community', request)
  return data
}

/**
 * 게시글 좋아요 토글
 * 응답: 업데이트된 likeCount
 */
export async function togglePostLike(commId: number): Promise<{ likeCount: number; isLiked: boolean }> {
  const { data } = await axiosInstance.post<{ likeCount: number; isLiked: boolean }>(
    `/api/community/${commId}/like`,
  )
  return data
}

// ── 댓글 API ──────────────────────────────────────────────────────────────────

/**
 * 댓글 목록 조회 (대댓글 children 포함)
 */
export async function getReplies(commId: number): Promise<ReplyItem[]> {
  const { data } = await axiosInstance.get<ReplyItem[]>(`/api/community/${commId}/replies`)
  return data
}

/**
 * 댓글 / 대댓글 작성
 * parentId가 있으면 대댓글, 없으면 최상위 댓글
 */
export async function createReply(commId: number, request: ReplyRequest): Promise<ReplyItem> {
  const { data } = await axiosInstance.post<ReplyItem>(
    `/api/community/${commId}/replies`,
    request,
  )
  return data
}

/**
 * 댓글 좋아요 토글
 */
export async function toggleReplyLike(
  commId: number,
  replyId: number,
): Promise<{ likeCount: number; isLiked: boolean }> {
  const { data } = await axiosInstance.post<{ likeCount: number; isLiked: boolean }>(
    `/api/community/${commId}/replies/${replyId}/like`,
  )
  return data
}

/**
 * 댓글 삭제 (soft delete — isDeleted: true)
 */
export async function deleteReply(commId: number, replyId: number): Promise<void> {
  await axiosInstance.delete(`/api/community/${commId}/replies/${replyId}`)
}
