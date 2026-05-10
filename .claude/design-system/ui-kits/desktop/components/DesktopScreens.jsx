// Desktop screens: Home, Detail, Community
const { useState: useStateD } = React;
const { Badge, Button, PriceTag, I, JerseyThumb, ListingCard, DesktopHeader, DesktopFooter } = window.RF;

const DSAMPLE = [
  { id:'a1', num:'07', title:'맨유 22-23 홈 어센틱',     size:'L',  cond:'A', location:'역삼동',  price:89000,  likes:38,  chats:4, hot:true,  gradient:'red' },
  { id:'a2', num:'10', title:'손흥민 토트넘 어웨이',      size:'M',  cond:'S', location:'마포구',  price:145000, likes:124, chats:9,             gradient:'navy' },
  { id:'a3', num:'23', title:'두산 베어스 홈 23',        size:'XL', cond:'B', location:'잠실동',  price:52000,  likes:12,  chats:1, sold:true,  gradient:'dark' },
  { id:'a4', num:'09', title:'레알 마드리드 홈 24',      size:'L',  cond:'S', location:'성동구',  price:128000, likes:88,  chats:6,             gradient:'navy' },
  { id:'a5', num:'11', title:'바르샤 어웨이 22-23',     size:'M',  cond:'A', location:'서초구',  price:74000,  likes:33,  chats:2,             gradient:'pitch'},
  { id:'a6', num:'18', title:'KIA 타이거즈 어센틱',     size:'L',  cond:'A', location:'광진구',  price:65000,  likes:21,  chats:3, hot:true,  gradient:'red' },
  { id:'a7', num:'04', title:'리버풀 22-23 홈 키트',    size:'M',  cond:'A', location:'송파구',  price:79000,  likes:42,  chats:3,             gradient:'red' },
  { id:'a8', num:'07', title:'PSG 어웨이 23-24',       size:'L',  cond:'S', location:'강남구',  price:165000, likes:96,  chats:7,             gradient:'navy' },
  { id:'a9', num:'17', title:'LG 트윈스 홈 어센틱',     size:'XL', cond:'A', location:'잠실동',  price:58000,  likes:18,  chats:2,             gradient:'pitch'},
  { id:'aA', num:'25', title:'AC 밀란 23-24 어웨이',  size:'M',  cond:'B', location:'용산구',  price:62000,  likes:14,  chats:1,             gradient:'red' },
];

function FilterRail({ dark }) {
  const fg = dark ? '#E8EEF4' : '#0D1B2A';
  const sub = dark ? '#8B9BB0' : '#5A6A7A';
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  const surf = dark ? '#0D1B2A' : '#fff';

  const [cat, setCat]   = useStateD('축구');
  const [conds, setConds] = useStateD(new Set(['S','A']));
  const [price, setPrice] = useStateD(150);

  const toggleCond = (c) => setConds(p => { const n = new Set(p); n.has(c)?n.delete(c):n.add(c); return n; });

  const Section = ({ title, children }) => (
    <div style={{ padding: '18px 20px', borderBottom: `1px solid ${border}` }}>
      <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 12, letterSpacing: '0.1em', color: sub, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <aside data-surface data-card style={{
      width: 240, flexShrink: 0,
      background: surf, border: `1px solid ${border}`, borderRadius: 12,
      fontFamily: 'Pretendard', alignSelf: 'flex-start',
      position: 'sticky', top: 88,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${border}`, display:'flex', alignItems:'center', gap: 8, color: fg }} data-text-main>
        <I.filter size={16}/>
        <span style={{ fontWeight: 700, fontSize: 14 }}>필터</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#FF2E4D', cursor: 'pointer' }}>초기화</span>
      </div>

      <Section title="CATEGORY">
        {['축구','야구','농구','배구','럭비','e스포츠'].map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: fg }}>
            <input type="radio" checked={cat===c} onChange={() => setCat(c)} style={{ accentColor: '#002147' }}/>
            <span data-text-main>{c}</span>
          </label>
        ))}
      </Section>

      <Section title="CONDITION">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['S','A','B','C'].map(c => {
            const on = conds.has(c);
            return (
              <button key={c} onClick={() => toggleCond(c)} style={{
                padding: '8px 0', borderRadius: 8,
                border: `1px solid ${on ? '#002147' : border}`,
                background: on ? '#002147' : 'transparent',
                color: on ? '#fff' : fg,
                fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
                fontSize: 14, letterSpacing: '0.06em', cursor: 'pointer',
              }}>{c}</button>
            );
          })}
        </div>
      </Section>

      <Section title="PRICE">
        <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 18, color: fg }} data-text-main>
          ₩0 — ₩{(price * 1000).toLocaleString()}
        </div>
        <input type="range" min="10" max="300" value={price} onChange={(e) => setPrice(+e.target.value)}
          style={{ width: '100%', accentColor: '#FF2E4D', marginTop: 8 }}/>
      </Section>

      <Section title="SIZE">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['XS','S','M','L','XL','XXL'].map(s => (
            <span key={s} style={{
              padding: '6px 10px', borderRadius: 9999,
              border: `1px solid ${border}`,
              fontSize: 12, color: fg, cursor: 'pointer',
              fontFamily: 'Pretendard', fontWeight: 600,
            }} data-chip>{s}</span>
          ))}
        </div>
      </Section>

      <div style={{ padding: 14 }}>
        <Button kind="primary" size="md" style={{ width: '100%' }}>적용하기</Button>
      </div>
    </aside>
  );
}

function HeroBanner({ dark }) {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(120deg,#002147 0%,#1A3051 60%,#FF2E4D 180%)',
      color: '#fff', padding: '40px 44px',
      display: 'flex', alignItems: 'center', gap: 24,
      minHeight: 220,
      fontFamily: 'Pretendard',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.06) 0 2px, transparent 2px 18px)' }}/>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 14, letterSpacing: '0.12em', color: '#FFB800' }}>WEEKLY DRAFT · SEASON 25</div>
        <div style={{ fontWeight: 800, fontSize: 36, lineHeight: 1.15, marginTop: 8, letterSpacing: '-0.02em' }}>
          이번 주 가장 빠르게 거래된<br/>
          <span style={{ color: '#FF2E4D' }}>스포츠 유니폼</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Badge kind="accent" sport>LIVE 12</Badge>
          <Badge kind="mvp" sport>MVP PICKS</Badge>
          <Badge kind="primary" sport>SAFE TRADE</Badge>
        </div>
        <Button kind="accent" size="lg" style={{ marginTop: 22 }}>지금 구경하기 →</Button>
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: 360 }}>
        {[{n:'10',g:'navy'},{n:'07',g:'red'},{n:'09',g:'navy'},{n:'23',g:'dark'}].map((j,i) => (
          <div key={i} style={{
            aspectRatio: '4/5', borderRadius: 10, overflow: 'hidden',
            transform: `rotate(${[-3,2,-2,3][i]}deg) translateY(${[0,8,8,0][i]}px)`,
            boxShadow: '0 16px 32px -8px rgba(0,0,0,.35)',
          }}>
            <JerseyThumb num={j.n} gradient={j.g}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryRail({ dark }) {
  const items = [
    ['축구', '12.4k'],
    ['야구', '8.1k'],
    ['농구', '3.6k'],
    ['배구', '1.2k'],
    ['럭비', '480'],
    ['e스포츠', '320'],
    ['미국 4대 리그', '5.7k'],
    ['빈티지', '2.1k'],
  ];
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
      {items.map(([n, c], i) => (
        <div key={n} data-card style={{
          padding: '18px 14px', borderRadius: 12,
          background: dark ? '#0D1B2A' : '#fff',
          border: `1px solid ${border}`,
          textAlign: 'center', cursor: 'pointer',
          fontFamily: 'Pretendard',
        }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto 10px',
            borderRadius: 10,
            background: ['#002147','#FF2E4D','#1A3051','#FFB800','#343F5B','#0D1B2A','#002147','#5A6A7A'][i],
            display: 'grid', placeItems: 'center',
            color: '#fff',
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            fontSize: 14, letterSpacing: '0.06em',
          }}>{n.slice(0,2)}</div>
          <div style={{ fontWeight: 700, fontSize: 13 }} data-text-main>{n}</div>
          <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 11, color: '#5A6A7A', marginTop: 2, letterSpacing: '0.06em' }} data-text-sub>{c}</div>
        </div>
      ))}
    </div>
  );
}

function HomeScreenD({ liked, onLike, onSelect, dark }) {
  const [sort, setSort] = useStateD('latest');
  const sorts = [['latest','최신순'],['price-low','가격 낮은순'],['price-high','가격 높은순'],['popular','인기순']];
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 64px' }}>
      <HeroBanner dark={dark}/>
      <div style={{ marginTop: 28, marginBottom: 12, display:'flex', alignItems:'baseline', gap: 12 }}>
        <h2 style={{ fontFamily: 'Pretendard', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }} data-text-main>카테고리</h2>
      </div>
      <CategoryRail dark={dark}/>

      <div style={{ marginTop: 36, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontFamily: 'Pretendard', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }} data-text-main>오늘의 유니폼</h2>
        <span style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 13, letterSpacing: '0.08em', color: '#5A6A7A' }}>RECOMMENDED FOR YOU</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {sorts.map(([id, lab]) => (
            <button key={id} onClick={() => setSort(id)} style={{
              padding: '7px 12px', borderRadius: 9999,
              border: `1px solid ${sort===id ? '#002147' : 'rgba(13,27,42,.20)'}`,
              background: sort===id ? '#002147' : 'transparent',
              color: sort===id ? '#fff' : (dark ? '#E8EEF4' : '#0D1B2A'),
              fontFamily: 'Pretendard', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}>{lab}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <FilterRail dark={dark}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {DSAMPLE.map(it => (
              <ListingCard key={it.id} item={it}
                liked={liked.has(it.id)} onLike={onLike}
                onClick={() => onSelect(it)}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailScreenD({ item, liked, onLike, onBack, dark }) {
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  const fg = dark ? '#E8EEF4' : '#0D1B2A';
  const sub = dark ? '#8B9BB0' : '#5A6A7A';
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 64px', fontFamily: 'Pretendard' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: sub, marginBottom: 16, cursor:'pointer' }} onClick={onBack} data-text-sub>
        <I.back size={14}/> 마켓으로 돌아가기
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', gap: 32 }}>
        {/* Gallery */}
        <div>
          <div data-card style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}>
            <JerseyThumb num={item.num} hot={item.hot} sold={item.sold} gradient={item.gradient}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
            {['navy','red','dark','pitch'].map((g,i) => (
              <div key={g} data-card style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${i===0?'#002147':border}`, cursor: 'pointer' }}>
                <JerseyThumb num={item.num} gradient={g}/>
              </div>
            ))}
          </div>
        </div>
        {/* Details */}
        <div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Badge kind="primary">정품 인증</Badge>
            <Badge kind="soft">컨디션 {item.cond}</Badge>
            {item.hot ? <Badge kind="accent" sport>HOT</Badge> : null}
          </div>
          <h1 style={{ fontFamily: 'IAMAPLAYER', fontWeight: 800, fontSize: 28, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.25, color: fg }} data-text-main>
            {item.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sub, fontSize: 13 }} data-text-sub>
            <I.pin size={14}/> {item.location} · 3시간 전 · 조회 1,284
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 44, color: dark ? '#E8EEF4' : '#002147', letterSpacing: '0.02em' }} data-price>
              ₩{item.price.toLocaleString()}
            </span>
            <Badge kind="accent" sport>−12%</Badge>
          </div>

          <div style={{ marginTop: 20, padding: '16px 18px', background: dark ? '#142236' : '#F4F6F9', borderRadius: 10 }} data-surface-2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, background: 'linear-gradient(135deg,#FF2E4D,#002147)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: fg }} data-text-main>jersey_collector</div>
                <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, color: sub }}>
                  <I.star size={12} fill/> 4.9 · 거래 87회 · 응답률 96%
                </div>
              </div>
              <Button kind="ghost" size="sm">팔로우</Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
            {[
              ['브랜드','Adidas'],['시즌','22-23'],['컨디션',`${item.cond} · 매우 좋음`],['사이즈',item.size]
            ].map(([k,v]) => (
              <div key={k} data-surface-sunken style={{ background: '#F4F6F9', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#5A6A7A' }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1B2A', marginTop: 2 }} data-text-main>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            <Button kind="ghost" size="lg" onClick={() => onLike(item.id)} style={{ flex: '0 0 56px', display: 'grid', placeItems: 'center' }}>
              <I.heart size={20} fill={liked}/>
            </Button>
            <Button kind="primary" size="lg" style={{ flex: 1 }}>채팅하기</Button>
            <Button kind="accent" size="lg" style={{ flex: 1 }}>바로 구매</Button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: '0 0 12px', letterSpacing:'-0.015em' }} data-text-main>상품 설명</h2>
          <p style={{ fontSize: 14, color: fg, lineHeight: 1.7, margin: 0 }} data-text-main>
            22-23 시즌 홈 유니폼 어센틱 모델, 사이즈 {item.size}.<br/>
            한 시즌 응원용으로만 착용했고 세탁 완료 상태입니다.
            정품 인증 가능. 직거래 우선, 택배도 가능합니다.<br/><br/>
            마킹은 없으며, 박스 보관해왔습니다.
            오프라인 직거래는 강남·역삼 일대 가능합니다.
          </p>
        </div>
        <div data-card data-surface style={{ borderRadius: 12, border: `1px solid ${border}`, padding: 18, height: 'fit-content' }}>
          <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 13, letterSpacing: '0.1em', color: sub }}>SAFE TRADE</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8, color: fg }} data-text-main>안전 거래 7원칙</div>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['정품 인증 필수','앱 안에서만 결제','직거래 시 공공장소','7일 안전 환불','분쟁 조정 지원','24시간 모니터링','신원 인증 판매자']
              .map(t => (
                <li key={t} style={{ fontSize: 13, color: fg, display: 'flex', gap: 8 }} data-text-main>
                  <span style={{ color: '#FF2E4D', fontWeight: 800 }}>·</span> {t}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CommunityScreenD({ dark }) {
  const tabs = ['인기', '구단', '이적시장', '리뷰', '거래 후기'];
  const [t, setT] = useStateD('인기');
  const posts = [
    { id:'p1', tag:'이적시장', title:'손흥민 폼 회복했네요. 이번 시즌 기대됩니다',  author:'spurs_fan', time:'12분 전',  likes:64,  comments: 23, hot:true,  views: '1.2k' },
    { id:'p2', tag:'구단',     title:'KIA 우승 기념 유니폼 어디서 구하나요?',          author:'tigerking', time:'1시간 전', likes:21,  comments: 7,   views: '480'  },
    { id:'p3', tag:'리뷰',     title:'어센틱 vs 레플리카 솔직 비교 (사진 多)',         author:'jersey_lab',time:'3시간 전', likes:155, comments: 42, hot:true,  views: '4.6k' },
    { id:'p4', tag:'인기',     title:'중고 거래 사이즈 안 맞을 때 환불 가능?',        author:'newbie22',  time:'어제',     likes:18,  comments: 11,  views: '320'  },
    { id:'p5', tag:'거래 후기',title:'직거래 후 별점 5점 거래 후기 공유합니다',         author:'red_seven', time:'어제',     likes:32,  comments: 9,   views: '210'  },
    { id:'p6', tag:'구단',     title:'두산 베어스 23시즌 유니폼 실측 사이즈 정리',     author:'bears_archive',time:'2일 전',  likes:74,  comments: 18,  views: '1.8k' },
  ];
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,42,.10)';
  const fg = dark ? '#E8EEF4' : '#0D1B2A';
  const sub = dark ? '#8B9BB0' : '#5A6A7A';
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 64px', fontFamily: 'Pretendard' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 20 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, margin: 0, letterSpacing: '-0.02em' }} data-text-main>커뮤니티</h1>
        <span style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 13, letterSpacing: '0.1em', color: sub }}>FANS · TRANSFERS · REVIEWS</span>
        <Button kind="accent" size="md" style={{ marginLeft: 'auto' }}>글쓰기</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${border}`, marginBottom: 4 }}>
            {tabs.map(x => (
              <button key={x} onClick={() => setT(x)} style={{
                padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${t === x ? '#002147' : 'transparent'}`,
                color: t === x ? (dark?'#E8EEF4':'#002147') : sub,
                fontFamily: 'Pretendard', fontWeight: 700, fontSize: 14, letterSpacing:'-0.01em',
                marginBottom: -1,
              }}>{x}</button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Pretendard' }}>
            <thead>
              <tr style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 11, letterSpacing: '0.1em', color: sub }}>
                <th style={{ textAlign: 'left',  padding: '12px 8px', borderBottom: `1px solid ${border}`, fontWeight: 400, width: 96 }}>CATEGORY</th>
                <th style={{ textAlign: 'left',  padding: '12px 8px', borderBottom: `1px solid ${border}`, fontWeight: 400 }}>TITLE</th>
                <th style={{ textAlign: 'left',  padding: '12px 8px', borderBottom: `1px solid ${border}`, fontWeight: 400, width: 140 }}>AUTHOR</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: `1px solid ${border}`, fontWeight: 400, width: 90  }}>VIEWS</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: `1px solid ${border}`, fontWeight: 400, width: 90  }}>LIKES</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '14px 8px', borderBottom: `1px solid ${border}` }} data-divider><Badge kind="soft">{p.tag}</Badge></td>
                  <td style={{ padding: '14px 8px', borderBottom: `1px solid ${border}` }} data-divider>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: fg }} data-text-main>{p.title}</span>
                      {p.hot ? <Badge kind="accent" sport>HOT</Badge> : null}
                      <span style={{ color: '#FF2E4D', fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 12 }}>[{p.comments}]</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px', borderBottom: `1px solid ${border}`, fontSize: 13, color: sub }} data-divider>
                    <div>{p.author}</div>
                    <div style={{ fontSize: 11, color: '#9BAAB9' }}>{p.time}</div>
                  </td>
                  <td style={{ padding: '14px 8px', borderBottom: `1px solid ${border}`, textAlign: 'right', fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 13, color: sub }} data-divider>{p.views}</td>
                  <td style={{ padding: '14px 8px', borderBottom: `1px solid ${border}`, textAlign: 'right', fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 13, color: '#FF2E4D' }} data-divider>{p.likes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div data-card data-surface style={{ borderRadius: 12, border: `1px solid ${border}`, padding: 18 }}>
            <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 12, letterSpacing: '0.1em', color: sub, marginBottom: 12 }}>TRENDING NOW</div>
            {['#손흥민_복귀','#KIA_우승','#어센틱_레플리카','#사이즈_표','#정품_인증']
              .map((t,i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <span style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 16, color: i<3?'#FF2E4D':sub, width: 24 }}>{i+1}</span>
                  <span style={{ fontSize: 13, color: fg, fontWeight: 600 }} data-text-main>{t}</span>
                </div>
              ))}
          </div>
          <div data-card style={{ borderRadius: 12, padding: 20, background: 'linear-gradient(135deg,#002147,#1A3051)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px)' }}/>
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 12, letterSpacing: '0.1em', color: '#FFB800' }}>WEEKLY DRAFT</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6, lineHeight: 1.3 }}>오늘의 베스트<br/>거래 후기</div>
              <Button kind="accent" size="sm" style={{ marginTop: 14 }}>구경하기</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.RF.HomeScreenD = HomeScreenD;
window.RF.DetailScreenD = DetailScreenD;
window.RF.CommunityScreenD = CommunityScreenD;
