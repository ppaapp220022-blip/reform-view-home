// GNB (top global nav) + bottom Tab Bar
const { Logo, I } = window.RF;

function GNB({ title, onBack, right, dark = false }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      height: 56, background: dark ? '#0D1B2A' : '#fff',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)'}`,
      display: 'flex', alignItems: 'center', padding: '0 8px 0 12px',
      gap: 8, color: dark ? '#E8EEF4' : '#0D1B2A',
    }}>
      {onBack ? (
        <button onClick={onBack} style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', display: 'grid', placeItems: 'center' }}>
          <I.back />
        </button>
      ) : null}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        {title ? (
          <h1 style={{ fontFamily: 'Pretendard', fontWeight: 700, fontSize: 16, letterSpacing: '-0.015em', margin: 0, color: 'inherit' }}>{title}</h1>
        ) : <Logo size={22} dark={dark} />}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>{right}</div>
    </header>
  );
}

function IconBtn({ children, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, border: 'none', background: 'none',
      cursor: 'pointer', color: '#0D1B2A',
      display: 'grid', placeItems: 'center', position: 'relative',
      borderRadius: 8,
    }}>
      {children}
      {badge ? (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: 99, background: '#FF2E4D',
          border: '1.5px solid #fff',
        }}/>
      ) : null}
    </button>
  );
}

function TabBar({ active, onChange, dark = false }) {
  const items = [
    { id: 'home',    label: 'HOME',     icon: I.home },
    { id: 'search',  label: 'SEARCH',   icon: I.search },
    { id: 'sell',    label: 'SELL',     icon: I.plus, primary: true },
    { id: 'chat',    label: 'CHAT',     icon: I.chat },
    { id: 'my',      label: 'MY',       icon: I.user },
  ];
  const surface = dark ? '#0D1B2A' : '#fff';
  const inactive = dark ? '#8B9BB0' : '#5A6A7A';
  const activeFg = dark ? '#E8EEF4' : '#002147';
  const pill = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,33,71,.08)';
  return (
    <nav style={{
      position: 'sticky', bottom: 0, background: surface,
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)'}`,
      height: 64, display: 'flex', alignItems: 'flex-end',
      padding: '6px 0 8px',
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        const Glyph = it.icon;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            flex: 1, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: isActive ? activeFg : inactive,
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            fontSize: 10, letterSpacing: '0.06em',
          }}>
            {it.primary ? (
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#FF2E4D', color: '#fff',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 2px 8px 0 rgba(255,46,77,.35)',
              }}><Glyph size={20}/></span>
            ) : (
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: isActive ? pill : 'transparent',
                display: 'grid', placeItems: 'center',
              }}><Glyph size={20} fill={isActive}/></span>
            )}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

window.RF.GNB = GNB;
window.RF.TabBar = TabBar;
window.RF.IconBtn = IconBtn;
