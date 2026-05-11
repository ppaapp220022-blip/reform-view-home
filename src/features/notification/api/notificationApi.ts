/**
 * notificationApi.ts — 알림 관련 API 함수 모음
 *
 * 백엔드 NotificationController (/api/notifications) 엔드포인트 연동
 *
 * GET   /api/notifications           — 알림 목록 + 미읽음 수 조회
 * PATCH /api/notifications/{id}/read — 단건 읽음 처리
 * PATCH /api/notifications/read-all  — 전체 읽음 처리
 *
 * 응답은 모두 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 * 모든 엔드포인트에 X-Member-Id 헤더 필요 (axios 인터셉터에서 자동 주입)
 */
import apiClient from '../../../lib/axios'
import type { PageResponse } from '../../../types/api'

// ── 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────────

/**
 * 알림 타입 (NotificationType enum 일치)
 * TRADE      — 거래 관련 알림 (거래 수락, 상태 변경 등)
 * CHAT       — 채팅 메시지 도착
 * PRICE_DROP — 찜한 상품 가격 인하
 * REVIEW     — 매너 후기 도착
 * SYSTEM     — 시스템 공지
 */
export type NotificationType = 'TRADE' | 'CHAT' | 'PRICE_DROP' | 'REVIEW' | 'SYSTEM'

/**
 * 알림 단건 (NotificationDTO)
 */
export interface NotificationItem {
  notiId: number
  type: NotificationType
  content: string                // 알림 본문 텍스트
  linkUrl: string | null         // 클릭 시 이동 경로 (null이면 이동 없음)
  isRead: boolean
  createdAt: string              // ISO 8601
}

/**
 * 알림 목록 조회 응답 (NotificationPageResponse)
 * content    : 페이지네이션 목록
 * unreadCount: 전체 미읽음 알림 수 (GNB 뱃지 표시용)
 */
export interface NotificationPageResponse {
  content: PageResponse<NotificationItem>
  unreadCount: number
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 알림 목록 조회
 * GET /api/notifications
 * unreadCount는 GNB 알림 뱃지에, content는 드롭다운 목록에 사용
 */
export async function getNotifications(params?: {
  page?: number
  size?: number
}): Promise<NotificationPageResponse> {
  const { data } = await apiClient.get<NotificationPageResponse>('/notifications', { params })
  return data
}

/**
 * 단건 알림 읽음 처리
 * PATCH /api/notifications/{id}/read
 * @returns 처리된 알림 ID + 읽음 여부
 */
export async function readNotification(
  notiId: number,
): Promise<{ id: number; isRead: boolean }> {
  const { data } = await apiClient.patch<{ id: number; isRead: boolean }>(
    `/notifications/${notiId}/read`,
  )
  return data
}

/**
 * 전체 알림 읽음 처리
 * PATCH /api/notifications/read-all
 * @returns 업데이트된 알림 수
 */
export async function readAllNotifications(): Promise<{ updatedCount: number }> {
  const { data } = await apiClient.patch<{ updatedCount: number }>('/notifications/read-all')
  return data
}
