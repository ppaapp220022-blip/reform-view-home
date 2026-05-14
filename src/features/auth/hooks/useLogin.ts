/**
 * useLogin — 이메일 로그인 2단계 뮤테이션 훅
 *
 * Step 1: loginStep1 — 이메일+비밀번호 확인 → challengeId 반환
 * Step 2: loginStep2 — challengeId+코드 검증 → JWT 발급 → 홈 이동
 *
 * 사용법:
 *   const { step1, step2, challenge } = useLogin()
 *   step1.mutate({ email, password })   // 코드 발송
 *   step2.mutate({ challengeId, code }) // 코드 검증 → 로그인 완료
 */
import {useMutation} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import {loginStep1, loginStep2, type LoginChallengeResponse} from '../api/authApi'
import useAuthStore from '../../../store/authStore'
import {useState} from 'react'

export function useLogin() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)

  // 1단계 완료 후 challengeId·email 보관
  const [challenge, setChallenge] = useState<LoginChallengeResponse | null>(null)

  // Step 1: 비밀번호 인증 → 이메일 코드 발송
  const step1 = useMutation({
    mutationFn: loginStep1,
    onSuccess: (res) => {
      // challengeId를 저장해 Step 2에서 사용
      setChallenge(res)
    },
  })

  // Step 2: 인증코드 검증 → JWT 발급 → 로그인 완료
  const step2 = useMutation({
    mutationFn: loginStep2,
    onSuccess: ({accessToken, refreshToken, user}) => {
      // 전역 스토어에 유저/토큰 저장 (localStorage도 내부에서 처리)
      loginStore(user, accessToken, refreshToken)
      navigate('/', {replace: true})
    },
  })

  return {step1, step2, challenge}
}
