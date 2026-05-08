// Listing card (4:5 thumb + meta) and listing grid
const { Badge, PriceTag, I } = window.RF;

// Deterministic placeholder thumb by jersey number
function JerseyThumb({ num, sold, hot, gradient = 'navy' }) {
  const grads = {
    navy: 'linear-gradient(135deg,#1A3051 0%,#002147 100%)',
    red:  'linear-gradient(135deg,#FF2E4D 0%,#a30024 100%)',
    dark: 'linear-gradient(135deg,#343F5B 0%,#0D1B2A 100%)',
    pitch:'linear-gradient(160deg,#1B5E33 0%,#002147 100%)',
  };
  return (
    <div style={{
      aspectRatio: '4/5', position: 'relative',
      background: grads[gradient] || grads.navy,
      display: 'grid', placeItems: 'center',
      overflow: 'hidden',
    }}>
      {/* speed-line motif */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.06) 0 2px, transparent 2px 14px)',
      }}/>
      <span style={{
        fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
        fontSize: 76, color: 'rgba(255,255,255,.18)',
        letterSpacing: '0.04em', position: 'relative',
      }}>{num}</span>
      {hot ? (
        <span style={{
          position: 'absolute', top: 8, left: 8,
          background: '#FF2E4D', color: '#fff',
          fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
          fontSize: 11, padding: '3px 7px', borderRadius: 4,
          letterSpacing: '0.06em',
        }}>HOT</span>
      ) : null}
      {sold ? (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(13,27,42,.55)',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
          fontSize: 28, letterSpacing: '0.1em',
        }}>SOLD OUT</div>
      ) : null}
    </div>
  );
}

function ListingCard({ item, onClick, liked, onLike }) {
  return (
    <article onClick={onClick} style={{
      background: '#fff',
      border: '1px solid rgba(13,27,42,.10)',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 12px -2px rgba(0,33,71,.10), 0 2px 4px -2px rgba(0,33,71,.06)',
      cursor: 'pointer', position: 'relative',
      fontFamily: 'Pretendard',
    }} data-card>
      <JerseyThumb num={item.num} sold={item.sold} hot={item.hot} gradient={item.gradient}/>
      <button onClick={(e) => { e.stopPropagation(); onLike?.(item.id); }} style={{
        position: 'absolute', top: 8, right: 8,
        width: 32, height: 32, borderRadius: 99,
        background: 'rgba(255,255,255,.92)', border: 'none', cursor: 'pointer',
        display: 'grid', placeItems: 'center',
      }}>
        <I.heart size={16} fill={liked}/>
      </button>
      <div style={{ padding: '10px 12px 12px' }}>
        <div data-text-main style={{ fontWeight: 700, fontSize: 13.5, color: '#0D1B2A', lineHeight: 1.35,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div data-text-sub style={{ fontSize: 11.5, color: '#5A6A7A', marginTop: 2 }}>
          {item.size} · {item.cond} · {item.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <PriceTag value={item.price} strike={item.sold}/>
          <div style={{ display: 'flex', gap: 8, color: '#9BAAB9', fontSize: 11, alignItems: 'center' }}>
            <span style={{display:'inline-flex',alignItems:'center',gap:3}}><I.heart size={12}/>{item.likes}</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:3}}><I.msg size={12}/>{item.chats}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ListingGrid({ items, liked, onLike, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px 16px' }}>
      {items.map(it => (
        <ListingCard key={it.id} item={it}
          liked={liked.has(it.id)}
          onLike={onLike}
          onClick={() => onSelect(it)}/>
      ))}
    </div>
  );
}

window.RF.ListingCard = ListingCard;
window.RF.ListingGrid = ListingGrid;
window.RF.JerseyThumb = JerseyThumb;
