/**
 * useStompChat.ts — STOMP WebSocket 채팅 훅
 *
 * 백엔드 STOMP 설정:
 *   WebSocket endpoint : ws://{server}/stomp/chat
 *   발행 prefix        : /pub  → 메시지 전송: /pub/chat/message / 읽음 처리: /pub/chat/read
 *   구독 prefix        : /sub  → 채팅방 구독: /sub/chat/{chatId}
 *
 * StompChatController:
 *   @MessageMapping("/chat") @SendTo("/sub/chat")
 *   → /pub/chat 으로 발행 시 /sub/chat/{chatId} 구독자에게 브로드캐스트
 *   → /pub/chat/read 발행 시 해당 채팅방 메시지 읽음 처리
 *
 * 사용 예:
 *   const { messages, sendMessage, connected } = useStompChat(chatId, myMemberId)
 */
import {useCallback, useEffect, useRef, useState} from 'react'
import {Client, type IMessage} from '@stomp/stompjs'
import type {ChatMessage} from '../api/chatApi'
import useAuthStore from '../../../store/authStore'

// 백엔드 WebSocket 서버 URL (개발: localhost:8080)
const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8080') as string

interface UseStompChatOptions {
  /** 채팅방 ID — null이면 연결하지 않음 */
  chatId: number | null
  /** 현재 로그인 사용자 memberId */
  myMemberId: number
  /** 채팅방 진입 시 이전 메시지 초기값 */
  initialMessages?: ChatMessage[]
}

interface UseStompChatReturn {
  /** 실시간 메시지 목록 (신규 수신 메시지 포함) */
  messages: ChatMessage[]
  /** 메시지 전송 함수 */
  sendMessage: (content: string, type?: ChatMessage['type']) => void
  /**
   * 읽음 처리 — /pub/chat/read 로 발행
   * 채팅방 진입 시 또는 상대방 메시지 수신 시 호출
   */
  markRead: () => void
  /** WebSocket 연결 상태 */
  connected: boolean
  /** 연결 에러 메시지 */
  error: string | null
}

export function useStompChat({
                               chatId,
                               myMemberId,
                               initialMessages = [],
                             }: UseStompChatOptions): UseStompChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // STOMP 클라이언트 ref (리렌더링 시 재생성 방지)
  const clientRef = useRef<Client | null>(null)
  
  // 가상의 messageId 시퀀스 (서버 응답 전 낙관적 UI용)
  const msgSeqRef = useRef(-1)
  // 스토어에서 직접 구독해 항상 최신 토큰을 사용
  const accessToken = useAuthStore(s => s.accessToken)
  
  useEffect(() => {
    // chatId가 없으면 연결하지 않음
    if (chatId === null || !accessToken) return
    
    // ── STOMP 클라이언트 생성 ─────────────────────────────────────────────────
    const client = new Client({
      brokerURL: `${WS_BASE_URL}/stomp/chat`,
      
      // STOMP CONNECT 시 JWT 토큰 전송 — 백엔드 ChannelInterceptor 인증 통과용
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      
      // 재연결 설정: 5초 간격
      reconnectDelay: 5000,
      
      // 연결 성공 콜백
      onConnect() {
        setConnected(true)
        setError(null)
        
        // 채팅방 진입 시 즉시 읽음 처리 (기존 미읽음 메시지 일괄 처리)
        client.publish({
          destination: '/pub/chat/read',
          body: JSON.stringify({chatId}),
        })
        
        // /sub/chat/{chatId} 구독 — 이 채팅방으로 오는 메시지 수신
        client.subscribe(`/sub/chat/${chatId}`, (frame: IMessage) => {
          try {
            const msg: ChatMessage = JSON.parse(frame.body)
            setMessages(prev => {
              // 낙관적 메시지(messageId < 0)와 서버 응답 중복 방지
              const isDuplicate = prev.some(
                m => m.messageId === msg.messageId && msg.messageId > 0,
              )
              if (isDuplicate) return prev
              
              // 낙관적 임시 메시지를 서버 확정 메시지로 교체
              const replaced = prev.map(m =>
                m.messageId < 0 &&
                m.senderId === msg.senderId &&
                m.content === msg.content
                  ? msg
                  : m,
              )
              // 교체된 것 없으면 새 메시지 추가
              const wasReplaced = replaced.some(m => m.messageId === msg.messageId)
              return wasReplaced ? replaced : [...replaced, msg]
            })
            
            // 상대방 메시지 수신 시 읽음 처리 발행
            if (msg.senderId !== myMemberId) {
              client.publish({
                destination: '/pub/chat/read',
                body: JSON.stringify({chatId}),
              })
            }
          } catch (err) {
            console.error('[STOMP] 메시지 파싱 오류:', err)
          }
        })
      },
      
      // 연결 실패/종료 콜백
      onDisconnect() {
        setConnected(false)
      },
      
      // 에러 콜백
      onStompError(frame) {
        console.error('[STOMP] 에러:', frame.headers?.message)
        setError('채팅 서버 연결에 실패했습니다.')
        setConnected(false)
      },
      
      // WebSocket 에러
      onWebSocketError(event) {
        console.error('[STOMP] WebSocket 에러:', event)
        setError('네트워크 연결을 확인해주세요.')
        setConnected(false)
      },
    })
    
    clientRef.current = client
    client.activate() // 연결 시작
    
    // 컴포넌트 언마운트 또는 chatId 변경 시 연결 해제
    return () => {
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [chatId, accessToken])
  
  // ── 메시지 전송 ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (content: string, type: ChatMessage['type'] = 'TEXT') => {
      if (!clientRef.current?.connected || !chatId || !content.trim()) return
      
      // 낙관적 UI — 서버 응답 전에 즉시 화면에 표시
      const optimisticMsg: ChatMessage = {
        messageId: msgSeqRef.current--,   // 음수 임시 ID
        senderId: myMemberId,
        content: content.trim(),
        type,
        createdAt: new Date().toISOString(),
        isRead: false,
      }
      setMessages(prev => [...prev, optimisticMsg])
      
      // /pub/chat/message 로 발행 — 백엔드 @MessageMapping("/chat/message") 처리
      clientRef.current.publish({
        destination: '/pub/chat/message', // 백엔드 @MessageMapping("/chat/message")
        body: JSON.stringify({
          chatId,
          senderId: myMemberId,
          content: content.trim(),
          type,
        }),
      })
    },
    [chatId, myMemberId],
  )
  
  /**
   * markRead — /pub/chat/read 발행으로 채팅방 메시지 읽음 처리
   * STOMP 미연결 상태에서는 무시
   */
  const markRead = useCallback(() => {
    if (!clientRef.current?.connected || !chatId) return
    clientRef.current.publish({
      destination: '/pub/chat/read',
      body: JSON.stringify({chatId}),
    })
  }, [chatId, accessToken])
  
  return {messages, sendMessage, markRead, connected, error}
}
