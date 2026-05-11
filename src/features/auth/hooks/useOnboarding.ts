/**
 * useOnboarding — 온보딩(관심 설정) 뮤테이션 훅
 *
 * 성공 시 /welcome으로 이동.
 *   - router state로 선택한 interests를 전달해 WelcomePage에서 요약 표시
 * 건너뛰기(skip) 시에는 훅 외부에서 직접 navigate('/') 호출.
 *
 * 백엔드 OnboardingRequestDTO: { sport (단일), team (선택), keywords[] }
 */
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  saveInterestSetting,
  type InterestSettingRequest,
} from '../api/authApi'

export function useOnboarding() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (body: InterestSettingRequest) => saveInterestSetting(body),

    /**
     * onSuccess: variables = 제출한 InterestSettingRequest 원본
     * router state로 넘겨 WelcomePage가 선택 내역을 렌더링할 수 있게 함
     */
    onSuccess: (_data, variables) => {
      navigate('/welcome', {
        replace: true,
        state: {
          // WelcomePage에서 관심 요약 표시용
          sport:    variables.sport,
          team:     variables.team,
          keywords: variables.keywords,
        },
      })
    },
  })
}
