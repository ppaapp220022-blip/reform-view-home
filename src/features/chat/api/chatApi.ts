/**
 * chatApi.ts — 채팅 REST API 함수
 *
 * 백엔드 REST endpoints (채팅방 생성/조회):
 *   POST /api/chats          — 채팅방 생성
 *   GET  /api/chats          — 내 채팅방 목록 조회
 *   GET  /api/chats/{chatId} — 채팅방 상세 조회
 *
 * 실시간 메시지 송수신은 STOMP WebSocket으로 처리 (useStompChat 훅 참고)
 */
import axiosInstance from '../../../lib/axios'

// ── 타입 ─────────────────────────────────────────────────────────────────────

/** 거래 상태 (백엔드 TradeStatus enum 일치) */
export type TradeStatus =
  | 'REQUESTED' | 'ACCEPTED' | 'PAID' | 'IN_PROGRESS'
  | 'RECEIVED'  | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'DISPUTED'

/** 메시지 타입 */
export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM'

/** 회원 요약 정보 (MemberBriefDTO) */
export interface MemberBrief {
  memberId: number
  nickname: string
  profileImageUrl?: string
}

/** 판매글 요약 정보 (PostBriefDTO) */
export interface PostBrief {
  postId: number
  title: string
  price: number
  thumbnailUrl?: string
}

/** 채팅방 목록 아이템 (ChatRoomSummaryDTO) */
export interface ChatRoomSummary {
  chatId: number
  partner: MemberBrief       // 상대방 (내가 구매자면 seller, 판매자면 buyer)
  lastMessage: string        // 마지막 메시지 미리보기
  lastMessageAt: string      // ISO 8601
  unreadCount: number
  post: PostBrief            // 연결된 판매글 요약
}

/** 채팅방 상세 정보 (ChatRoomDetailDTO) */
export interface ChatRoomDetail {
  chatId: number
  buyer: MemberBrief
  seller: MemberBrief
  post: PostBrief
  tradeId: number | null     // 거래 연결된 경우 (null 가능)
  tradeStatus: TradeStatus | null
}

/** 채팅 메시지 (ChatMessageDTO) */
export interface ChatMessage {
  messageId: number
  senderId: number
  content: string
  type: MessageType
  sentAt: string             // ISO 8601
  isRead: boolean
}

/** 채팅방 생성 요청 */
export interface ChatRoomCreateRequest {
  postId: number             // 연결할 판매글 ID
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 채팅방 생성 — 판매글에서 "채팅하기" 클릭 시 호출
 */
export async function createChatRoom(request: ChatRoomCreateRequest): Promise<ChatRoomDetail> {
  const { data } = await axiosInstance.post<ChatRoomDetail>('/chats', request)
  return data
}

/**
 * 내 채팅방 목록 조회
 */
export async function getChatRooms(): Promise<ChatRoomSummary[]> {
  const { data } = await axiosInstance.get<ChatRoomSummary[]>('/chats')
  return data
}

/**
 * 채팅방 상세 조회
 */
export async function getChatRoomDetail(chatId: number): Promise<ChatRoomDetail> {
  const { data } = await axiosInstance.get<ChatRoomDetail>(`/chats/${chatId}`)
  return data
}

/**
 * 채팅 메시지 이력 조회 (페이징)
 * GET /api/chats/{chatId}/message
 */
export async function getMessages(chatId: number, page = 0, size = 30): Promise<{
  content: ChatMessage[]
  totalElements: number
  totalPages: number
  last: boolean
}> {
  const { data } = await axiosInstance.get(`/chats/${chatId}/message`, {
    params: { page, size, sort: 'sentAt,desc' },
  })
  return data
}
