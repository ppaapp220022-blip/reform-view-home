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
 * GET   /api/admin/reports/{id}         — 신고 상세 조회
 * PATCH /api/admin/reports/{id}         — 신고 처리
 * GET   /api/admin/disputes             — 분쟁 목록 조회
 * GET   /api/admin/disputes/{id}        — 분쟁 상세 조회
 * PATCH /api/admin/disputes/{id}        — 분쟁 처리
 * GET   /api/admin/dashboard/summary    — 대시보드 집계 조회
 * GET   /api/admin/withdraw-requests    — 출금 요청 목록
 * PATCH /api/admin/withdraw-requests/{withdrawId} — 출금 승인/반려
 * GET   /api/admin/risk/posts           — 위험 게시글 목록 조회
 * GET   /api/admin/risk/chat            — 위험 채팅 목록 조회
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
export type MemberAction = 'WARN' | 'SUSPEND' | 'UNSUSPEND' | 'WITHDRAW'

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

/** 위험 탐지 등급 */
export type RiskLevel = 'LOW' | 'MID' | 'HIGH'

/** 위험 탐지 대상 */
export type RiskTargetType = 'POST' | 'CHAT'

/** 종목 enum */
export type Sport = 'SOCCER' | 'BASEBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'ESPORTS' | 'ETC'

/** 상태 등급 */
export type Grade = 'S' | 'A' | 'B' | 'C'

/** 거래 상태 */
export type TradeStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'DISPUTED'

/** 거래 수령 방식 */
export type TradeDeliveryType = 'DIRECT' | 'DELIVERY'

/** 관리자 페이지네이션은 0-based 상태를 쓰고, 백엔드는 1-based 페이지를 기대한다. */
function toAdminPageParam(page?: number): number | undefined {
  return page === undefined ? undefined : page + 1
}

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
  lastLoginAt: string | null
  receivedReports: ReportItem[]
  totalSales: number
  totalPurchases: number
  recentTrades: AdminMemberTradeRow[]
  /** 과거 프론트 호환용 선택 필드. 현재 백엔드 DTO에는 포함되지 않는다. */
  sports?: string[]
}

/** 관리자 회원 상세의 최근 거래 행 */
export interface AdminMemberTradeRow {
  tradeId: number
  postTitle: string
  role: 'SELLER' | 'BUYER'
  price: number
  status: TradeStatus
  completedAt: string | null
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

/** 관리자 신고 상세 (AdminReportDetailDTO) */
export interface AdminReportDetail {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  createdAt: string
  reporterMemberId: number | null
  reporterNickname: string | null
  reporterEmail: string | null
  targetOwnerMemberId: number | null
  targetOwnerNickname: string | null
  targetOwnerEmail: string | null
  targetTitle: string | null
  targetSnapshot: string | null
  processedAt: string | null
  processedBy: string | null
  adminMemo: string | null
}

/** 신고 처리 요청 */
export interface AdminReportActionRequest {
  action: ReportStatus
  adminMemo?: string
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

// ── 위험 탐지 타입 ──────────────────────────────────────────────────────────────

/**
 * 관리자 위험 탐지 항목
 * - 게시글과 채팅 모두 동일 DTO를 사용한다.
 * - chat 대상의 targetId는 채팅방 ID가 아니라 messageId일 수 있으므로
 *   프론트에서 바로 채팅방 상세 링크를 만들 수 없다.
 */
export interface AdminRiskItem {
  riskId: number
  targetType: RiskTargetType
  targetId: number
  riskLevel: RiskLevel | null
  reason: string | null
  suggestion: string | null
  createdAt: string
}

// ── 분쟁 관리 타입 ─────────────────────────────────────────────────────────────

/** 분쟁 목록 행 */
export interface AdminDisputeListItem {
  tradeId: number
  postId: number
  postTitle: string
  price: number
  status: TradeStatus
  deliveryType: TradeDeliveryType
  createdAt: string
  buyerMemberId: number
  buyerNickname: string
  sellerMemberId: number
  sellerNickname: string
}

/** 분쟁 상세 */
export interface AdminDisputeDetail {
  tradeId: number
  postId: number
  postTitle: string
  price: number
  status: TradeStatus
  deliveryType: TradeDeliveryType
  deliveryAddress: string | null
  courierCode: string | null
  courierName: string | null
  trackingNumber: string | null
  createdAt: string
  shippingStartedAt: string | null
  confirmedAt: string | null
  completedAt: string | null
  disputedAt: string | null
  processedAt: string | null
  processedBy: string | null
  adminMemo: string | null
  resolutionType: string | null
  extendedUntil: string | null
  buyerMemberId: number
  buyerNickname: string
  buyerEmail: string
  buyerClaim: string | null
  sellerMemberId: number
  sellerNickname: string
  sellerEmail: string
  sellerClaim: string | null
}

/** 분쟁 처리 액션 */
export type AdminDisputeAction = 'CONFIRMED' | 'CANCELED'

/** 분쟁 처리 요청 */
export interface AdminDisputeActionRequest {
  action: AdminDisputeAction
  adminMemo?: string
}

// ── 대시보드 타입 ──────────────────────────────────────────────────────────────

/** 관리자 대시보드 최근 거래 요약 */
export interface AdminRecentTrade {
  tradeId: number
  postId: number
  postTitle: string
  price: number
  status: TradeStatus
  createdAt: string
  confirmedAt: string | null
  completedAt: string | null
  buyerMemberId: number
  buyerNickname: string
  sellerMemberId: number
  sellerNickname: string
}

/** 관리자 대시보드 요약 DTO */
export interface AdminDashboardSummary {
  memberCount: number
  pendingReportCount: number
  pendingWithdrawCount: number
  disputeCount: number
  todayTradeCount: number
  todayCompletedTradeCount: number
  todayCanceledTradeCount: number
  todayTradeVolume: number
  recentTrades: AdminRecentTrade[]
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
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 20},
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
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 20},
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
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 20},
  })
  return data
}

/**
 * 관리자 신고 상세 조회
 * GET /api/admin/reports/{id}
 */
export async function getAdminReport(reportId: number): Promise<AdminReportDetail> {
  const {data} = await apiClient.get<AdminReportDetail>(`/admin/reports/${reportId}`)
  return data
}

/**
 * 관리자 신고 처리
 * PATCH /api/admin/reports/{id}
 */
export async function processAdminReport(
  reportId: number,
  request: AdminReportActionRequest,
): Promise<AdminReportDetail> {
  const {data} = await apiClient.patch<AdminReportDetail>(`/admin/reports/${reportId}`, request)
  return data
}

// ── 분쟁 관리 API ──────────────────────────────────────────────────────────────

/**
 * 관리자 분쟁 목록 조회
 * GET /api/admin/disputes?status=&page=&size=
 */
export async function getAdminDisputes(params?: {
  status?: TradeStatus
  page?: number
  size?: number
}): Promise<PageResponse<AdminDisputeListItem>> {
  const {data} = await apiClient.get<PageResponse<AdminDisputeListItem>>('/admin/disputes', {
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 20},
  })
  return data
}

/**
 * 관리자 분쟁 상세 조회
 * GET /api/admin/disputes/{tradeId}
 */
export async function getAdminDispute(tradeId: number): Promise<AdminDisputeDetail> {
  const {data} = await apiClient.get<AdminDisputeDetail>(`/admin/disputes/${tradeId}`)
  return data
}

/**
 * 관리자 분쟁 처리
 * PATCH /api/admin/disputes/{tradeId}
 */
export async function processAdminDispute(
  tradeId: number,
  request: AdminDisputeActionRequest,
): Promise<AdminDisputeDetail> {
  const {data} = await apiClient.patch<AdminDisputeDetail>(`/admin/disputes/${tradeId}`, request)
  return data
}

// ── 대시보드 API ──────────────────────────────────────────────────────────────

/**
 * 관리자 대시보드 요약 조회
 * GET /api/admin/dashboard/summary
 */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const {data} = await apiClient.get<AdminDashboardSummary>('/admin/dashboard/summary')
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

// ── 위험 탐지 API ───────────────────────────────────────────────────────────────

/**
 * 위험 게시글 목록 조회
 * GET /api/admin/risk/posts?riskLevel=&page=&size=
 */
export async function getAdminPostRisks(params?: {
  riskLevel?: RiskLevel
  page?: number
  size?: number
}): Promise<PageResponse<AdminRiskItem>> {
  const {data} = await apiClient.get<PageResponse<AdminRiskItem>>('/admin/risk/posts', {
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 10},
  })
  return data
}

/**
 * 위험 채팅 목록 조회
 * GET /api/admin/risk/chat?riskLevel=&page=&size=
 */
export async function getAdminChatRisks(params?: {
  riskLevel?: RiskLevel
  page?: number
  size?: number
}): Promise<PageResponse<AdminRiskItem>> {
  const {data} = await apiClient.get<PageResponse<AdminRiskItem>>('/admin/risk/chat', {
    params: {...params, page: toAdminPageParam(params?.page), size: params?.size ?? 10},
  })
  return data
}
