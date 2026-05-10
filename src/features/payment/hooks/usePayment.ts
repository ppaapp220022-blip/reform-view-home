/**
 * usePayment.ts — 결제 관련 React Query 훅
 *
 * useInitPayment  — 결제 초기화 뮤테이션
 * useConfirmPayment — 결제 승인 뮤테이션
 * useCancelPayment  — 결제 취소/환불 뮤테이션
 */
import { useMutation } from '@tanstack/react-query'
import {
  initPayment,
  confirmPayment,
  cancelPayment,
  type PaymentInitRequest,
  type PaymentConfirmRequest,
  type PaymentCancelRequest,
} from '../api/paymentApi'

/**
 * 결제 초기화 훅
 * onSuccess: tossOrderId를 받아 Toss SDK 결제창 오픈
 */
export function useInitPayment() {
  return useMutation({
    mutationFn: (request: PaymentInitRequest) => initPayment(request),
  })
}

/**
 * 결제 승인 훅
 * onSuccess: 결제 완료 → 거래 상태 PAID로 업데이트
 */
export function useConfirmPayment() {
  return useMutation({
    mutationFn: (request: PaymentConfirmRequest) => confirmPayment(request),
  })
}

/**
 * 결제 취소/환불 훅
 * onSuccess: 취소 완료 → 거래 상태 CANCELED로 업데이트
 */
export function useCancelPayment() {
  return useMutation({
    mutationFn: ({
      paymentKey,
      request,
    }: {
      paymentKey: string
      request: PaymentCancelRequest
    }) => cancelPayment(paymentKey, request),
  })
}
