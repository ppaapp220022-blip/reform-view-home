/**
 * OAuthCallbackPage — 소셜 로그인(OAuth2) 콜백 처리 페이지
 *
 * 플로우:
 *   1. 구글/카카오 로그인 → 백엔드 Spring Security OAuth2 처리
 *   2. 성공 시 백엔드가 이 페이지로 리다이렉트:
 *      /oauth/callback#accessToken=xxx&refreshToken=xxx&...
 *   3. hash fragment에서 토큰 추출 → authStore에 저장 → 홈으로 이동
 *   4. 실패 시 에러 메시지 표시 → 로그인 페이지로 복귀
 *
 * 백엔드 OAuth2 성공 핸들러(OAuth2SuccessHandler)가
 * 프론트 redirect_uri(이 페이지)로 토큰을 hash fragment에 담아 보내야 함
 */
import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {AlertCircle, Loader2} from 'lucide-react'
import {handleSocialCallback} from '../../features/auth/api/authApi'
import type {AuthUser} from '../../store/authStore'
import useAuthStore from '../../store/authStore'
import apiClient from '../../lib/axios'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function processCallback() {
      // hash fragment에서 토큰 추출
      const result = handleSocialCallback()
      
      if (!result || !result.accessToken) {
        // hash에 토큰이 없으면 → 에러 파라미터 확인
        const params = new URLSearchParams(window.location.search)
        const errMsg = params.get('error') ?? '소셜 로그인 처리 중 오류가 발생했습니다.'
        setError(errMsg)
        return
      }
      
      try {
        // accessToken으로 /auth/me 호출해서 user 정보 조회
        const {data: user} = await apiClient.get<AuthUser>('/auth/me', {
          headers: {Authorization: `Bearer ${result.accessToken}`},
        })
        
        // authStore에 로그인 정보 저장
        loginStore(user, result.accessToken, result.refreshToken)
        
        // 홈으로 이동 (replace: 뒤로가기 시 콜백 페이지 다시 방문 방지)
        navigate('/', {replace: true})
      } catch {
        // /auth/me 실패 시 → 토큰만으로 로그인 처리 (user는 restore 시 복원)
        // 백엔드가 user 정보를 함께 내려주는 경우를 위한 fallback
        setError('사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.')
      }
    }
    
    processCallback()
  }, [navigate, loginStore])
  
  // ── 에러 상태 ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{background: 'var(--color-bg)'}}
      >
        <div className="text-center max-w-sm">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{background: 'rgba(255,46,77,.1)'}}
          >
            <AlertCircle size={28} style={{color: 'var(--color-accent)'}}/>
          </div>
          <h2
            className="text-[18px] font-bold mb-2"
            style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            로그인 실패
          </h2>
          <p className="text-[14px] mb-6" style={{color: 'var(--color-text-sub)'}}>
            {error}
          </p>
          <button
            onClick={() => navigate('/login', {replace: true})}
            className="px-6 py-2.5 rounded-[10px] text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            style={{background: 'var(--color-accent)'}}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }
  
  // ── 처리 중 로딩 ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{background: 'var(--color-bg)'}}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2
          size={36}
          className="animate-spin"
          style={{color: 'var(--color-accent)'}}
        />
        <p
          className="text-[15px] font-medium"
          style={{color: 'var(--color-text-sub)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          로그인 처리 중...
        </p>
        <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
          잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  )
}
