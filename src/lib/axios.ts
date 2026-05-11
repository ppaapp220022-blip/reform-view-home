/**
 * Axios 인스턴스 설정
 *
 * baseURL  : VITE_API_BASE_URL 환경변수 (없으면 /api)
 *
 * 요청 인터셉터:
 *   1) Authorization: Bearer {accessToken}  — JWT 토큰 (SecurityConfig 활성화 후 사용)
 *   2) X-Member-Id: {memberId}             — Security 비활성 상태에서 사용자 식별용
 *
 * 응답 인터셉터:
 *   - ApiResponse<T> 래퍼 자동 언래핑: { success, message, data } → data
 *     (PaymentController·PointController 등 비래핑 응답은 그대로 통과)
 *   - 401 → localStorage 초기화 후 /login 리다이렉트
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
    // JWT 액세스 토큰 주입 (SecurityConfig 활성화 이후 사용)
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // X-Member-Id 헤더 주입: SecurityConfig가 비활성 상태일 때 사용자 식별용
    // 로그인/회원가입 성공 후 authStore.login() 에서 localStorage에 저장됨
    const memberId = localStorage.getItem('memberId')
    if (memberId) {
      config.headers['X-Member-Id'] = memberId
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
    // PaymentController·PointController 등 직접 DTO 반환 컨트롤러는 통과
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
  (error) => {
    // 401 Unauthorized → 인증 정보 초기화 후 로그인 이동
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('memberId')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
