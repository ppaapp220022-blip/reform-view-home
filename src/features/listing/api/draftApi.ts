/**
 * draftApi.ts — 게시글 초안(임시 저장) API
 *
 * 백엔드 DraftController (/api/drafts) 엔드포인트 연동
 *
 * PATCH  /api/drafts/posts           — 게시글 초안 저장 (upsert)
 * GET    /api/drafts/posts           — 게시글 초안 조회
 * DELETE /api/drafts/posts           — 게시글 초안 삭제
 * PATCH  /api/drafts/replies         — 댓글 초안 저장
 * GET    /api/drafts/replies         — 댓글 초안 조회
 * DELETE /api/drafts/replies         — 댓글 초안 삭제
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type {DeliveryType, Grade, RiskLevel, Sport} from '../../../types/listing'

// ── 타입 ─────────────────────────────────────────────────────────────────────

/**
 * 게시글 초안 (PostDraftDTO)
 * title   : 임시 저장된 제목 (최대 200자)
 * content : 임시 저장된 본문 (최대 2000자)
 */
export interface PostDraft {
  title: string | null
  content: string | null
  sport: Sport | null
  team: string | null
  uniformNumber: string | null
  condition: Grade | null
  size: string | null
  tradeType: DeliveryType | null
  price: number | null
  directTradeLocation: string | null
  imageUrls: string[] | null
}

export interface DraftModeration {
  riskLevel: RiskLevel
  reason: string | null
  suggestion: string | null
}

export interface PostDraftState {
  draft: PostDraft
  moderation: DraftModeration | null
}

/**
 * 댓글 초안 (ReplyDraftDTO)
 * targetType : 대상 종류 ('POST' | 'COMMUNITY_POST')
 * targetId   : 대상 ID
 * content    : 임시 저장된 댓글 내용
 */
export interface ReplyDraft {
  targetType: string
  targetId: number
  content: string | null
}

// ── 게시글 초안 API ────────────────────────────────────────────────────────────

/**
 * 게시글 초안 저장 (upsert)
 * PATCH /api/drafts/posts
 * ListingCreatePage에서 디바운스 자동저장으로 호출
 */
export async function savePostDraft(draft: PostDraft): Promise<PostDraftState> {
  const { data } = await apiClient.patch<PostDraftState>('/drafts/posts', draft)
  return data
}

/**
 * 게시글 초안 조회
 * GET /api/drafts/posts
 * ListingCreatePage 마운트 시 불러오기에 사용
 */
export async function getPostDraft(): Promise<PostDraftState> {
  const { data } = await apiClient.get<PostDraftState>('/drafts/posts')
  return data
}

/**
 * 게시글 초안 삭제
 * DELETE /api/drafts/posts
 * 게시글 등록 성공 후 초안 정리 시 호출
 */
export async function deletePostDraft(): Promise<void> {
  await apiClient.delete('/drafts/posts')
}

// ── 댓글 초안 API ─────────────────────────────────────────────────────────────

/**
 * 댓글 초안 저장 (upsert)
 * PATCH /api/drafts/replies
 */
export async function saveReplyDraft(draft: ReplyDraft): Promise<void> {
  await apiClient.patch('/drafts/replies', draft)
}

/**
 * 댓글 초안 조회
 * GET /api/drafts/replies?targetType={targetType}&targetId={targetId}
 */
export async function getReplyDraft(targetType: string, targetId: number): Promise<ReplyDraft> {
  const {data} = await apiClient.get<ReplyDraft>('/drafts/replies', {
    params: {targetType, targetId},
  })
  return data
}

/**
 * 댓글 초안 삭제
 * DELETE /api/drafts/replies?targetType={targetType}&targetId={targetId}
 */
export async function deleteReplyDraft(targetType: string, targetId: number): Promise<void> {
  await apiClient.delete('/drafts/replies', {
    params: {targetType, targetId},
  })
}
