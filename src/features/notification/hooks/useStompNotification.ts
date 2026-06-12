/**
 * useStompNotification.ts — 알림 실시간 WebSocket 구독 훅
 *
 * 백엔드 STOMP 설정:
 *   WebSocket endpoint : ws://{server}/stomp/chat  (채팅과 동일한 엔드포인트)
 *   구독 채널          : /sub/notification/{memberId}
 *
 * 동작:
 *   - 로그인 상태일 때 자동으로 알림 채널 구독
 *   - 알림 수신 시 TanStack Query ['notifications'] 캐시를 invalidate
 *     → GNB가 자동으로 최신 알림 목록 + 미읽음 수를 re-fetch
 *   - 로그아웃(memberId 없음) 시 자동 연결 해제
 *
 * 사용:
 *   GNB 등 최상위 레이아웃 컴포넌트에서 한 번만 호출하면 됨
 *   const { connected } = useStompNotification(user?.id ?? null)
 */
import {useEffect, useRef, useState} from 'react'
import {Client} from '@stomp/stompjs'
import {useQueryClient} from '@tanstack/react-query'
import useAuthStore from '../../../store/authStore'
import {resolveWebSocketBaseUrl} from '../../../lib/resolveWebSocketBaseUrl'

const WS_BASE_URL = resolveWebSocketBaseUrl()

interface UseStompNotificationReturn {
  /** WebSocket 연결 상태 */
  connected: boolean
}

/**
 * @param memberId - 로그인한 유저의 memberId (비로그인 시 null)
 */
export function useStompNotification(memberId: number | null): UseStompNotificationReturn {
  const [connected, setConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const qc = useQueryClient()
  // 스토어에서 직접 가져와야 ref가 항상 최신 토큰을 바라봄
  const accessToken = useAuthStore(s => s.accessToken)
  
  useEffect(() => {
    // 비로그인 상태면 연결하지 않음
    if (memberId === null || !accessToken) return
    
    const client = new Client({
      brokerURL: `${WS_BASE_URL}/stomp/chat`,
      
      // STOMP CONNECT 시 JWT 토큰 전송 — 백엔드 ChannelInterceptor 인증 통과용
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      
      // 재연결 간격: 5초
      reconnectDelay: 5000,
      
      onConnect() {
        setConnected(true)
        
        // /sub/notification/{memberId} 구독 — 이 유저에게 오는 알림만 수신
        client.subscribe(`/sub/notification/${memberId}`, () => {
          // 알림 수신 시 캐시 무효화 → GNB re-fetch (미읽음 수 + 목록 갱신)
          void qc.invalidateQueries({queryKey: ['notifications']})
        })
      },
      
      onDisconnect() {
        setConnected(false)
      },
      
      onStompError(frame) {
        console.error('[StompNotification] STOMP 에러:', frame.headers?.message)
        setConnected(false)
      },
      
      onWebSocketError(event) {
        console.error('[StompNotification] WebSocket 에러:', event)
        setConnected(false)
      },
    })
    
    clientRef.current = client
    client.activate()
    
    // 언마운트 또는 memberId/accessToken 변경 시 연결 해제
    return () => {
      void client.deactivate()
    }
  }, [memberId, accessToken, qc])
  
  return { connected }
}
