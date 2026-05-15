import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({presets: [reactCompilerPreset()]}),
  ],
  
  server: {
    proxy: {
      // /api/* 요청을 백엔드(8080)로 프록시 — CORS 우회
      // VITE_API_BASE_URL을 '/api'(상대경로)로 쓸 때 동작
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Spring Security OAuth2 인가 엔드포인트
      // 백엔드 /api/auth/oauth2/google 컨트롤러가 302 Location: /oauth2/authorization/google 반환
      // → 브라우저가 상대경로로 따라가므로 이 경로도 프록시 필요
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // OAuth2 콜백 수신 경로 (카카오/구글 → 백엔드 → 여기로 리다이렉트)
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // 업로드 이미지 서빙 — 백엔드 Spring MVC resource handler
      // 이미지 URL이 /uploads/post/... or /uploads/member/... 형태로 반환됨
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
