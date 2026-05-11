/**
 * ChatPage — 채팅 (Screen 5)
 *
 * 레이아웃:
 *   모바일  : 목록 전체화면 → 방 선택 시 본문 전체화면 (슬라이드)
 *   데스크톱: 좌 사이드바(360px) + 우 본문 패널 — max-w-[1200px] 카드 컨테이너
 *
 * 구성:
 *   SidebarPanel   — 채팅방 목록 + 검색 필터
 *   ChatRoomPanel  — 헤더 / 거래상태바 / 메시지목록 / 입력바
 *   MessageBubble  — 내 메시지 / 상대방 메시지
 *
 * 실시간 메시지: useStompChat 훅 (STOMP WebSocket)
 */
import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Send, ChevronLeft, Shield, Wifi, WifiOff,
  MoreHorizontal, Image as ImageIcon, Search,
  ShoppingBag,
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
  history: ChatMessage[]
}

const MY_ID = 1

const MOCK_ROOMS: MockRoom[] = [
  {
    id: 1,
    opponentId: 42, opponentNickname: 'uniform_king', opponentAvatarColor: '#1A3051',
    postId: 1, postTitle: '맨유 23/24 홈 어센틱', postPrice: 78000,
    jerseyColor: '#B5222B', jerseyNumber: '7',
    tradeStatus: 'IN_PROGRESS', lastMessage: '내일 오전에 택배 보낼게요!', lastAt: '오전 11:22', unread: 0,
    history: [
      { messageId:1,  senderId:42,    content:'안녕하세요! 상품 아직 판매 중인가요?',              type:'TEXT', sentAt:'2026-05-10T10:05:00', isRead:true },
      { messageId:2,  senderId:MY_ID, content:'네, 판매 중입니다 :)',                             type:'TEXT', sentAt:'2026-05-10T10:06:00', isRead:true },
      { messageId:3,  senderId:42,    content:'사이즈 L 있나요?',                                type:'TEXT', sentAt:'2026-05-10T10:07:00', isRead:true },
      { messageId:4,  senderId:MY_ID, content:'M만 있어요! 실측은 어깨 46 가슴 52 정도입니다',    type:'TEXT', sentAt:'2026-05-10T10:10:00', isRead:true },
      { messageId:5,  senderId:42,    content:'감사합니다. 구매하겠습니다!',                       type:'TEXT', sentAt:'2026-05-10T10:12:00', isRead:true },
      { messageId:6,  senderId:MY_ID, content:'내일 오전에 택배 보낼게요!',                       type:'TEXT', sentAt:'2026-05-10T11:22:00', isRead:true },
    ],
  },
  {
    id: 2,
    opponentId: 77, opponentNickname: 'lck_collector', opponentAvatarColor: '#343F5B',
    postId: 2, postTitle: 'T1 2024 월즈 유니폼', postPrice: 120000,
    jerseyColor: '#C8102E', jerseyNumber: '10',
    tradeStatus: 'REQUESTED', lastMessage: '가격 조정 가능할까요?', lastAt: '어제', unread: 2,
    history: [
      { messageId:10, senderId:77,    content:'T1 유니폼 구매하고 싶습니다!',    type:'TEXT', sentAt:'2026-05-09T15:00:00', isRead:true },
      { messageId:11, senderId:77,    content:'가격 조정 가능할까요?',           type:'TEXT', sentAt:'2026-05-09T15:02:00', isRead:false },
    ],
  },
  {
    id: 3,
    opponentId: 55, opponentNickname: 'kbo_fan99', opponentAvatarColor: '#FF6B35',
    postId: 3, postTitle: 'KIA 타이거즈 25시즌 홈', postPrice: 54000,
    jerseyColor: '#E4002B', jerseyNumber: '53',
    tradeStatus: 'CONFIRMED', lastMessage: '잘 받았습니다. 감사해요!', lastAt: '3일 전', unread: 0,
    history: [
      { messageId:20, senderId:55,    content:'유니폼 잘 받았습니다!',           type:'TEXT', sentAt:'2026-05-08T09:00:00', isRead:true },
      { messageId:21, senderId:MY_ID, content:'감사합니다. 좋은 거래였어요 :)',  type:'TEXT', sentAt:'2026-05-08T09:05:00', isRead:true },
      { messageId:22, senderId:55,    content:'잘 받았습니다. 감사해요!',        type:'TEXT', sentAt:'2026-05-08T09:10:00', isRead:true },
    ],
  },
]

// ── 거래 상태 레이블 / 색상 ─────────────────────────────────────────────────────
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

const TRADE_STATUS_COLOR: Partial<Record<TradeStatus, string>> = {
  REQUESTED:  'var(--color-info)',
  ACCEPTED:   'var(--color-success)',
  PAID:       'var(--color-success)',
  IN_PROGRESS:'var(--color-warning)',
  RECEIVED:   'var(--color-warning)',
  CONFIRMED:  'var(--color-success)',
  COMPLETED:  'var(--color-text-hint)',
  CANCELED:   'var(--color-text-hint)',
  DISPUTED:   'var(--color-accent)',
}

// ── 서브 컴포넌트: 채팅방 목록 아이템 ─────────────────────────────────────────
function RoomItem({ room, active, onClick }: { room: MockRoom; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
      style={{
        background: active ? 'var(--color-surface-raised)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      {/* 아바타 */}
      <div
        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
        style={{ background: room.opponentAvatarColor, fontSize: '1rem' }}
      >
        {room.opponentNickname[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* 닉네임 + 시간 */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-main)' }}>
            {room.opponentNickname}
          </span>
          <span className="text-xs flex-shrink-0 ml-2" style={{ color: 'var(--color-text-hint)' }}>
            {room.lastAt}
          </span>
        </div>
        {/* 마지막 메시지 + 읽지 않음 뱃지 */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>
            {room.lastMessage}
          </p>
          {room.unread > 0 && (
            <span
              className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center"
              style={{ background: 'var(--color-accent)' }}
            >
              {room.unread}
            </span>
          )}
        </div>
        {/* 상품명 + 거래 상태 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <ShoppingBag size={10} style={{ color: 'var(--color-text-hint)', flexShrink: 0 }} />
          <p className="text-[11px] truncate" style={{ color: 'var(--color-text-hint)' }}>
            {room.postTitle}
          </p>
          <span
            className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: TRADE_STATUS_COLOR[room.tradeStatus] ?? 'var(--color-text-hint)',
              background: `${TRADE_STATUS_COLOR[room.tradeStatus] ?? 'var(--color-text-hint)'}1A`,
            }}
          >
            {TRADE_STATUS_LABEL[room.tradeStatus]}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── 서브 컴포넌트: 채팅방 사이드바 ───────────────────────────────────────────
function SidebarPanel({
  rooms,
  activeRoomId,
  onSelect,
}: {
  rooms: MockRoom[]
  activeRoomId: number | null
  onSelect: (id: number) => void
}) {
  const [searchVal, setSearchVal] = useState('')

  // 검색어로 상대 닉네임 / 상품명 필터링
  const filtered = useMemo(() => {
    if (!searchVal.trim()) return rooms
    const q = searchVal.trim().toLowerCase()
    return rooms.filter(
      r =>
        r.opponentNickname.toLowerCase().includes(q) ||
        r.postTitle.toLowerCase().includes(q),
    )
  }, [rooms, searchVal])

  const totalUnread = rooms.reduce((acc, r) => acc + r.unread, 0)

  return (
    <div
      className="flex flex-col h-full"
      style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* 사이드바 헤더 */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="font-bold tracking-widest"
            style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: '1.05rem' }}
          >
            MESSAGES
          </h2>
          {totalUnread > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              {totalUnread}
            </span>
          )}
        </div>

        {/* 채팅 검색 인풋 */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)' }}
        >
          <Search size={14} style={{ color: 'var(--color-text-hint)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="닉네임 · 상품명 검색"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-main)' }}
          />
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <Search size={24} style={{ color: 'var(--color-text-hint)' }} />
            <p className="text-sm text-center" style={{ color: 'var(--color-text-hint)' }}>
              일치하는 채팅방이 없습니다
            </p>
          </div>
        ) : (
          filtered.map(room => (
            <RoomItem
              key={room.id}
              room={room}
              active={room.id === activeRoomId}
              onClick={() => onSelect(room.id)}
            />
          ))
        )}
      </div>

      {/* 사이드바 하단 — 채팅방 수 표시 */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
          {rooms.length}개 채팅방
        </p>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 메시지 버블 ────────────────────────────────────────────────
function MessageBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  const time = new Date(msg.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const isPending = msg.messageId < 0

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`flex items-end gap-1.5 max-w-[68%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={
            isMine
              ? { background: 'var(--color-primary)', color: '#fff', borderBottomRightRadius: 4 }
              : { background: 'var(--color-surface-raised)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', borderBottomLeftRadius: 4 }
          }
        >
          {msg.content}
        </div>
        <span className="text-[11px] flex-shrink-0 pb-0.5" style={{ color: 'var(--color-text-hint)' }}>
          {isPending ? '전송 중' : time}
        </span>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 채팅 본문 패널 ─────────────────────────────────────────────
function ChatRoomPanel({ room, onBack }: { room: MockRoom; onBack: () => void }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

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
    <div className="flex flex-col h-full min-h-0">

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        {/* 모바일: 뒤로가기 버튼 */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg -ml-1 transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-text-sub)' }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* 아바타 */}
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
          style={{ background: room.opponentAvatarColor }}
        >
          {room.opponentNickname[0].toUpperCase()}
        </div>

        {/* 상대방 정보 */}
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-tight" style={{ color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
            {room.opponentNickname}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
            {room.postTitle}
          </p>
        </div>

        {/* 상품 가격 (데스크톱) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>거래 금액</p>
            <p
              className="font-bold"
              style={{ color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: '1rem' }}
            >
              {formatPrice(room.postPrice)}
            </p>
          </div>
          <div
            className="h-8 w-px flex-shrink-0"
            style={{ background: 'var(--color-border)' }}
          />
        </div>

        {/* WebSocket 연결 상태 */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--color-surface-sunken)' }}>
          {connected ? (
            <>
              <Wifi size={12} style={{ color: 'var(--color-success)' }} />
              <span className="hidden md:inline text-xs" style={{ color: 'var(--color-success)' }}>연결됨</span>
            </>
          ) : (
            <>
              <WifiOff size={12} style={{ color: 'var(--color-text-hint)' }} />
              <span className="hidden md:inline text-xs" style={{ color: 'var(--color-text-hint)' }}>연결 중</span>
            </>
          )}
        </div>

        <button
          className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-text-hint)' }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* ── 거래 상태바 ───────────────────────────────────────────────────── */}
      <div
        className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* 유니폼 색상 썸네일 */}
        <div
          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white"
          style={{ background: room.jerseyColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: '0.85rem', opacity: 0.9 }}
        >
          {room.jerseyNumber}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-main)' }}>
              {room.postTitle}
            </p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                color: TRADE_STATUS_COLOR[room.tradeStatus] ?? 'var(--color-text-sub)',
                background: `${TRADE_STATUS_COLOR[room.tradeStatus] ?? 'var(--color-text-sub)'}1A`,
              }}
            >
              {TRADE_STATUS_LABEL[room.tradeStatus]}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
            {formatPrice(room.postPrice)}
          </p>
        </div>

        {/* 거래 액션 버튼 */}
        {room.tradeStatus === 'ACCEPTED' && (
          <Link
            to={`/payment/${room.postId}`}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            결제하기
          </Link>
        )}
        {room.tradeStatus === 'RECEIVED' && (
          <Link
            to={`/trade/${room.id}/confirm`}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-success)' }}
          >
            구매 확정
          </Link>
        )}
      </div>

      {/* ── 시스템 배너 ───────────────────────────────────────────────────── */}
      {(room.tradeStatus === 'PAID' || room.tradeStatus === 'IN_PROGRESS') && (
        <div
          className="px-5 py-2.5 flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(0,179,110,.07)', borderBottom: '1px solid rgba(0,179,110,.12)' }}
        >
          <Shield size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--color-success)' }}>
            에스크로 보호 중 — 구매 확정 전까지 결제금은 RE:FORM이 안전하게 보관합니다.
          </p>
        </div>
      )}
      {error && (
        <div
          className="px-5 py-2.5 flex items-center gap-2 flex-shrink-0"
          style={{ background: 'rgba(255,46,77,.07)', borderBottom: '1px solid rgba(255,46,77,.12)' }}
        >
          <WifiOff size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>{error}</p>
        </div>
      )}

      {/* ── 메시지 목록 ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
        {messages.map(msg => (
          <MessageBubble key={msg.messageId} msg={msg} isMine={msg.senderId === MY_ID} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── 메시지 입력바 ─────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3.5 flex items-end gap-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <button
          className="p-2 rounded-xl flex-shrink-0 transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{ color: 'var(--color-text-hint)' }}
        >
          <ImageIcon size={20} />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? '메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)' : '연결 중...'}
          disabled={!connected}
          rows={1}
          className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none leading-relaxed disabled:opacity-50 transition-colors"
          style={{
            background: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
            maxHeight: 120,
          }}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          className="p-2.5 rounded-xl flex-shrink-0 transition-opacity disabled:opacity-30 hover:opacity-90"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ── 빈 선택 상태 (데스크톱 초기 화면) ─────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: 'var(--color-surface-raised)' }}
      >
        <Send size={32} style={{ color: 'var(--color-text-hint)' }} />
      </div>
      <div className="text-center">
        <h3
          className="font-bold mb-2"
          style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif", fontSize: '1.1rem' }}
        >
          채팅방을 선택해주세요
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)', maxWidth: 260 }}>
          왼쪽 목록에서 대화할 채팅방을 선택하면<br />메시지를 주고받을 수 있습니다.
        </p>
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
    /*
     * 모바일 : 100% 높이, 목록/본문 전환
     * 데스크톱: max-w 컨테이너 + 카드 형태, 좌우 패널 분할
     */
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--color-bg)' }}>

      {/* ── 데스크톱 레이아웃 래퍼 ─────────────────────────────────────── */}
      <div className="flex flex-1 w-full md:max-w-[1200px] md:mx-auto md:my-6 md:px-6 min-h-0">
        <div
          className="flex flex-1 w-full overflow-hidden md:rounded-2xl"
          style={{ border: '1px solid var(--color-border)', boxShadow: '0 4px 24px rgba(0,33,71,.08)' }}
        >

          {/* 좌: 채팅방 사이드바
              모바일: 방 선택 전에만 표시 (전체 너비)
              데스크톱: 360px 고정 너비로 항상 표시 */}
          <div
            className={`${
              activeRoomId ? 'hidden md:flex' : 'flex'
            } flex-col w-full md:w-[360px] flex-shrink-0 overflow-hidden`}
          >
            <SidebarPanel
              rooms={rooms}
              activeRoomId={activeRoomId}
              onSelect={setActiveRoomId}
            />
          </div>

          {/* 우: 채팅 본문 패널
              모바일: 방 선택 후에만 표시 (전체 너비)
              데스크톱: 남은 공간 모두 차지 */}
          <div
            className={`${activeRoomId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 overflow-hidden`}
            style={{ background: 'var(--color-surface)' }}
          >
            {activeRoom ? (
              <ChatRoomPanel
                key={activeRoom.id}
                room={activeRoom}
                onBack={() => setActiveRoomId(null)}
              />
            ) : (
              <EmptyState />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
