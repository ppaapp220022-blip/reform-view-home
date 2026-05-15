/**
 * community.ts — 커뮤니티 관련 공통 TypeScript 타입
 *
 * 백엔드 DTO와 1:1 매핑:
 *   CommunityPostListItemDTO  → CommunityPostListItem
 *   CommunityPostDetailDTO    → CommunityPostDetail
 *   CommunityPostCreateRequestDTO → CommunityPostRequest
 *   ReplyResponseDTO          → ReplyItem
 *   ReplyCreateRequestDTO     → ReplyRequest
 */

import type {Sport} from './listing'

// ── Enum 타입 ─────────────────────────────────────────────────────────────────

/**
 * 커뮤니티 게시글 상태 (CommunityPostStatus enum 일치)
 * ACTIVE  — 정상 게시 중
 * HIDDEN  — 관리자에 의해 숨김 처리
 * DELETED — 삭제됨
 */
export type CommunityPostStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'

// ── 공통 서브 타입 ─────────────────────────────────────────────────────────────

/**
 * 작성자 요약 정보
 * 백엔드 chat.MemberBriefDTO 기준 (community DTO에서 재사용)
 */
export interface AuthorBrief {
  memberId: number | null
  nickname: string
  profileImageUrl: string | null
}

// ── 커뮤니티 게시글 ───────────────────────────────────────────────────────────

/**
 * 커뮤니티 게시글 목록 아이템 (CommunityPostListItemDTO)
 * 백엔드 필드명 기준:
 *   commId, sport, teamCategory, commTitle, commViewCount, ...
 */
export interface CommunityPostListItem {
  commId: number
  sport: Sport
  teamCategory: string | null     // 관련 구단명 (선택)
  commTitle: string
  commViewCount: number
  likeCount: number
  commentCount: number
  status: CommunityPostStatus
  author: AuthorBrief
  createdAt: string               // ISO 8601 문자열
}

/**
 * 커뮤니티 게시글 상세 (CommunityPostDetailDTO)
 * 목록 아이템 필드 + 본문·이미지·좋아요 여부 추가
 */
export interface CommunityPostDetail extends CommunityPostListItem {
  commContent: string
  commImageUrl: string | null     // 첨부 이미지 URL (선택)
  isLiked: boolean                // 로그인 사용자 기준 좋아요 여부
}

// ── 댓글 / 대댓글 ─────────────────────────────────────────────────────────────

/**
 * 댓글 아이템 (ReplyResponseDTO)
 * children: 대댓글 목록 (최대 1단계)
 */
export interface ReplyItem {
  replyId: number
  author: AuthorBrief
  replyContent: string
  likeCount: number
  isLiked: boolean
  isDeleted: boolean              // 삭제된 댓글 (내용 숨김 처리)
  createdAt: string
  children: ReplyItem[]
}

// ── 요청 타입 (API 호출 시) ────────────────────────────────────────────────────

/**
 * 게시글 작성 요청 (CommunityPostCreateRequestDTO)
 * 백엔드 필드명 그대로 사용 (sport → 'Sport' 는 백엔드 레코드 필드 이름이 대문자인 이슈,
 * JSON 직렬화 시 실제 키는 'sport'로 처리됨)
 */
export interface CommunityPostRequest {
  sport: Sport
  teamCategory?: string
  commTitle: string
  commContent: string
  commImageUrl?: string
}

/** 댓글 작성 요청 (ReplyCreateRequestDTO) */
export interface ReplyRequest {
  replyContent: string
  parentId?: number               // 대댓글인 경우 부모 replyId
}

// ── UI 필터 ───────────────────────────────────────────────────────────────────

/** 커뮤니티 목록 필터 상태 */
export interface CommunityFilter {
  sport: Sport | 'all'
  sort: 'latest' | 'popular'
}
