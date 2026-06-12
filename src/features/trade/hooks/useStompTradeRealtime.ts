/**
 * useStompTradeRealtime.ts — 거래 상태 실시간 동기화 훅
 *
 * 백엔드 STOMP 설정:
 *   WebSocket endpoint : ws://{server}/stomp/chat
 *   구독 채널
 *     - /sub/trade/{tradeId}        : 거래 상세 화면용
 *     - /sub/chat/{chatId}/trade    : 채팅방 거래 상태바용
 *
 * 동작:
 *   - 거래 상태 변경 이벤트를 수신하면 trade / chatDetail / myTrades / chatRooms 캐시를 갱신한다.
 *   - 현재 열려 있는 화면은 invalidate 후 자동 refetch되어 상대방 화면에도 즉시 상태가 반영된다.
 */
import {useEffect, useRef, useState} from 'react'
import {Client, type IMessage} from '@stomp/stompjs'
import {useQueryClient} from '@tanstack/react-query'
import type {ChatRoomDetail} from '../../chat/api/chatApi'
import type {TradeDeliveryType, TradeResponse} from '../api/tradeApi'
import type {TradeStatus} from '../../../types/listing'
import useAuthStore from '../../../store/authStore'
import {resolveWebSocketBaseUrl} from '../../../lib/resolveWebSocketBaseUrl'

const WS_BASE_URL = resolveWebSocketBaseUrl()

export interface TradeRealtimeEvent {
  eventType: string
  tradeId: number
  chatId: number | null
  postId: number
  buyerId: number
  sellerId: number
  status: TradeStatus
  deliveryType: TradeDeliveryType
  deliveryAddress: string | null
  courierCode: string | null
  courierName: string | null
  trackingNumber: string | null
  tradePrice: number
  shippingStartedAt: string | null
  confirmedAt: string | null
  completedAt: string | null
  updatedAt: string
}

interface UseStompTradeRealtimeOptions {
  tradeId?: number | null
  chatId?: number | null
}

interface UseStompTradeRealtimeReturn {
  connected: boolean
  lastEvent: TradeRealtimeEvent | null
}

export function useStompTradeRealtime({
  tradeId = null,
  chatId = null,
}: UseStompTradeRealtimeOptions): UseStompTradeRealtimeReturn {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<TradeRealtimeEvent | null>(null)
  const clientRef = useRef<Client | null>(null)
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    if (!accessToken || (tradeId === null && chatId === null)) return

    const client = new Client({
      brokerURL: `${WS_BASE_URL}/stomp/chat`,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      onConnect() {
        setConnected(true)

        const handleTradeEvent = (frame: IMessage) => {
          try {
            const payload: TradeRealtimeEvent = JSON.parse(frame.body)
            setLastEvent(payload)

            queryClient.setQueryData<TradeResponse | undefined>(
              ['trade', String(payload.tradeId)],
              old => old
                ? {
                  ...old,
                  status: payload.status,
                  deliveryType: payload.deliveryType,
                  deliveryAddress: payload.deliveryAddress,
                  courierCode: payload.courierCode,
                  trackingNumber: payload.trackingNumber,
                  tradePrice: payload.tradePrice,
                  confirmedAt: payload.confirmedAt,
                  completedAt: payload.completedAt,
                }
                : old,
            )

            if (payload.chatId !== null) {
              queryClient.setQueryData<ChatRoomDetail | undefined>(
                ['chatDetail', payload.chatId],
                old => old
                  ? {
                    ...old,
                    tradeId: payload.tradeId,
                    tradeStatus: payload.status,
                  }
                  : old,
              )
            }

            void queryClient.invalidateQueries({queryKey: ['trade', String(payload.tradeId)]})

            if (payload.chatId !== null) {
              void queryClient.invalidateQueries({queryKey: ['chatDetail', payload.chatId]})
              void queryClient.invalidateQueries({queryKey: ['chatMessages', payload.chatId]})
            }

            void queryClient.invalidateQueries({queryKey: ['chatRooms']})
            void queryClient.invalidateQueries({queryKey: ['myTrades']})
          } catch (error) {
            console.error('[TradeRealtime] 메시지 파싱 오류:', error)
          }
        }

        if (tradeId !== null) {
          client.subscribe(`/sub/trade/${tradeId}`, handleTradeEvent)
        }

        if (chatId !== null) {
          client.subscribe(`/sub/chat/${chatId}/trade`, handleTradeEvent)
        }
      },
      onDisconnect() {
        setConnected(false)
      },
      onStompError(frame) {
        console.error('[TradeRealtime] STOMP 에러:', frame.headers?.message)
        setConnected(false)
      },
      onWebSocketError(event) {
        console.error('[TradeRealtime] WebSocket 에러:', event)
        setConnected(false)
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      void client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [accessToken, chatId, queryClient, tradeId])

  return {connected, lastEvent}
}
