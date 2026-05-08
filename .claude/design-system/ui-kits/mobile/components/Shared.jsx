// Shared brand components for the RE:FORM mobile web UI kit
const { useState } = React;

// Brand wordmark — "RE:" in navy (or surface-inverse in dark), "FORM" in red
const Logo = ({ size = 22, dark = false }) => (
  <span style={{
    fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
    fontSize: size, letterSpacing: '0.06em',
    lineHeight: 1,
  }}>
    <span style={{ color: dark ? '#E8EEF4' : '#002147' }}>RE:</span><span style={{ color: '#FF2E4D' }}>FORM</span>
  </span>
);

// Lucide-style inline SVGs (avoid CDN coupling for offline preview)
const I = {
  search: (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  bell: (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  home: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>,
  chat: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  user: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.fill?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  plus: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  heart: (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.fill?'#FF2E4D':'none'} stroke={p.fill?'#FF2E4D':'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>,
  back: (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  share: (p) => <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>,
  filter: (p) => <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>,
  pin: (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  star: (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill={p.fill?'#FFB800':'none'} stroke={p.fill?'#FFB800':'currentColor'} strokeWidth="2" strokeLinejoin="round"><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  msg: (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const Badge = ({ kind = 'primary', children, sport = false }) => {
  const map = {
    primary: { bg: '#002147', fg: '#fff', bd: '#002147' },
    accent:  { bg: '#FF2E4D', fg: '#fff', bd: '#FF2E4D' },
    success: { bg: '#E6FAF3', fg: '#007A4C', bd: 'rgba(0,179,110,.4)' },
    warning: { bg: '#FFF4E5', fg: '#A85C00', bd: 'rgba(255,149,0,.4)' },
    info:    { bg: '#E0F2FE', fg: '#0369A1', bd: 'rgba(14,165,233,.4)' },
    mvp:     { bg: '#FFB800', fg: '#0D1B2A', bd: '#FFB800' },
    soft:    { bg: 'rgba(0,33,71,.08)', fg: '#002147', bd: 'transparent' },
  }[kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600, lineHeight: 1,
      background: map.bg, color: map.fg, border: `1px solid ${map.bd}`,
      fontFamily: sport ? "'IAMAPLAYER','Bebas Neue',sans-serif" : 'Pretendard',
      letterSpacing: sport ? '0.08em' : '0.01em',
    }}>{children}</span>
  );
};

const Button = ({ kind = 'primary', size = 'md', children, ...rest }) => {
  const map = {
    primary: { bg: '#002147', fg: '#fff', bd: '#002147', sh: 'none' },
    accent:  { bg: '#FF2E4D', fg: '#fff', bd: '#FF2E4D', sh: '0 2px 8px 0 rgba(255,46,77,.35)' },
    ghost:   { bg: '#fff', fg: '#002147', bd: 'rgba(13,27,42,.20)', sh: 'none' },
  }[kind];
  const sz = size === 'sm' ? { p: '7px 12px', f: 12, r: 6 }
            : size === 'lg' ? { p: '14px 22px', f: 15, r: 10 }
            : { p: '11px 18px', f: 14, r: 8 };
  return (
    <button {...rest} style={{
      fontFamily: 'Pretendard', fontWeight: 600, fontSize: sz.f,
      padding: sz.p, borderRadius: sz.r,
      background: map.bg, color: map.fg, border: `1px solid ${map.bd}`,
      boxShadow: map.sh, cursor: 'pointer',
      transition: 'all .12s cubic-bezier(0.22,1,0.36,1)',
      ...rest.style,
    }}>{children}</button>
  );
};

const PriceTag = ({ value, strike = false }) => (
  <span style={{
    fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
    fontSize: 22, color: strike ? '#9BAAB9' : '#002147',
    letterSpacing: '0.02em',
    textDecoration: strike ? 'line-through' : 'none',
  }}>₩{value.toLocaleString()}</span>
);

window.RF = { Logo, I, Badge, Button, PriceTag };
