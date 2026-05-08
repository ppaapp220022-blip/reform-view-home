/**
 * Axios 인스턴스 설정
 * - baseURL: Vite 환경변수 VITE_API_BASE_URL (없으면 /api fallback)
 * - 요청 인터셉터: Authorization 헤더에 JWT 토큰 자동 주입
 * - 응답 인터셉터: 401 → 로그아웃 처리 (추후 refresh token 로직 추가 가능)
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 요청 인터셉터 ────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 토큰 꺼내서 Authorization 헤더에 주입
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
  (response) => response,
  (error) => {
    // 401 Unauthorized → 토큰 제거 후 로그인 페이지로 이동
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
