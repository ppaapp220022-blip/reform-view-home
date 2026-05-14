/**
 * draftApi.ts — 게시글/댓글 임시저장 API 함수 모음
 *
 * 백엔드 DraftController (/api/drafts) 엔드포인트 연동
 * Redis 기반 자동 저장 (회원별 단건 보관)
 *
 * 게시글 초안:
 *   PATCH  /api/drafts/posts — 게시글 초안 저장/갱신
 *   GET    /api/drafts/posts — 게시글 초안 조회
 *   DELETE /api/drafts/posts — 게시글 초안 삭제
 *
 * 댓글 초안:
 *   PATCH  /api/drafts/replies — 댓글 초안 저장/갱신
 *   GET    /api/drafts/replies — 댓글 초안 조회
 *   DELETE /api/drafts/replies — 댓글 초안 삭제
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'

// ── 타입 ─────────────────────────────────────────────────────────────────────

/**
 * 게시글 초안 (PostDraftDTO)
 * title·content·sport 중 하나 이상 포함
 */
export interface PostDraftDTO {
  title?: string
  content?: string
  sport?: string
}

/**
 * 댓글 초안 (ReplyDraftDTO)
 * targetType: 대상 종류 ("POST" | "COMMUNITY_POST" 등)
 * targetId  : 대상 ID
 * content   : 작성 중인 댓글 내용
 */
export interface ReplyDraftDTO {
  targetType: string
  targetId: number
  content?: string
}

// ── 게시글 초안 API ───────────────────────────────────────────────────────────

/**
 * 게시글 초안 저장/갱신
 * PATCH /api/drafts/posts
 * 작성 중 자동 저장 (디바운스 권장)
 */
export async function savePostDraft(draft: PostDraftDTO): Promise<void> {
  await apiClient.patch('/drafts/posts', draft)
}

/**
 * 게시글 초안 조회
 * GET /api/drafts/posts
 * 편집 화면 진입 시 이전 초안이 있는지 확인
 */
export async function getPostDraft(): Promise<PostDraftDTO | null> {
  try {
    const {data} = await apiClient.get<PostDraftDTO>('/drafts/posts')
    return data
  } catch {
    // 초안 없음 (404) 등 — null로 처리
    return null
  }
}

/**
 * 게시글 초안 삭제
 * DELETE /api/drafts/posts
 * 게시글 작성 완료 후 초안을 정리
 */
export async function deletePostDraft(): Promise<void> {
  await apiClient.delete('/drafts/posts')
}

// ── 댓글 초안 API ─────────────────────────────────────────────────────────────

/**
 * 댓글 초안 저장/갱신
 * PATCH /api/drafts/replies
 */
export async function saveReplyDraft(draft: ReplyDraftDTO): Promise<void> {
  await apiClient.patch('/drafts/replies', draft)
}

/**
 * 댓글 초안 조회
 * GET /api/drafts/replies
 * @param targetType 대상 종류 ("POST" | "COMMUNITY_POST" 등)
 * @param targetId   대상 ID
 */
export async function getReplyDraft(
  targetType: string,
  targetId: number,
): Promise<ReplyDraftDTO | null> {
  try {
    const {data} = await apiClient.get<ReplyDraftDTO>('/drafts/replies', {
      params: {targetType, targetId},
    })
    return data
  } catch {
    return null
  }
}

/**
 * 댓글 초안 삭제
 * DELETE /api/drafts/replies
 */
export async function deleteReplyDraft(
  targetType: string,
  targetId: number,
): Promise<void> {
  await apiClient.delete('/drafts/replies', {
    params: {targetType, targetId},
  })
}
