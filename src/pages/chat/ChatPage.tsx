/**
 * ChatPage — 채팅 (Screen 5)
 *
 * 레이아웃:
 *   모바일  : 목록 전체화면 → 방 선택 시 본문 전체화면 (슬라이드)
 *   데스크톱: 좌 사이드바(360px) + 우 본문 패널 — max-w-[1200px] 카드 컨테이너
 *
 * 구성:
 *   SidebarPanel      — 채팅방 목록 (getChatRooms API)
 *   ChatRoomPanel     — 데이터 페치 래퍼 (getChatRoomDetail + getMessages)
 *   ChatRoomPanelInner— 헤더 / 거래상태바 / 메시지목록 / 입력바 (useStompChat 연동)
 *   MessageBubble     — 내 메시지 / 상대방 메시지
 *
 * 실시간 메시지: useStompChat 훅 (STOMP WebSocket)
 * 채팅방 목록: getChatRooms() REST API
 * 메시지 이력: getMessages(chatId) REST API (desc → 역정렬해 초기값 주입)
 */
import {useEffect, useMemo, useRef, useState} from 'react'
import {Link, useParams, useSearchParams} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Search,
  Send,
  Shield,
  ShoppingBag,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {formatPrice} from '../../utils/format'
import {getDisplayChatMessageContent, shouldMaskChatMessageContent} from '../../utils/chatModeration'
import {resolveImageUrl} from '../../utils/image'
import {useStompChat} from '../../features/chat/hooks/useStompChat'
import {useStompTradeRealtime} from '../../features/trade/hooks/useStompTradeRealtime'
import useAuthStore from '../../store/authStore'
import type {ChatMessage, ChatRoomDetail, ChatRoomSummary, TradeStatus,} from '../../features/chat/api/chatApi'
import {getChatRoomDetail, getChatRooms, getMessages,} from '../../features/chat/api/chatApi'
import {getTrade, type TradeResponse} from '../../features/trade/api/tradeApi'
import {getTradeStatusDisplayLabel} from '../../utils/tradeStatusDisplay'

// ── 아바타 색상 팔레트 — memberId 기반 결정론적 배정 ──────────────────────────
const AVATAR_COLORS = [
  '#1A3051', '#343F5B', '#FF6B35', '#2D6A4F', '#7B2D8B', '#E63946',
]

/**
 * memberId에서 결정론적으로 아바타 배경색 선택
 * 프로필 이미지가 없는 경우 이니셜 아바타에 사용
 */
function getAvatarColor(memberId: number): string {
  return AVATAR_COLORS[memberId % AVATAR_COLORS.length]
}

/**
 * ISO 날짜 → 채팅 목록용 상대 시간 포맷
 *   오늘 → "오전 10:23" 형식
 *   어제 → "어제"
 *   7일 이내 → "N일 전"
 *   그 이상 → "M월 D일"
 */
function formatChatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return date.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})
  }
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR', {month: 'short', day: 'numeric'})
}

// ── 거래 상태 레이블 / 색상 ─────────────────────────────────────────────────────
const TRADE_STATUS_COLOR: Partial<Record<TradeStatus, string>> = {
  REQUESTED: 'var(--color-info)',
  ACCEPTED: 'var(--color-success)',
  PAID: 'var(--color-success)',
  IN_PROGRESS: 'var(--color-warning)',
  RECEIVED: 'var(--color-warning)',
  CONFIRMED: 'var(--color-success)',
  COMPLETED: 'var(--color-text-hint)',
  CANCELED: 'var(--color-text-hint)',
  DISPUTED: 'var(--color-accent)',
}

// ── 서브 컴포넌트: 채팅방 목록 아이템 ─────────────────────────────────────────
/**
 * RoomItem — ChatRoomSummary 기반 채팅방 목록 아이템
 *   partner 정보, lastMessage, unreadCount, post.title 표시
 */
function RoomItem({
                    room,
                    active,
                    onClick,
                  }: {
  room: ChatRoomSummary
  active: boolean
  onClick: () => void
}) {
  const avatarColor = getAvatarColor(room.partner.memberId)
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
      style={{
        background: active ? 'var(--color-surface-raised)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
      }}
    >
      {/* 아바타 — 프로필 이미지 우선, 없으면 이니셜 (resolveImageUrl로 잘못된 URL 필터링) */}
      {resolveImageUrl(room.partner.profileImageUrl) ? (
        <img
          src={resolveImageUrl(room.partner.profileImageUrl)!}
          alt={room.partner.nickname}
          className="w-11 h-11 rounded-full flex-shrink-0 object-cover"
          onError={(e) => {
            // 이미지 로드 실패 시 숨기고 이니셜 폴백 표시
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div
          className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
          style={{background: avatarColor, fontSize: '1rem'}}
        >
          {room.partner.nickname[0].toUpperCase()}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {/* 닉네임 + 시간 */}
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-sm font-semibold truncate"
            style={{color: 'var(--color-text-main)'}}
          >
            {room.partner.nickname}
          </span>
          <span
            className="text-xs flex-shrink-0 ml-2"
            style={{color: 'var(--color-text-hint)'}}
          >
            {formatChatTime(room.lastMessageAt)}
          </span>
        </div>
        
        {/* 마지막 메시지 + 읽지 않음 뱃지 */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs truncate" style={{color: 'var(--color-text-sub)'}}>
            {room.lastMessage}
          </p>
          {room.unreadCount > 0 && (
            <span
              className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[13px] font-bold text-white flex items-center justify-center"
              style={{background: 'var(--color-accent)'}}
            >
              {room.unreadCount}
            </span>
          )}
        </div>
        
        {/* 연결된 상품명 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <ShoppingBag size={10} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
          <p className="text-[13px] truncate" style={{color: 'var(--color-text-hint)'}}>
            {room.post.title}
          </p>
        </div>
      </div>
    </button>
  )
}

// ── 서브 컴포넌트: 채팅방 사이드바 ───────────────────────────────────────────
/**
 * SidebarPanel — 채팅방 목록 + 검색 필터
 *   getChatRooms API 데이터를 rooms prop으로 수신
 */
function SidebarPanel({
                        rooms,
                        activeRoomId,
                        onSelect,
                        isLoading,
                      }: {
  rooms: ChatRoomSummary[]
  activeRoomId: number | null
  onSelect: (id: number) => void
  isLoading?: boolean
}) {
  const [searchVal, setSearchVal] = useState('')
  
  // 닉네임 / 상품명으로 실시간 필터링
  const filtered = useMemo(() => {
    if (!searchVal.trim()) return rooms
    const q = searchVal.trim().toLowerCase()
    return rooms.filter(
      r =>
        r.partner.nickname.toLowerCase().includes(q) ||
        r.post.title.toLowerCase().includes(q),
    )
  }, [rooms, searchVal])
  
  // 전체 미읽음 메시지 수
  const totalUnread = rooms.reduce((acc, r) => acc + r.unreadCount, 0)
  
  return (
    <div
      className="flex flex-col h-full"
      style={{borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)'}}
    >
      {/* 사이드바 헤더 */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="font-bold tracking-widest"
            style={{
              color: 'var(--color-text-main)',
              fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              fontSize: '1.05rem',
            }}
          >
            MESSAGES
          </h2>
          {totalUnread > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{background: 'var(--color-accent)'}}
            >
              {totalUnread}
            </span>
          )}
        </div>
        
        {/* 검색 입력 */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={14} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
          <input
            type="text"
            placeholder="닉네임 · 상품명 검색"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{color: 'var(--color-text-main)'}}
          />
        </div>
      </div>
      
      {/* 목록 영역 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // 로딩 스피너
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
          </div>
        ) : filtered.length === 0 ? (
          // 빈 상태 (검색 결과 없음 / 채팅방 없음)
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <Search size={24} style={{color: 'var(--color-text-hint)'}}/>
            <p className="text-sm text-center" style={{color: 'var(--color-text-hint)'}}>
              {searchVal.trim() ? '일치하는 채팅방이 없습니다' : '채팅방이 없습니다'}
            </p>
          </div>
        ) : (
          filtered.map(room => (
            <RoomItem
              key={room.chatId}
              room={room}
              active={room.chatId === activeRoomId}
              onClick={() => onSelect(room.chatId)}
            />
          ))
        )}
      </div>
      
      {/* 하단 채팅방 수 */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{borderTop: '1px solid var(--color-border)'}}
      >
        <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
          {rooms.length}개 채팅방
        </p>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 메시지 버블 ────────────────────────────────────────────────
/**
 * MessageBubble — 단일 채팅 메시지 말풍선
 *   isMine=true → 오른쪽 정렬 / primary 배경
 *   isMine=false → 왼쪽 정렬 / gold(#FFB800) 솔리드 배경
 */
function MessageBubble({msg, isMine}: { msg: ChatMessage; isMine: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  // messageId < 0 → 낙관적(전송 중) 메시지
  const isPending = msg.messageId < 0
  const displayContent = getDisplayChatMessageContent(msg)
  const isMaskedHighRisk = shouldMaskChatMessageContent(msg)
  
  /**
   * moderation 경고 배너 렌더링
   * — MID: 주의(노란색), HIGH: 위험(빨간색)
   * — 낙관적 메시지(전송 중)는 moderation 없으므로 자동으로 미노출
   */
  const mod = msg.moderation
  const modBanner = mod && mod.riskLevel !== 'LOW' ? (
    (() => {
      const isHigh = mod.riskLevel === 'HIGH'
      const bgColor = isHigh ? 'rgba(255,46,77,.08)' : 'rgba(255,149,0,.08)'
      const textColor = isHigh ? 'var(--color-accent)' : 'var(--color-warning)'
      return (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl mt-1.5 text-xs leading-relaxed"
          style={{background: bgColor, border: `1px solid ${textColor}33`}}
        >
          <AlertTriangle size={12} style={{color: textColor, flexShrink: 0, marginTop: 1}}/>
          <div style={{color: textColor}}>
            <span className="font-bold mr-1">{isHigh ? '[위험]' : '[주의]'}</span>
            {isHigh && isMaskedHighRisk
              ? '유해성이 높은 내용이 감지되어 메시지 본문을 마스킹했습니다.'
              : (mod.suggestion ?? mod.reason ?? '주의가 필요한 내용이 감지되었습니다.')}
          </div>
        </div>
      )
    })()
  ) : null
  
  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-2`}>
      <div
        className={`flex items-end gap-1.5 max-w-[68%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={
            isMine
              ? {
                background: 'var(--color-primary)',
                color: '#fff',
                borderBottomRightRadius: 4,
              }
              : {
                /* MVP VERIFIED 뱃지 컬러와 동일한 솔리드 골드 배경, 보더 없음 */
                background: 'var(--color-gold)',
                color: 'var(--color-primary)',
                borderBottomLeftRadius: 4,
              }
          }
        >
          {displayContent}
        </div>
        <span
          className="text-[13px] flex-shrink-0 pb-0.5"
          style={{color: 'var(--color-text-hint)'}}
        >
          {isPending ? '전송 중' : time}
        </span>
      </div>
      {/* AI 위험 탐지 경고 배너 — MID/HIGH 메시지에만 표시 */}
      {modBanner && (
        <div className="max-w-[68%] mt-0.5">
          {modBanner}
        </div>
      )}
    </div>
  )
}

// ── 서브 컴포넌트: 채팅 본문 패널 (내부) ──────────────────────────────────────
/**
 * ChatRoomPanelInner — useStompChat 초기화 포함 실제 채팅 UI
 *
 * ChatRoomPanel(래퍼)이 메시지 로딩 완료 후 마운트하므로
 * initialMessages는 항상 완전한 이력으로 전달됨.
 * chatId가 바뀌면 부모의 key prop으로 전체 remount 됨.
 */
function ChatRoomPanelInner({
                              chatId,
                              detail,
                              linkedTrade,
                              myMemberId,
                              initialMessages,
                              onBack,
                            }: {
  chatId: number
  detail: ChatRoomDetail | null
  linkedTrade: TradeResponse | null
  myMemberId: number
  initialMessages: ChatMessage[]
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  
  // STOMP WebSocket 실시간 채팅 훅
  const {messages, sendMessage, markRead, connected, error} = useStompChat({
    chatId,
    myMemberId,
    initialMessages,
  })
  const {lastEvent} = useStompTradeRealtime({chatId})
  
  // 상대방 정보 계산 (내가 buyer면 상대는 seller, 아니면 buyer)
  const opponent = useMemo(() => {
    if (!detail) return null
    return detail.buyer.memberId === myMemberId ? detail.seller : detail.buyer
  }, [detail, myMemberId])
  
  // 거래 상태 (null: 거래 미연결)
  const tradeStatus = linkedTrade?.status ?? lastEvent?.status ?? detail?.tradeStatus ?? null
  const tradeDeliveryType = linkedTrade?.deliveryType ?? lastEvent?.deliveryType ?? null
  const activeTradeId = linkedTrade?.tradeId ?? detail?.tradeId ?? null
  
  // 아바타 색상
  const avatarColor = opponent ? getAvatarColor(opponent.memberId) : '#1A3051'
  
  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages])
  
  /**
   * messages가 업데이트될 때마다 읽음 처리 발행
   * — 상대방 메시지 수신 시 markRead로 서버에 읽음 상태 전송
   */
  useEffect(() => {
    if (connected && messages.length > 0) {
      markRead()
    }
  }, [messages, connected, markRead])
  
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
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        {/* 모바일: 뒤로가기 버튼 */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg -ml-1 transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          <ChevronLeft size={20}/>
        </button>
        
        {/* 상대방 아바타 (resolveImageUrl로 잘못된 URL 필터링) */}
        {resolveImageUrl(opponent?.profileImageUrl) ? (
          <img
            src={resolveImageUrl(opponent?.profileImageUrl)!}
            alt={opponent?.nickname}
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
            style={{background: avatarColor}}
          >
            {opponent ? opponent.nickname[0].toUpperCase() : '?'}
          </div>
        )}
        
        {/* 상대방 정보 */}
        <div className="flex-1 min-w-0">
          <p
            className="font-bold leading-tight"
            style={{color: 'var(--color-text-main)', fontSize: '0.95rem'}}
          >
            {opponent?.nickname ?? '...'}
          </p>
          {detail && (
            <p className="text-xs truncate mt-0.5" style={{color: 'var(--color-text-sub)'}}>
              {detail.post.title}
            </p>
          )}
        </div>
        
        {/* 상품 가격 (데스크톱 전용) */}
        {detail && (
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                거래 금액
              </p>
              <p
                className="font-bold"
                style={{
                  color: 'var(--color-primary)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                  fontSize: '1rem',
                }}
              >
                {formatPrice(detail.post.price)}
              </p>
            </div>
            <div className="h-8 w-px flex-shrink-0" style={{background: 'var(--color-border)'}}/>
          </div>
        )}
        
        {/* WebSocket 연결 상태 표시기 */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{background: 'var(--color-surface-sunken)'}}
        >
          {connected ? (
            <>
              <Wifi size={12} style={{color: 'var(--color-success)'}}/>
              <span
                className="hidden md:inline text-xs"
                style={{color: 'var(--color-success)'}}
              >
                연결됨
              </span>
            </>
          ) : (
            <>
              <WifiOff size={12} style={{color: 'var(--color-text-hint)'}}/>
              <span
                className="hidden md:inline text-xs"
                style={{color: 'var(--color-text-hint)'}}
              >
                연결 중
              </span>
            </>
          )}
        </div>
        
        <button
          className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{color: 'var(--color-text-hint)'}}
        >
          <MoreHorizontal size={18}/>
        </button>
      </div>
      
      {/* ── 거래 상태바 (채팅방 상세 로드 완료 후 표시) ───────────────────── */}
      {detail && (
        <div
          className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
          style={{
            background: 'var(--color-surface-raised)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {/* 상품 썸네일 — 없으면 ShoppingBag 아이콘 플레이스홀더 (resolveImageUrl로 필터링) */}
          {resolveImageUrl(detail.post.thumbnailUrl) ? (
            <img
              src={resolveImageUrl(detail.post.thumbnailUrl)!}
              alt={detail.post.title}
              className="w-9 h-9 rounded-xl flex-shrink-0 object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border)',
              }}
            >
              <ShoppingBag size={16} style={{color: 'var(--color-text-hint)'}}/>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-sm font-bold truncate"
                style={{color: 'var(--color-text-main)'}}
              >
                {detail.post.title}
              </p>
              {/* 거래 상태 뱃지 (거래 연결된 경우만 표시) */}
              {tradeStatus && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    color: TRADE_STATUS_COLOR[tradeStatus] ?? 'var(--color-text-sub)',
                    background: `${TRADE_STATUS_COLOR[tradeStatus] ?? 'var(--color-text-sub)'}1A`,
                  }}
                >
                  {getTradeStatusDisplayLabel(tradeStatus, tradeDeliveryType)}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{color: 'var(--color-text-sub)'}}>
              {formatPrice(detail.post.price)}
            </p>
          </div>
          
          {/* 결제하기 버튼 (ACCEPTED 상태 + tradeId 있을 때) */}
          {tradeStatus === 'ACCEPTED' && activeTradeId && (
            tradeDeliveryType === 'DIRECT' ? (
              <Link
                to={`/trade/${activeTradeId}/confirm`}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:text-white flex-shrink-0 transition-opacity hover:opacity-90"
                style={{background: 'var(--color-accent)'}}
              >
                거래 진행
              </Link>
            ) : (
              <Link
                to={`/payment/${activeTradeId}`}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:text-white flex-shrink-0 transition-opacity hover:opacity-90"
                style={{background: 'var(--color-accent)'}}
              >
                결제하기
              </Link>
            )
          )}
          {/* 구매 확정 버튼 (RECEIVED 상태 + tradeId 있을 때) */}
          {tradeStatus === 'RECEIVED' && activeTradeId && tradeDeliveryType !== 'DIRECT' && (
            <Link
              to={`/trade/${activeTradeId}/confirm`}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:text-white flex-shrink-0 transition-opacity hover:opacity-90"
              style={{background: 'var(--color-success)'}}
            >
              구매 확정
            </Link>
          )}
        </div>
      )}
      
      {/* ── 안전결제 보호 배너 (PAID / IN_PROGRESS 상태) ────────────────── */}
      {(tradeStatus === 'PAID' || tradeStatus === 'IN_PROGRESS') && tradeDeliveryType !== 'DIRECT' && (
        <div
          className="px-5 py-2.5 flex items-center gap-2 flex-shrink-0"
          style={{
            background: 'rgba(0,179,110,.07)',
            borderBottom: '1px solid rgba(0,179,110,.12)',
          }}
        >
          <Shield size={13} style={{color: 'var(--color-success)', flexShrink: 0}}/>
          <p className="text-xs" style={{color: 'var(--color-success)'}}>
            안전결제 보호 중 — 구매 확정 전까지 결제금은 RE:FORM이 안전하게 보관합니다.
          </p>
        </div>
      )}
      
      {/* ── WebSocket 에러 배너 ────────────────────────────────────────── */}
      {error && (
        <div
          className="px-5 py-2.5 flex items-center gap-2 flex-shrink-0"
          style={{
            background: 'rgba(255,46,77,.07)',
            borderBottom: '1px solid rgba(255,46,77,.12)',
          }}
        >
          <WifiOff size={13} style={{color: 'var(--color-accent)', flexShrink: 0}}/>
          <p className="text-xs" style={{color: 'var(--color-accent)'}}>
            {error}
          </p>
        </div>
      )}
      
      {/* ── 메시지 목록 ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
        {messages.map(msg => (
          <MessageBubble
            key={msg.messageId}
            msg={msg}
            isMine={msg.senderId === myMemberId}
          />
        ))}
        {/* 새 메시지 도착 시 자동 스크롤 앵커 */}
        <div ref={bottomRef}/>
      </div>
      
      {/* ── 메시지 입력바 ─────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3.5 flex items-end gap-2.5 flex-shrink-0"
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        {/* 이미지 첨부 버튼 (현재 미구현 — UI만 표시) */}
        <button
          className="p-2 rounded-xl flex-shrink-0 transition-colors hover:bg-[var(--color-surface-raised)]"
          style={{color: 'var(--color-text-hint)'}}
        >
          <ImageIcon size={20}/>
        </button>
        
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            connected
              ? '메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)'
              : '연결 중...'
          }
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
          style={{background: 'var(--color-accent)', color: '#fff'}}
        >
          <Send size={16}/>
        </button>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 채팅 본문 패널 (데이터 페치 래퍼) ──────────────────────────
/**
 * ChatRoomPanel — 채팅방 상세 + 메시지 이력을 fetch한 뒤 ChatRoomPanelInner 마운트
 *
 * 메시지 로딩 완료 전에는 스피너를 보여주어
 * useStompChat의 initialMessages가 항상 완전한 이력으로 초기화되도록 보장함.
 *
 * chatId가 바뀔 때 부모에서 key={chatId}로 전체 remount 처리.
 */
function ChatRoomPanel({
                         chatId,
                         myMemberId,
                         onBack,
                       }: {
  chatId: number
  myMemberId: number
  onBack: () => void
}) {
  // 채팅방 상세 (거래 상태, buyer/seller 정보, 상품 요약)
  const {data: detail} = useQuery({
    queryKey: ['chatDetail', chatId],
    queryFn: () => getChatRoomDetail(chatId),
    staleTime: 30_000,   // 30초 캐시
  })
  
  const {data: linkedTrade} = useQuery({
    queryKey: ['trade', String(detail?.tradeId ?? '')],
    queryFn: () => getTrade(detail!.tradeId!),
    enabled: !!detail?.tradeId,
    staleTime: 30_000,
  })
  
  // 메시지 이력 (최근 30개, createdAt desc → 역정렬 후 initialMessages 주입)
  const {data: msgPage, isLoading: msgLoading} = useQuery({
    queryKey: ['chatMessages', chatId],
    queryFn: () => getMessages(chatId, 0, 30),
    staleTime: 0,   // 채팅방 진입 시 항상 최신 메시지 로드
  })
  
  // 로딩 중 스피너
  if (msgLoading) {
    return (
      <div
        className="flex flex-col h-full min-h-0 items-center justify-center gap-3"
        style={{background: 'var(--color-surface)'}}
      >
        <Loader2 size={28} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>
          메시지를 불러오는 중...
        </p>
      </div>
    )
  }
  
  // 백엔드는 createdAt desc 정렬로 반환 → 화면 표시는 오름차순이므로 역정렬
  const initialMessages = msgPage ? [...msgPage.content].reverse() : []
  
  return (
    <ChatRoomPanelInner
      chatId={chatId}
      detail={detail ?? null}
      linkedTrade={linkedTrade ?? null}
      myMemberId={myMemberId}
      initialMessages={initialMessages}
      onBack={onBack}
    />
  )
}

// ── 빈 선택 상태 (데스크톱 초기 화면) ─────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{background: 'var(--color-surface-raised)'}}
      >
        <Send size={32} style={{color: 'var(--color-text-hint)'}}/>
      </div>
      <div className="text-center">
        <h3
          className="font-bold mb-2"
          style={{
            color: 'var(--color-text-main)',
            fontFamily: "'Giants','Pretendard',sans-serif",
            fontSize: '1.1rem',
          }}
        >
          채팅방을 선택해주세요
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{color: 'var(--color-text-sub)', maxWidth: 260}}
        >
          왼쪽 목록에서 대화할 채팅방을 선택하면
          <br/>
          메시지를 주고받을 수 있습니다.
        </p>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  // 현재 로그인 사용자 memberId (useStompChat + MessageBubble isMine 판단에 사용)
  const myMemberId = useAuthStore(s => s.user?.id ?? 0)
  
  // 채팅방 목록 조회 (GET /api/chats)
  const {data: rooms = [], isLoading: roomsLoading} = useQuery({
    queryKey: ['chatRooms'],
    queryFn: getChatRooms,
    staleTime: 30_000,
  })
  
  // URL 방 지정 — /chat/:chatId (path param) 또는 /chat?roomId=N (query param) 모두 지원
  // path param 우선: 직접 URL 접근 (/chat/4) 도 404 없이 동작
  const {chatId: pathChatId} = useParams<{ chatId?: string }>()
  const [searchParams] = useSearchParams()
  const urlRoomId = pathChatId
    ? Number(pathChatId)
    : searchParams.get('roomId') ? Number(searchParams.get('roomId')) : null
  
  // 사용자가 명시적으로 선택한 방 ID (null = 미선택)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(urlRoomId)
  
  // 파생 상태: URL 지정 방 > 선택된 방 > 첫 번째 방 순으로 우선 적용
  const activeRoomId = selectedRoomId ?? rooms[0]?.chatId ?? null
  
  return (
    /*
     * 모바일 : 100% 높이, 목록/본문 전환
     * 데스크톱: max-w 컨테이너 + 카드 형태, 좌우 패널 분할
     */
    <div className="flex flex-1 overflow-hidden" style={{background: 'var(--color-bg)'}}>
      
      {/* ── 데스크톱 레이아웃 래퍼 ─────────────────────────────────────── */}
      <div className="flex flex-1 w-full md:max-w-[1200px] md:mx-auto md:my-6 md:px-6 min-h-0">
        <div
          className="flex flex-1 w-full overflow-hidden md:rounded-2xl"
          style={{
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(0,33,71,.08)',
          }}
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
              onSelect={setSelectedRoomId}
              isLoading={roomsLoading}
            />
          </div>
          
          {/* 우: 채팅 본문 패널
              모바일: 방 선택 후에만 표시 (전체 너비)
              데스크톱: 남은 공간 모두 차지 */}
          <div
            className={`${activeRoomId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 overflow-hidden`}
            style={{background: 'var(--color-surface)'}}
          >
            {activeRoomId ? (
              /*
               * key={activeRoomId} — 방 전환 시 ChatRoomPanel 전체 remount
               * 덕분에 ChatRoomPanelInner의 useStompChat이 새 chatId로 재초기화됨
               */
              <ChatRoomPanel
                key={activeRoomId}
                chatId={activeRoomId}
                myMemberId={myMemberId}
                onBack={() => setSelectedRoomId(null)}
              />
            ) : (
              /* 방이 선택되지 않은 경우 빈 상태 표시 */
              <EmptyState/>
            )}
          </div>
        
        </div>
      </div>
    </div>
  )
}
