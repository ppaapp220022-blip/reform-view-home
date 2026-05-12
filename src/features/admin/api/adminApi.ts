/**
 * adminApi.ts — 관리자 전용 API 함수 모음
 *
 * 백엔드 AdminController (/api/admin) 엔드포인트 연동
 *
 * GET   /api/admin/withdraw-requests              — 전체 출금 요청 목록 (PENDING)
 * PATCH /api/admin/withdraw-requests/{withdrawId} — 출금 승인(APPROVE) / 반려(REJECT)
 *
 * 응답: 직접 DTO 반환 (ApiResponse 래퍼 없음)
 */
import apiClient from '../../../lib/axios'

// ── 타입 ─────────────────────────────────────────────────────────────────────

/** 출금 처리 상태 (PointRequestStatus enum 일치) */
export type WithdrawStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** 출금 처리 액션 */
export type WithdrawAction = 'APPROVE' | 'REJECT'

/**
 * 출금 요청 항목 (WithdrawResponseDTO)
 */
export interface AdminWithdrawItem {
  withdrawId: number
  requestAmount: number
  bankName: string
  accountNumber: string
  status: WithdrawStatus
  createdAt: string       // ISO 8601
}

/**
 * 출금 처리 요청 (AdminWithdrawActionRequestDTO)
 */
export interface AdminWithdrawActionRequest {
  action: WithdrawAction
  rejectReason?: string   // 반려 시 사유 (최대 300자)
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 전체 출금 요청 목록 조회 (PENDING 상태)
 * GET /api/admin/withdraw-requests
 */
export async function getAdminWithdrawList(): Promise<AdminWithdrawItem[]> {
  const { data } = await apiClient.get<AdminWithdrawItem[]>('/admin/withdraw-requests')
  return data
}

/**
 * 출금 승인 또는 반려
 * PATCH /api/admin/withdraw-requests/{withdrawId}
 * @param withdrawId 처리할 출금 요청 ID
 * @param request    action: 'APPROVE' | 'REJECT', rejectReason: 반려 사유
 */
export async function processWithdraw(
  withdrawId: number,
  request: AdminWithdrawActionRequest,
): Promise<AdminWithdrawItem> {
  const { data } = await apiClient.patch<AdminWithdrawItem>(
    `/admin/withdraw-requests/${withdrawId}`,
    request,
  )
  return data
}
