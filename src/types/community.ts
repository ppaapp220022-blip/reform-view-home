/**
 * community.ts — 커뮤니티 관련 공통 TypeScript 타입
 * 백엔드 DDL 기준 (community_post 테이블)
 */

import type { Sport } from './listing'

// ── Enum 타입 ─────────────────────────────────────────────────────────────────

/**
 * 커뮤니티 게시글 상태 (백엔드 CommunityPostStatus enum 일치)
 * ACTIVE  — 정상 게시 중
 * HIDDEN  — 관리자에 의해 숨김 처리
 * DELETED — 삭제됨
 */
export type CommunityPostStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'

// ── 공통 서브 타입 ─────────────────────────────────────────────────────────────

/** 작성자 요약 정보 */
export interface AuthorBrief {
  memberId: number
  nickname: string
  profileImageUrl?: string
}

// ── 커뮤니티 게시글 ───────────────────────────────────────────────────────────

/** 커뮤니티 게시글 목록 아이템 */
export interface CommunityPostListItem {
  commId: number
  sportCategory: Sport
  teamCategory?: string           // 관련 구단명 (선택)
  commTitle: string
  commViewCount: number
  likeCount: number
  commentCount: number
  status: CommunityPostStatus
  author: AuthorBrief
  createdAt: string               // ISO 8601 문자열
}

/** 커뮤니티 게시글 상세 */
export interface CommunityPostDetail extends CommunityPostListItem {
  commContent: string
  commImageUrl?: string           // 첨부 이미지 URL (선택)
  isLiked: boolean                // 로그인 사용자 기준 좋아요 여부
}

// ── 댓글 / 대댓글 ─────────────────────────────────────────────────────────────

/** 댓글 아이템 (대댓글 포함) */
export interface ReplyItem {
  replyId: number
  author: AuthorBrief
  replyContent: string
  likeCount: number
  isLiked: boolean
  isDeleted: boolean              // 삭제된 댓글 (내용 숨김 처리)
  createdAt: string
  children: ReplyItem[]           // 대댓글 목록 (최대 1단계)
}

// ── 요청 타입 (API 호출 시) ────────────────────────────────────────────────────

/** 게시글 작성/수정 요청 */
export interface CommunityPostRequest {
  sportCategory: Sport
  teamCategory?: string
  commTitle: string
  commContent: string
  commImageUrl?: string
}

/** 댓글 작성 요청 */
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
