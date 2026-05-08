// Desktop top header (GNB) + footer
const { Logo, I, Button, Badge } = window.RF;

function DesktopHeader({ dark = false, active = 'home', onNav, onSell, onSearch }) {
  const fg = dark ? '#E8EEF4' : '#0D1B2A';
  const sub = dark ? '#8B9BB0' : '#5A6A7A';
  const surf = dark ? '#0D1B2A' : '#fff';
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  const items = [
    { id: 'home',      label: '홈' },
    { id: 'market',    label: '마켓' },
    { id: 'community', label: '커뮤니티' },
    { id: 'guide',     label: '거래 가이드' },
  ];
  return (
    <header data-surface style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: surf, borderBottom: `1px solid ${border}`,
      fontFamily: 'Pretendard',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', gap: 28,
      }}>
        <a onClick={() => onNav?.('home')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          <Logo size={26} dark={dark} />
        </a>
        <nav style={{ display: 'flex', gap: 4 }}>
          {items.map(it => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => onNav?.(it.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 14px', borderRadius: 8,
                fontFamily: 'Pretendard', fontWeight: on ? 700 : 600, fontSize: 14,
                color: on ? (dark ? '#E8EEF4' : '#002147') : sub,
                position: 'relative',
                letterSpacing: '-0.01em',
              }}>
                {it.label}
                {on ? (
                  <span style={{
                    position: 'absolute', left: 14, right: 14, bottom: -15,
                    height: 2, background: '#FF2E4D', borderRadius: 2,
                  }}/>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Search */}
        <div style={{
          flex: 1, maxWidth: 520, marginLeft: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          background: dark ? '#081018' : '#F4F6F9',
          border: `1px solid ${border}`,
          borderRadius: 9999, padding: '9px 16px',
          color: sub,
        }} data-surface-sunken>
          <I.search size={18}/>
          <input
            placeholder="구단·선수·시즌으로 검색"
            onFocus={onSearch}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'Pretendard', fontSize: 14,
              color: fg,
            }}
          />
          <span style={{
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            fontSize: 11, letterSpacing: '0.06em',
            background: dark ? '#142236' : '#fff',
            border: `1px solid ${border}`,
            borderRadius: 4, padding: '2px 6px', color: sub,
          }}>⌘K</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: fg, display: 'grid', placeItems: 'center', position: 'relative', borderRadius: 8 }}>
            <I.heart size={20}/>
          </button>
          <button style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: fg, display: 'grid', placeItems: 'center', position: 'relative', borderRadius: 8 }}>
            <I.chat size={20}/>
            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 99, background: '#FF2E4D', border: `1.5px solid ${surf}` }}/>
          </button>
          <button style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: fg, display: 'grid', placeItems: 'center', position: 'relative', borderRadius: 8 }}>
            <I.bell size={20}/>
          </button>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: 'linear-gradient(135deg,#FF2E4D,#002147)', marginLeft: 4 }}/>
          <Button kind="accent" size="sm" onClick={onSell} style={{ marginLeft: 8 }}>판매하기</Button>
        </div>
      </div>
    </header>
  );
}

function DesktopFooter({ dark = false }) {
  const fg = dark ? '#E8EEF4' : '#0D1B2A';
  const sub = dark ? '#8B9BB0' : '#5A6A7A';
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  const cols = [
    ['서비스', ['소개', '판매하기', '거래 가이드', '안전 거래']],
    ['커뮤니티', ['공지사항', '이적시장', '리뷰', '구단별 게시판']],
    ['정책', ['이용약관', '개인정보처리방침', '수수료 안내', '분쟁 조정']],
    ['고객센터', ['1:1 문의', '자주 묻는 질문', '신고 센터']],
  ];
  return (
    <footer data-surface style={{
      borderTop: `1px solid ${border}`,
      background: dark ? '#0D1B2A' : '#fff',
      fontFamily: 'Pretendard',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <Logo size={26} dark={dark}/>
            <p style={{ marginTop: 14, fontSize: 13, color: sub, lineHeight: 1.6, maxWidth: 280 }} data-text-sub>
              스포츠 유니폼을 가장 빠르게 거래하는 곳.<br/>
              팬을 위한 신뢰 기반 리셀 마켓.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
              <Badge kind="primary" sport>SAFE TRADE</Badge>
              <Badge kind="mvp" sport>MVP VERIFIED</Badge>
            </div>
          </div>
          {cols.map(([h, rows]) => (
            <div key={h}>
              <div style={{ fontWeight: 700, fontSize: 13, color: fg, marginBottom: 12 }} data-text-main>{h}</div>
              {rows.map(r => (
                <div key={r} style={{ fontSize: 13, color: sub, padding: '6px 0', cursor: 'pointer' }} data-text-sub>{r}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 32, paddingTop: 18, borderTop: `1px solid ${border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
          fontSize: 12, letterSpacing: '0.08em', color: sub,
        }}>
          <span>© 2025 RE:FORM. ALL RIGHTS RESERVED.</span>
          <span>RESELL · COMMUNITY · UNIFORMS</span>
        </div>
      </div>
    </footer>
  );
}

window.RF.DesktopHeader = DesktopHeader;
window.RF.DesktopFooter = DesktopFooter;
