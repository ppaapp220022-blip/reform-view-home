/**
 * useRegister — 회원가입 뮤테이션 훅
 *
 * 성공 시 authStore에 유저/토큰 저장 → /onboarding으로 이동 (관심 설정 스텝 2)
 * 백엔드 MemberResponseDTO: { accessToken, refreshToken, user }
 */
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { registerWithEmail, type RegisterRequest } from '../api/authApi'
import useAuthStore from '../../../store/authStore'

export function useRegister() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: (body: RegisterRequest) => registerWithEmail(body),

    onSuccess: ({ accessToken, refreshToken, user }) => {
      // 회원가입 후 자동 로그인 처리 (refreshToken도 저장)
      loginStore(user, accessToken, refreshToken)
      // 온보딩(관심 종목 설정 스텝 2)으로 이동
      navigate('/onboarding', { replace: true })
    },
  })
}
