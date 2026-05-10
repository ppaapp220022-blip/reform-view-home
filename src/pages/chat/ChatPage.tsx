/**
 * ChatPage — 채팅 (Screen 5)
 *
 * 구성:
 *   ChatList    — 채팅방 목록 (좌 패널, md 이상)
 *   ChatRoom    — 채팅 본문 (우 패널)
 *     TradeBar      — 상단 거래 상태바 (상품 정보 + 거래 진행 버튼)
 *     MessageBubble — 내 메시지 / 상대방 메시지
 *     SafetyBanner  — 에스크로 안내 배너
 *     InputBar      — 메시지 입력 + 전송
 *
 * 실시간 메시지: useStompChat 훅 (STOMP WebSocket)
 * 채팅방 목록/상세: 목 데이터 (추후 useQuery로 교체)
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, ChevronLeft, Shield, Wifi, WifiOff,
  MoreHorizontal, Image as ImageIcon,
} from 'lucide-react'
import { formatPrice } from '../../utils/format'
import { useStompChat } from '../../features/chat/hooks/useStompChat'
import type { TradeStatus } from '../../types/listing'
import type { ChatMessage } from '../../features/chat/api/chatApi'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

interface MockRoom {
  id: number
  opponentId: number
  opponentNickname: string
  opponentAvatarColor: string
  postId: number
  postTitle: string
  postPrice: number
  jerseyColor: string
  jerseyNumber: string
  tradeStatus: TradeStatus
  lastMessage: string
  lastAt: string
  unread: number
  /** 채팅방 진입 시 보여줄 이전 메시지 목록 */
  history: ChatMessage[]
}

const MY_ID = 1 // 임시 — 추후 authStore에서 가져오기

const MOCK_ROOMS: MockRoom[] = [
  {
    id: 1,
    opponentId: 42, opponentNickname: 'uniform_king', opponentAvatarColor: '#1A3051',
    postId: 1, postTitle: '맨유 23/24 홈 어센틱', postPrice: 78000,
    jerseyColor: '#B5222B', jerseyNumber: '7',
    tradeStatus: 'IN_PROGRESS', lastMessage: '내일 오전에 택배 보낼게요!', lastAt: '오전 11:22', unread: 0,
    history: [
      { messageId:1,  senderId:42, content:'안녕하세요! 상품 아직 판매 중인가요?',         type:'TEXT', sentAt:'2026-05-10T10:05:00', isRead:true },
      { messageId:2,  senderId:MY_ID, content:'네, 판매 중입니다 :)',                      type:'TEXT', sentAt:'2026-05-10T10:06:00', isRead:true },
      { messageId:3,  senderId:42, content:'사이즈 L 있나요?',                            type:'TEXT', sentAt:'2026-05-10T10:07:00', isRead:true },
      { messageId:4,  senderId:MY_ID, content:'M만 있어요! 실측은 어깨 46 가슴 52 정도입니다', type:'TEXT', sentAt:'2026-05-10T10:10:00', isRead:true },
      { messageId:5,  senderId:42, content:'감사합니다. 구매하겠습니다!',                  type:'TEXT', sentAt:'2026-05-10T10:12:00', isRead:true },
      { messageId:6,  senderId:MY_ID, content:'내일 오전에 택배 보낼게요!',                type:'TEXT', sentAt:'2026-05-10T11:22:00', isRead:true },
    ],
  },
  {
    id: 2,
    opponentId: 77, opponentNickname: 'lck_collector', opponentAvatarColor: '#343F5B',
    postId: 2, postTitle: 'T1 2024 월즈 유니폼', postPrice: 120000,
    jerseyColor: '#C8102E', jerseyNumber: '10',
    tradeStatus: 'REQUESTED', lastMessage: '가격 조정 가능할까요?', lastAt: '어제', unread: 2,
    history: [
      { messageId:10, senderId:77, content:'T1 유니폼 구매하고 싶습니다!',                type:'TEXT', sentAt:'2026-05-09T15:00:00', isRead:true },
      { messageId:11, senderId:77, content:'가격 조정 가능할까요?',                        type:'TEXT', sentAt:'2026-05-09T15:02:00', isRead:false },
    ],
  },
]

// ── 거래 상태 레이블 ────────────────────────────────────────────────────────────
const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  REQUESTED:  '거래 요청됨',
  ACCEPTED:   '거래 수락됨',
  PAID:       '결제 완료',
  IN_PROGRESS:'배송 중',
  RECEIVED:   '배송 완료',
  CONFIRMED:  '구매 확정',
  COMPLETED:  '거래 완료',
  CANCELED:   '거래 취소',
  DISPUTED:   '분쟁 처리 중',
}

// ── 서브 컴포넌트: 채팅방 목록 아이템 ─────────────────────────────────────────
function RoomItem({
  room,
  active,
  onClick,
}: {
  room: MockRoom
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
      style={{
        background: active ? 'var(--color-surface-raised)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      {/* 아바타 */}
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
        style={{ background: room.opponentAvatarColor }}
      >
        {room.opponentNickname[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-main)' }}>
            {room.opponentNickname}
          </span>
          <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--color-text-hint)' }}>
            {room.lastAt}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>
            {room.lastMessage}
          </p>
          {room.unread > 0 && (
            <span
              className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: 'var(--color-accent)' }}
            >
              {room.unread}
            </span>
          )}
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-hint)' }}>
          {room.postTitle}
        </p>
      </div>
    </button>
  )
}

// ── 서브 컴포넌트: 메시지 버블 ────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  const time = new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  // 낙관적 메시지(messageId < 0)는 전송 중 표시
  const isPending = msg.messageId < 0

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex items-end gap-1.5 max-w-[72%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className="px-3 py-2 rounded-2xl text-sm leading-relaxed"
          style={
            isMine
              ? { background: 'var(--color-primary)', color: '#fff', borderBottomRightRadius: 4 }
              : { background: 'var(--color-surface-raised)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderBottomLeftRadius: 4 }
          }
        >
          {msg.content}
        </div>
        <span className="text-[10px] flex-shrink-0 pb-0.5" style={{ color: 'var(--color-text-hint)' }}>
          {isPending ? '전송 중' : time}
        </span>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 채팅 본문 ──────────────────────────────────────────────────
function ChatRoomPanel({
  room,
  onBack,
}: {
  room: MockRoom
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // STOMP WebSocket 연결
  const { messages, sendMessage, connected, error } = useStompChat({
    chatId: room.id,
    myMemberId: MY_ID,
    initialMessages: room.history,
  })

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) return
    sendMessage(trimmed, 'TEXT')
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* 헤더: 상대방 정보 + 상품 정보 */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg"
          style={{ color: 'var(--color-text-sub)' }}
        >
          <ChevronLeft size={20} />
        </button>

        <div
          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ background: room.opponentAvatarColor }}
        >
          {room.opponentNickname[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-main)' }}>
            {room.opponentNickname}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>
            {room.postTitle} · {formatPrice(room.postPrice)}
          </p>
        </div>

        {/* WebSocket 연결 상태 표시 */}
        <div className="flex items-center gap-1">
          {connected
            ? <Wifi size={14} style={{ color: 'var(--color-success)' }} />
            : <WifiOff size={14} style={{ color: 'var(--color-text-hint)' }} />}
        </div>

        <button style={{ color: 'var(--color-text-hint)' }}>
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 거래 상태바 */}
      <div
        className="px-4 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          {/* 유니폼 미니 썸네일 */}
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 relative overflow-hidden"
            style={{ background: room.jerseyColor }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center text-xs"
              style={{ color: 'rgba(255,255,255,.35)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
            >
              {room.jerseyNumber}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-main)' }}>
              {TRADE_STATUS_LABEL[room.tradeStatus]}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-hint)' }}>
              {formatPrice(room.postPrice)}
            </p>
          </div>
        </div>

        {/* 거래 액션 버튼 (상태에 따라 다름) */}
        {room.tradeStatus === 'ACCEPTED' && (
          <Link
            to={`/payment/${room.postId}`}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            결제하기
          </Link>
        )}
        {room.tradeStatus === 'RECEIVED' && (
          <Link
            to={`/trade/${room.id}/confirm`}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:text-white"
            style={{ background: 'var(--color-success)' }}
          >
            구매 확정
          </Link>
        )}
      </div>

      {/* 에스크로 안내 배너 */}
      {(room.tradeStatus === 'PAID' || room.tradeStatus === 'IN_PROGRESS') && (
        <div
          className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(0,179,110,.08)', borderBottom: '1px solid rgba(0,179,110,.15)' }}
        >
          <Shield size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--color-success)' }}>
            에스크로 보호 중 — 구매 확정 전까지 결제금은 RE:FORM이 보관합니다.
          </p>
        </div>
      )}

      {/* WebSocket 에러 배너 */}
      {error && (
        <div
          className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(255,46,77,.08)', borderBottom: '1px solid rgba(255,46,77,.15)' }}
        >
          <WifiOff size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>{error}</p>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map(msg => (
          <MessageBubble key={msg.messageId} msg={msg} isMine={msg.senderId === MY_ID} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 바 */}
      <div
        className="px-4 py-3 flex items-end gap-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button className="p-2 flex-shrink-0" style={{ color: 'var(--color-text-hint)' }}>
          <ImageIcon size={20} />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? '메시지를 입력하세요... (Enter로 전송)' : '연결 중...'}
          disabled={!connected}
          rows={1}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none leading-relaxed disabled:opacity-50"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
            maxHeight: 120,
          }}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          className="p-2.5 rounded-xl flex-shrink-0 transition-colors disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [rooms] = useState<MockRoom[]>(MOCK_ROOMS)
  const [activeRoomId, setActiveRoomId] = useState<number | null>(rooms[0]?.id ?? null)

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null

  return (
    <div
      className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* 좌: 채팅방 목록 (md 이상 항상 표시 / 모바일: 방 선택 전 표시) */}
      <div
        className={`${activeRoomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[320px] flex-shrink-0`}
        style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        {/* 목록 헤더 */}
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
          >
            MESSAGES
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-hint)' }}>
            {rooms.length}개 채팅방
          </p>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {rooms.map(room => (
            <RoomItem
              key={room.id}
              room={room}
              active={room.id === activeRoomId}
              onClick={() => setActiveRoomId(room.id)}
            />
          ))}
        </div>
      </div>

      {/* 우: 채팅 본문 */}
      <div className={`${activeRoomId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {activeRoom ? (
          <ChatRoomPanel
            key={activeRoom.id}
            room={activeRoom}
            onBack={() => setActiveRoomId(null)}
          />
        ) : (
          // 채팅방 미선택 상태 (데스크탑 초기 화면)
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface-raised)' }}
            >
              <Send size={28} style={{ color: 'var(--color-text-hint)' }} />
            </div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}>
                채팅방을 선택해주세요
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                왼쪽 목록에서 대화할 채팅방을 선택하세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
