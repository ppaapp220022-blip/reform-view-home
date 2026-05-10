/**
 * re:form Design System — tailwind.config.ts
 *
 * CSS 변수(index.css)와 Tailwind 유틸리티 클래스를 연결.
 * extend 방식으로 Tailwind 기본값을 유지하면서 커스텀 토큰을 추가.
 *
 * 사용 예)
 *   bg-primary        → background: rgb(var(--prim-navy))
 *   text-accent       → color: var(--color-accent)
 *   rounded-card      → border-radius: 0.75rem
 *   shadow-card       → 스포티 카드 그림자
 */

import type { Config } from 'tailwindcss';

export default {
  // ── 다크모드: 'class' 전략 — .dark 클래스로 수동 전환 가능
  //    prefers-color-scheme은 index.css @media 쿼리에서 자동 처리
  darkMode: 'class',

  // ── 콘텐츠 스캔 경로 — 미사용 클래스 트리쉐이킹
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],

  theme: {
    extend: {
      // ────────────────────────────────────────────────────────────
      // COLORS — CSS 변수를 Tailwind 컬러 토큰으로 매핑
      // Primitive 계열(RGB 채널)은 <alpha-value> 를 지원해 bg-primary/50 동작
      // Semantic 계열은 CSS var() 직접 참조 → 다크모드 자동 전환
      // ────────────────────────────────────────────────────────────
      colors: {
        // Brand / Primary
        primary: {
          DEFAULT:  'rgb(var(--prim-navy) / <alpha-value>)',   /* #002147 */
          hover:    'rgb(var(--prim-navy2) / <alpha-value>)',  /* #1A3051 */
          muted:    'rgb(var(--prim-navy3) / <alpha-value>)',  /* #343F5B */
          subtle:   'rgb(var(--prim-navy) / 0.08)',
        },

        // Accent / Point
        accent: {
          DEFAULT:  'rgb(var(--prim-red) / <alpha-value>)',    /* #FF2E4D */
          hover:    '#e0001f',
          subtle:   'rgb(var(--prim-red) / 0.08)',
        },

        // Sub 컬러
        gold:         'rgb(var(--prim-gold) / <alpha-value>)',   /* #FFB800 */
        'green-neon': 'rgb(var(--prim-green) / <alpha-value>)',  /* #00FFAB */

        // Semantic Surface — CSS var 참조 (다크모드 자동 전환)
        bg:                'var(--color-bg)',
        surface:           'var(--color-surface)',
        'surface-raised':  'var(--color-surface-raised)',
        'surface-sunken':  'var(--color-surface-sunken)',

        // Semantic Text
        'text-main':       'var(--color-text-main)',
        'text-sub':        'var(--color-text-sub)',
        'text-hint':       'var(--color-text-hint)',
        'text-disabled':   'var(--color-text-disabled)',
        'text-inverse':    'var(--color-text-inverse)',
        'text-on-accent':  'var(--color-text-on-accent)',

        // Semantic Border
        border:            'var(--color-border)',
        'border-strong':   'var(--color-border-strong)',
        'border-focus':    'var(--color-border-focus)',

        // Status: Success
        success: {
          DEFAULT: 'var(--color-success)',
          bg:      'var(--color-success-bg)',
          border:  'var(--color-success-border)',
          text:    'var(--color-success-text)',
        },

        // Status: Error
        error: {
          DEFAULT: 'var(--color-error)',
          bg:      'var(--color-error-bg)',
          border:  'var(--color-error-border)',
          text:    'var(--color-error-text)',
        },

        // Status: Warning
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg:      'var(--color-warning-bg)',
          border:  'var(--color-warning-border)',
          text:    'var(--color-warning-text)',
        },

        // Status: Info
        info: {
          DEFAULT: 'var(--color-info)',
          bg:      'var(--color-info-bg)',
          border:  'var(--color-info-border)',
          text:    'var(--color-info-text)',
        },
      },

      // ────────────────────────────────────────────────────────────
      // FONT FAMILY
      // ────────────────────────────────────────────────────────────
      fontFamily: {
        // ── 폰트 3-Tier 규칙 ──────────────────────────────────────
        // TIER 1 (최우선): 영문·숫자만 쓰이는 곳 → font-player (IAMAPLAYER)
        // TIER 2 (기본):   본문·디폴트 텍스트    → font-sans  (Pretendard)
        // TIER 3 (강조):   두꺼운·잘 보여야 할 곳 → font-display (Giants)
        // ──────────────────────────────────────────────────────────

        // TIER 1 — IAMAPLAYER: 영문·숫자 전용 스포티 디스플레이
        // 클래스: font-player
        // !!!  한글 미지원 — 한글 혼용 시 Giants로 자동 fallback
        player: ['"IAMAPLAYER"', 'Giants', 'sans-serif'],

        // TIER 2 — Pretendard: 한글+영문 본문 기본 폰트
        // 클래스: font-sans (기본값 — 명시 불필요)
        sans: ['Pretendard', 'Giants', 'system-ui', '-apple-system', 'sans-serif'],

        // TIER 3 — Giants: 두꺼운 헤딩·섹션 타이틀·버튼 라벨 등 강조 텍스트
        // 클래스: font-display
        display: ['Giants', 'Pretendard', 'sans-serif'],

        // 장식 전용 — Giants-Inline: 히어로 대형 헤딩, 특별한 임팩트 순간
        // 클래스: font-inline (한글 혼용 시 Giants fallback)
        inline: ['"Giants-Inline"', 'Giants', 'sans-serif'],

        // 모노스페이스 — @font-face 미선언, 시스템 기본값만 사용
        mono: ['ui-monospace', 'monospace'],
      },

      // ────────────────────────────────────────────────────────────
      // FONT SIZE — 스포티한 타이트한 스케일
      // ────────────────────────────────────────────────────────────
      fontSize: {
        '2xs': ['0.625rem',  { lineHeight: '1rem' }],      /* 10px */
        xs:    ['0.75rem',   { lineHeight: '1.125rem' }],  /* 12px */
        sm:    ['0.8125rem', { lineHeight: '1.25rem' }],   /* 13px */
        base:  ['0.9375rem', { lineHeight: '1.5rem' }],   /* 15px */
        md:    ['1rem',      { lineHeight: '1.5rem' }],    /* 16px */
        lg:    ['1.125rem',  { lineHeight: '1.6rem' }],   /* 18px */
        xl:    ['1.25rem',   { lineHeight: '1.6rem' }],   /* 20px */
        '2xl': ['1.5rem',    { lineHeight: '1.4rem' }],   /* 24px */
        '3xl': ['1.875rem',  { lineHeight: '1.2rem' }],   /* 30px */
        '4xl': ['2.25rem',   { lineHeight: '1.1rem' }],   /* 36px */
        '5xl': ['3rem',      { lineHeight: '1.05rem' }],  /* 48px — Bebas Neue 용 */
        '6xl': ['3.75rem',   { lineHeight: '1rem' }],     /* 60px */
        '7xl': ['4.5rem',    { lineHeight: '1rem' }],     /* 72px */
      },

      // ────────────────────────────────────────────────────────────
      // BORDER RADIUS — 스포티 + 세련된 균형
      // ────────────────────────────────────────────────────────────
      borderRadius: {
        none:    '0',
        xs:      '4px',
        sm:      '6px',
        DEFAULT: '8px',
        md:      '10px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        '3xl':   '28px',
        full:    '9999px',
        // 시멘틱 별칭
        btn:     '8px',
        card:    '12px',
        modal:   '16px',
        badge:   '9999px',
        input:   '8px',
      },

      // ────────────────────────────────────────────────────────────
      // BOX SHADOW — Navy 계열 컬러드 그림자 → 브랜드 일관성
      // ────────────────────────────────────────────────────────────
      boxShadow: {
        xs:      '0 1px 2px 0 rgba(13, 27, 42, 0.06)',
        sm:      '0 2px 4px 0 rgba(13, 27, 42, 0.08), 0 1px 2px -1px rgba(13, 27, 42, 0.06)',
        DEFAULT: '0 4px 8px -2px rgba(13, 27, 42, 0.10), 0 2px 4px -2px rgba(13, 27, 42, 0.06)',
        md:      '0 8px 16px -4px rgba(13, 27, 42, 0.12), 0 4px 8px -4px rgba(13, 27, 42, 0.06)',
        lg:      '0 16px 32px -8px rgba(13, 27, 42, 0.14), 0 8px 16px -8px rgba(13, 27, 42, 0.06)',
        xl:      '0 24px 48px -12px rgba(13, 27, 42, 0.18)',
        // 컴포넌트 특화
        card:          '0 4px 12px -2px rgba(0, 33, 71, 0.10), 0 2px 4px -2px rgba(0, 33, 71, 0.06)',
        'card-hover':  '0 8px 24px -4px rgba(0, 33, 71, 0.16), 0 4px 8px -4px rgba(0, 33, 71, 0.08)',
        modal:         '0 24px 64px -12px rgba(0, 33, 71, 0.28), 0 8px 24px -8px rgba(0, 33, 71, 0.12)',
        btn:           '0 2px 6px 0 rgba(0, 33, 71, 0.20)',
        'btn-accent':  '0 2px 8px 0 rgba(255, 46, 77, 0.35)',   /* 레드 버튼 글로우 */
        'focus-ring':  '0 0 0 3px rgba(0, 33, 71, 0.20)',
        'focus-accent':'0 0 0 3px rgba(255, 46, 77, 0.25)',
        // 다크모드 대응
        'dark-sm':     '0 2px 8px 0 rgba(0, 0, 0, 0.30)',
        'dark-md':     '0 8px 24px -4px rgba(0, 0, 0, 0.40)',
        'dark-lg':     '0 16px 48px -8px rgba(0, 0, 0, 0.50)',
        none:          'none',
      },

      // ────────────────────────────────────────────────────────────
      // SPACING — 8px 그리드 기반 커스텀 추가
      // ────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',   /* 18px */
        '13':  '3.25rem',    /* 52px */
        '15':  '3.75rem',    /* 60px */
        '18':  '4.5rem',     /* 72px */
        '22':  '5.5rem',     /* 88px */
        '26':  '6.5rem',     /* 104px */
        '30':  '7.5rem',     /* 120px */
        '34':  '8.5rem',     /* 136px */
      },

      // ────────────────────────────────────────────────────────────
      // TRANSITION — 스포티한 빠른 반응
      // ────────────────────────────────────────────────────────────
      transitionDuration: {
        '80':  '80ms',
        '120': '120ms',
        '200': '200ms',
        '300': '300ms',
      },

      transitionTimingFunction: {
        'sport':        'cubic-bezier(0.22, 1, 0.36, 1)',          /* 빠른 진입, 스무스 종료 */
        'bounce-sport': 'cubic-bezier(0.34, 1.56, 0.64, 1)',       /* 경쾌한 팝 효과 */
      },

      // ────────────────────────────────────────────────────────────
      // KEYFRAMES / ANIMATION
      // ────────────────────────────────────────────────────────────
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 46, 77, 0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(255, 46, 77, 0)' },
        },
      },

      animation: {
        'fade-in-up': 'fadeInUp 0.24s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in':   'scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },

      // ────────────────────────────────────────────────────────────
      // MAX WIDTH — 페이지 레이아웃 컨테이너
      // ────────────────────────────────────────────────────────────
      maxWidth: {
        'page':      '1280px',
        'content':   '1126px',   /* 와이어프레임 기준 콘텐츠 너비 */
        'prose':     '720px',
        'card-grid': '1080px',
      },
    },
  },

  plugins: [],
} satisfies Config;
