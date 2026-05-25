import type {TradeDeliveryType} from '../features/trade/api/tradeApi'
import type {TradeStatus} from '../types/listing'

/**
 * 직거래는 기존 TradeStatus를 그대로 사용하되, 사용자에게 보여줄 문구만 분리한다.
 * 백엔드 상태값이 아직 DELIVERY 중심으로 설계되어 있어도,
 * 화면 문구를 공용 함수로 모아두면 후속 분기 작업을 안전하게 확장할 수 있다.
 */
export function getTradeStatusDisplayLabel(
  status: TradeStatus,
  deliveryType?: TradeDeliveryType | null,
): string {
  if (deliveryType === 'DIRECT') {
    switch (status) {
      case 'REQUESTED':
        return '거래요청'
      case 'ACCEPTED':
      case 'PAID':
      case 'IN_PROGRESS':
      case 'RECEIVED':
        return '거래중'
      case 'CONFIRMED':
        return '거래완료'
      case 'COMPLETED':
        return '거래 완료'
      case 'CANCELED':
        return '거래 취소'
      default:
        break
    }
  }

  switch (status) {
    case 'REQUESTED':
      return '거래 요청됨'
    case 'ACCEPTED':
      return '결제 대기'
    case 'PAID':
      return '결제 완료'
    case 'IN_PROGRESS':
      return '배송 중'
    case 'RECEIVED':
      return '수령 완료'
    case 'CONFIRMED':
      return '구매 확정'
    case 'COMPLETED':
      return '거래 완료'
    case 'CANCELED':
      return '거래 취소'
    case 'DISPUTED':
      return '분쟁 처리 중'
    default:
      return status
  }
}
