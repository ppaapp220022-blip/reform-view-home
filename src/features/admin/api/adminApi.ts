/**
 * adminApi.ts — 관리자 전용 API 함수 모음
 *
 * GET   /api/admin/members              — 회원 목록 조회
 * GET   /api/admin/members/{id}         — 회원 상세 조회
 * PATCH /api/admin/members/{id}/action  — 회원 제재 (경고/정지/탈퇴)
 * GET   /api/admin/posts                — 게시글 목록 조회
 * GET   /api/admin/posts/{id}           — 게시글 상세 조회
 * PATCH /api/admin/posts/{id}/action    — 게시글 조치 (숨김/삭제)
 * GET   /api/admin/reports              — 신고 목록 조회
 * PATCH /api/admin/reports/{id}         — 신고 처리
 * GET   /api/admin/withdraw-requests    — 출금 요청 목록
 * PATCH /api/admin/withdraw-requests/{withdrawId} — 출금 승인/반려
 *
 * 회원/게시글/신고 API는 ApiResponse 래퍼 사용,
 * 출금 API는 raw DTO 반환
 */
import apiClient from '../../../lib/axios'
import type {PageResponse} from '../../../types/api'

// ── 공통 타입 ─────────────────────────────────────────────────────────────────

/** 회원 상태 */
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'

/** 회원 제재 액션 */
export type MemberAction = 'WARN' | 'SUSPEND' | 'WITHDRAW'

/** 게시글 상태 */
export type PostStatus = 'ON_SALE' | 'RESERVED' | 'SOLD' | 'HIDDEN' | 'DELETED'

/** 게시글 조치 액션 */
export type PostAction = 'HIDE' | 'DELETE'

/** 신고 처리 상태 */
export type ReportStatus = 'PENDING' | 'NORMAL' | 'WARNING' | 'DELETED'

/** 신고 대상 타입 */
export type ReportTargetType = 'POST' | 'COMMUNITY_POST'

/** 신고 사유 */
export type ReportReason = 'FAKE' | 'INAPPROPRIATE' | 'FRAUD' | 'ETC'

/** 출금 처리 상태 */
export type WithdrawStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 출금 처리 액션 */
export type WithdrawAction = 'APPROVE' | 'REJECT'

/** 종목 enum */
export type Sport = 'SOCCER' | 'BASEBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'ESPORTS' | 'ETC'

/** 상태 등급 */
export type Grade = 'S' | 'A' | 'B' | 'C'

// ── 회원 관리 타입 ─────────────────────────────────────────────────────────────

/** 신고 항목 (ReportResponseDTO) */
export interface ReportItem {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  createdAt: string
}

/** 관리자 회원 목록 아이템 (AdminMemberListDTO) */
export interface AdminMemberListItem {
  memberId: number
  email: string
  nickname: string
  status: MemberStatus
  warningCount: number
  mannerScore: number
  createdAt: string
}

/** 관리자 회원 상세 (AdminMemberDetailDTO) */
export interface AdminMemberDetail {
  memberId: number
  email: string
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  status: MemberStatus
  warningCount: number
  mannerScore: number
  role: string
  createdAt: string
  receivedReports: ReportItem[]
  totalSales: number
  totalPurchases: number
  sports: string[]           // 관심 종목 목록 (UserPreference에서 파생)
}

/** 회원 제재 요청 */
export interface AdminMemberActionRequest {
  action: MemberAction
  reason?: string
}

// ── 게시글 관리 타입 ─────────────────────────────────────────────────────────

/** 관리자 게시글 목록 아이템 (AdminPostListDTO) */
export interface AdminPostListItem {
  postId: number
  title: string
  sport: Sport
  team: string
  price: number
  status: PostStatus
  reportCount: number
  sellerId: number
  sellerNickname: string
  createdAt: string
}

/** 관리자 게시글 상세 (AdminPostDetailDTO) */
export interface AdminPostDetail {
  postId: number
  title: string
  content: string
  sport: Sport
  team: string
  uniformName: string
  grade: Grade
  size: string
  marking: boolean
  price: number
  deliveryType: string
  status: PostStatus
  viewCount: number
  wishCount: number
  reportCount: number
  imageUrls: string[]
  sellerId: number
  sellerNickname: string
  sellerEmail: string
  createdAt: string
  updatedAt: string
  tradeId: number | null
}

/** 게시글 조치 요청 */
export interface AdminPostActionRequest {
  action: PostAction
  reason?: string
}

// ── 신고 관리 타입 ─────────────────────────────────────────────────────────────

/** 신고 처리 요청 */
export interface AdminReportActionRequest {
  action: ReportStatus
}

// ── 출금 관리 타입 ─────────────────────────────────────────────────────────────

/** 출금 요청 항목 (WithdrawResponseDTO) */
export interface AdminWithdrawItem {
  withdrawId: number
  requestAmount: number
  bankName: string
  accountNumber: string
  status: WithdrawStatus
  createdAt: string
}

/** 출금 처리 요청 */
export interface AdminWithdrawActionRequest {
  action: WithdrawAction
  rejectReason?: string
}

// ── 회원 관리 API ──────────────────────────────────────────────────────────────

/**
 * 관리자 회원 목록 조회
 * GET /api/admin/members?keyword=&status=&page=&size=
 */
export async function getAdminMembers(params?: {
  keyword?: string
  status?: MemberStatus
  page?: number
  size?: number
}): Promise<PageResponse<AdminMemberListItem>> {
  const {data} = await apiClient.get<PageResponse<AdminMemberListItem>>('/admin/members', {
    params: {...params, page: params?.page ?? 0, size: params?.size ?? 20},
  })
  return data
}

/**
 * 관리자 회원 상세 조회
 * GET /api/admin/members/{id}
 */
export async function getAdminMember(memberId: number): Promise<AdminMemberDetail> {
  const {data} = await apiClient.get<AdminMemberDetail>(`/admin/members/${memberId}`)
  return data
}

/**
 * 관리자 회원 제재 처리 (경고/정지/탈퇴)
 * PATCH /api/admin/members/{id}/action
 */
export async function processAdminMember(
  memberId: number,
  request: AdminMemberActionRequest,
): Promise<AdminMemberDetail> {
  const {data} = await apiClient.patch<AdminMemberDetail>(
    `/admin/members/${memberId}/action`,
    request,
  )
  return data
}

// ── 게시글 관리 API ────────────────────────────────────────────────────────────

/**
 * 관리자 게시글 목록 조회
 * GET /api/admin/posts?keyword=&status=&page=&size=
 */
export async function getAdminPosts(params?: {
  sport?: Sport
  keyword?: string
  status?: PostStatus
  page?: number
  size?: number
}): Promise<PageResponse<AdminPostListItem>> {
  const {data} = await apiClient.get<PageResponse<AdminPostListItem>>('/admin/posts', {
    params: {...params, page: params?.page ?? 0, size: params?.size ?? 20},
  })
  return data
}

/**
 * 관리자 게시글 상세 조회
 * GET /api/admin/posts/{id}
 */
export async function getAdminPost(postId: number): Promise<AdminPostDetail> {
  const {data} = await apiClient.get<AdminPostDetail>(`/admin/posts/${postId}`)
  return data
}

/**
 * 관리자 게시글 조치 (숨김/삭제)
 * PATCH /api/admin/posts/{id}/action
 */
export async function processAdminPost(
  postId: number,
  request: AdminPostActionRequest,
): Promise<AdminPostDetail> {
  const {data} = await apiClient.patch<AdminPostDetail>(
    `/admin/posts/${postId}/action`,
    request,
  )
  return data
}

// ── 신고 관리 API ──────────────────────────────────────────────────────────────

/**
 * 관리자 신고 목록 조회
 * GET /api/admin/reports?status=&page=&size=
 */
export async function getAdminReports(params?: {
  status?: ReportStatus
  page?: number
  size?: number
}): Promise<PageResponse<ReportItem>> {
  const {data} = await apiClient.get<PageResponse<ReportItem>>('/admin/reports', {
    params: {...params, page: params?.page ?? 0, size: params?.size ?? 20},
  })
  return data
}

/**
 * 관리자 신고 처리
 * PATCH /api/admin/reports/{id}
 */
export async function processAdminReport(
  reportId: number,
  request: AdminReportActionRequest,
): Promise<ReportItem> {
  const {data} = await apiClient.patch<ReportItem>(`/admin/reports/${reportId}`, request)
  return data
}

// ── 출금 관리 API ──────────────────────────────────────────────────────────────

/**
 * 전체 출금 요청 목록 조회 (raw DTO, ApiResponse 래퍼 없음)
 * GET /api/admin/withdraw-requests
 */
export async function getAdminWithdrawList(): Promise<AdminWithdrawItem[]> {
  const {data} = await apiClient.get<AdminWithdrawItem[]>('/admin/withdraw-requests')
  return data
}

/**
 * 출금 승인 또는 반려 (raw DTO, ApiResponse 래퍼 없음)
 * PATCH /api/admin/withdraw-requests/{withdrawId}
 */
export async function processWithdraw(
  withdrawId: number,
  request: AdminWithdrawActionRequest,
): Promise<AdminWithdrawItem> {
  const {data} = await apiClient.patch<AdminWithdrawItem>(
    `/admin/withdraw-requests/${withdrawId}`,
    request,
  )
  return data
}
