/**
 * TanStack Query 클라이언트 설정
 * - staleTime: 1분 (동일 데이터 1분 내 재요청 시 캐시 사용)
 * - gcTime: 5분 (캐시 보관 시간)
 * - retry: 1회 (실패 시 1회만 재시도)
 */
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,       // 1분
      gcTime: 1000 * 60 * 5,      // 5분
      retry: 1,
      refetchOnWindowFocus: false, // 탭 전환 시 자동 리패칭 비활성화 (필요 시 true)
    },
    mutations: {
      retry: 0, // mutation은 재시도 없음
    },
  },
})

export default queryClient
