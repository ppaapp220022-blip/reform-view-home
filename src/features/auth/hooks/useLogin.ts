/**
 * useLogin — 이메일 로그인 뮤테이션 훅
 *
 * TanStack Query useMutation 래퍼.
 * 성공 시 authStore에 유저/토큰 저장 후 홈으로 이동.
 */
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, type LoginRequest } from '../api/authApi'
import useAuthStore from '../../../store/authStore'

export function useLogin() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: (body: LoginRequest) => loginWithEmail(body),

    onSuccess: ({ accessToken, user }) => {
      // 전역 스토어에 유저/토큰 저장 (localStorage도 내부에서 처리)
      login(user, accessToken)
      navigate('/', { replace: true })
    },

    // 에러 핸들링은 호출부(컴포넌트)에서 error 객체로 처리
  })
}
