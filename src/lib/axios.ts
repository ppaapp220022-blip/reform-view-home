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
 *     └ refresh 자체가 401/403이면 → 토큰 완전 만료 → 로그아웃
 *     └ refresh가 404/500/네트워크 오류이면 → 원요청만 실패처리 (로그아웃 없음)
 *   - 403 → Forbidden (권한 없음). 토큰 자체 이상과 무관하므로 로그아웃 하지 않음.
 *     Spring Security 표준: 401=미인증, 403=인가 실패 (인증은 통과)
 *
 * ★ 버그 수정 (2026-05-15):
 *   - 기존: 403 수신 시 무조건 clearAuthAndRedirect() → 실제 권한 오류에도 로그아웃
 *   - 기존: refresh 실패(404/500) 시에도 clearAuthAndRedirect() → 백엔드 일시 오류에 로그아웃
 *   - 수정: refresh가 401/403 반환 시에만 로그아웃 (토큰 명시적 거부)
 *   - 수정: 403은 로그아웃 트리거에서 제거
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
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

/** 재발급 완료 후 대기 중인 요청에 새 토큰 전달 */
function resolvePending(newToken: string) {
  pendingRequests.forEach(({resolve}) => resolve(newToken))
  pendingRequests = []
}

/** 재발급 실패 후 대기 중인 요청 전부 reject */
function rejectPending(err: unknown) {
  pendingRequests.forEach(({reject}) => reject(err))
  pendingRequests = []
}

/** 인증 정보를 전부 삭제하고 로그인 페이지로 이동 */
function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('authUser')
  // Zustand 스토어도 초기화 (화면 상태 동기화)
  useAuthStore.getState().logout()
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
    // 403 + code "40300" — RestAuthenticationEntryPoint else branch:
    //   토큰이 없거나 type이 "access"가 아닐 때 백엔드가 403을 반환하는 케이스.
    //   axios 인터셉터는 401만 처리하므로 이 케이스도 갱신 재시도 대상에 포함한다.
    const _respData = error.response?.data as Record<string, unknown> | undefined
    const _is403AuthMissing = error.response?.status === 403 && _respData?.['code'] === '40300'
    if ((error.response?.status === 401 || _is403AuthMissing) && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')
      
      // refreshToken 자체가 없으면 즉시 로그아웃
      if (!refreshToken) {
        clearAuthAndRedirect()
        return Promise.reject(error)
      }
      
      // 재발급 중 중복 요청은 대기열에 쌓아 두고 완료 후 한꺼번에 재시도
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (newToken) => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              }
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        // accessToken 재발급 요청 (apiClient 인터셉터 우회를 위해 axios 직접 호출)
        const {data: body} = await axios.post(
          `${apiClient.defaults.baseURL}/auth/token/refresh`,
          {refreshToken},
          {headers: {'Content-Type': 'application/json'}},
        )
        
        // ApiResponse 언래핑 (래핑/비래핑 양쪽 대응)
        const newAccessToken: string =
          body && typeof body.success === 'boolean' ? body.data?.accessToken : body?.accessToken
        
        if (!newAccessToken) throw new Error('재발급 응답에 accessToken 없음')
        
        // 새 토큰 저장 및 대기열 해소 (localStorage + Zustand 스토어 동기화)
        localStorage.setItem('accessToken', newAccessToken)
        useAuthStore.getState().setAccessToken(newAccessToken)
        
        // 백엔드가 refresh token rotation을 하므로 새 refreshToken도 반드시 갱신해야 한다.
        // 저장하지 않으면 다음 만료 시 구 토큰으로 재발급 요청 → Redis 불일치 → 재발급 실패 → 강제 로그아웃
        const _rotatedRefreshToken = (body as Record<string, unknown>)?.['data'] as Record<string, unknown>
        const _newRefreshToken = _rotatedRefreshToken?.['refreshToken'] as string | undefined
        if (_newRefreshToken) {
          localStorage.setItem('refreshToken', _newRefreshToken)
        }
        
        resolvePending(newAccessToken)
        
        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        // refresh 엔드포인트가 401/403을 반환 → refresh 토큰 자체가 만료/거부됨
        // 이 경우에만 전체 로그아웃 처리 (명시적 토큰 거부)
        const refreshStatus = axios.isAxiosError(refreshError)
          ? refreshError.response?.status
          : undefined
        
        if (refreshStatus === 401 || refreshStatus === 403) {
          // 서버가 refresh token을 명시적으로 거부 → 로그아웃
          rejectPending(refreshError)
          clearAuthAndRedirect()
        } else {
          // 404(미구현), 500(서버 오류), 네트워크 오류 등
          // → 원요청만 실패처리하고 로그아웃하지 않음 (세션 유지)
          rejectPending(refreshError)
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
    // 403 Forbidden — 권한 없음 (인증은 통과했으나 해당 자원 접근 불가)
    // Spring Security 표준에서 403은 인증(토큰) 문제가 아닌 인가(권한) 문제.
    // 로그아웃 하지 않고 각 컴포넌트가 에러를 처리하도록 위임.
    // (참고: 일부 백엔드가 토큰 위조 시 403을 반환하기도 하지만,
    //  그 경우 refresh 시도 시 401/403이 내려오므로 위의 refresh 실패 분기에서 처리됨)
    
    return Promise.reject(error)
  },
)

export default apiClient
