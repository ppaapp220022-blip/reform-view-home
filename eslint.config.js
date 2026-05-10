import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      /**
       * ── 인라인 스타일 일관성 안전장치 ─────────────────────────────────────────
       *
       * 원칙:
       *   - CSS 변수 색상(var(--color-*)) → Tailwind className 사용
       *       OK:   className="text-[var(--color-text-main)]"
       *       금지: style={{ color: 'var(--color-text-main)' }}
       *
       *   - 브랜드 전용 하드코딩 hex → style={{}} 허용 (예외)
       *       허용: style={{ background: '#FEE500' }}  // 카카오
       *       허용: style={{ background: '#EA4335' }}  // 구글
       *
       *   - 동적 값(teamColor, computed style) → style={{}} 허용
       *
       * 위반 시 경고(warn)로 처리 — 빌드는 통과하되 코드 리뷰에서 반드시 확인
       */
      'no-restricted-syntax': [
        'warn',
        {
          // style 속성 오브젝트에서 CSS 변수(var(--color-*))를 값으로 쓰는 패턴 감지
          // 이 경우 Tailwind className으로 대체해야 함
          selector:
            "JSXAttribute[name.name='style'] ObjectExpression > Property > Literal[value=/var\\(--color-/]",
          message:
            "[re:form 스타일 규칙] CSS 변수 색상은 style={{}} 대신 Tailwind className에서 " +
            "bg-[var(--color-*)], text-[var(--color-*)] 형식으로 사용하세요. " +
            "동적값(computed)이나 브랜드 전용 hex(카카오 #FEE500 등)는 style={{}} 허용.",
        },
      ],
    },
  },
])
