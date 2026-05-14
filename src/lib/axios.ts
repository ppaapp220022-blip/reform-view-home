/**
 * Axios 인스턴스 설정
 *
 * baseURL  : VITE_API_BASE_URL 환경변수 (없으면 /api)
 *
 * 요청 인터셉터:
 *   - Authorization: Bearer {accessToken}  — JWT 인증 헤더 자동 주입
 *
 * 응답 인터셉터:
 *   - ApiResponse<T> 래퍼 자동 언래핑: { success, message, data } → data
 *   - 401 → refreshToken으로 accessToken 재발급 후 원요청 재시도
 *   - 403 → 인증 실패 (토큰 위조/만료/불일치) → 로그인 이동
 */
import axios, {type AxiosRequestConfig} from 'axios'
import useAuthStore from '../store/authStore'

// ── 인스턴스 ────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 토큰 재발급 중 중복 호출 방지 플래그 ────────────────────────────────────
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

/** 재발급 완료 후 대기 중인 요청에 새 토큰 전달 */
function resolvePending(newToken: string) {
  pendingRequests.forEach((cb) => cb(newToken))
  pendingRequests = []
}

/** 인증 정보를 전부 삭제하고 로그인 페이지로 이동 */
function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('authUser')
  window.location.href = '/login'
}

// ── 요청 인터셉터 ────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // JWT 액세스 토큰 자동 주입
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── 응답 인터셉터 ────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data

    // ApiResponse 래퍼 자동 언래핑
    // 조건: { success: boolean, message: string, data: any } 구조인 경우
    // PaymentController 등 직접 DTO 반환 컨트롤러는 그대로 통과
    if (
      body !== null &&
      typeof body === 'object' &&
      typeof body.success === 'boolean' &&
      'message' in body &&
      'data' in body
    ) {
      response.data = body.data
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // 401 Unauthorized — accessToken 만료 시 refreshToken으로 재발급 후 재시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      // refreshToken 없으면 즉시 로그아웃
      if (!refreshToken) {
        clearAuthAndRedirect()
        return Promise.reject(error)
      }

      // 재발급 중 중복 요청은 대기열에 쌓아 두고 완료 후 한꺼번에 재시도
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            }
            resolve(apiClient(originalRequest))
          })
          void reject // 재발급 실패 시 clearAuthAndRedirect가 처리
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // accessToken 재발급 요청 (인터셉터 우회를 위해 axios 직접 호출)
        const {data: body} = await axios.post(
          `${apiClient.defaults.baseURL}/auth/token/refresh`,
          {refreshToken},
          {headers: {'Content-Type': 'application/json'}},
        )

        // ApiResponse 언래핑
        const newAccessToken: string =
          body && typeof body.success === 'boolean' ? body.data?.accessToken : body?.accessToken

        if (!newAccessToken) throw new Error('재발급 응답에 accessToken 없음')

        // 새 토큰 저장 및 대기열 해소 (localStorage + Zustand 스토어 동기화)
        localStorage.setItem('accessToken', newAccessToken)
        useAuthStore.getState().setAccessToken(newAccessToken)
        resolvePending(newAccessToken)

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        // 재발급 실패 → 대기 중인 요청 전부 reject 후 전체 로그아웃
        pendingRequests.forEach((_, __, arr) => {
          arr.length = 0
        })
        pendingRequests = []
        clearAuthAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 403 Forbidden — 토큰 위조·만료·불일치 등 인증 실패
    if (error.response?.status === 403) {
      clearAuthAndRedirect()
    }

    return Promise.reject(error)
  },
)

export default apiClient
