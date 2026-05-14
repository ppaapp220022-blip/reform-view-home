// Home, Detail, Community screens
const {useState: useStateScr} = React;
const {Badge, Button, PriceTag, I, GNB, IconBtn, JerseyThumb, ListingGrid} = window.RF;

const SAMPLE = [
  {
    id: 'a1',
    num: '07',
    title: '맨유 22-23 홈 어센틱',
    size: 'L',
    cond: 'A',
    location: '역삼동',
    price: 89000,
    likes: 38,
    chats: 4,
    hot: true,
    gradient: 'red'
  },
  {
    id: 'a2',
    num: '10',
    title: '손흥민 토트넘 어웨이',
    size: 'M',
    cond: 'S',
    location: '마포구',
    price: 145000,
    likes: 124,
    chats: 9,
    gradient: 'navy'
  },
  {
    id: 'a3',
    num: '23',
    title: '두산 베어스 홈 23',
    size: 'XL',
    cond: 'B',
    location: '잠실동',
    price: 52000,
    likes: 12,
    chats: 1,
    sold: true,
    gradient: 'dark'
  },
  {
    id: 'a4',
    num: '09',
    title: '레알 마드리드 홈 24',
    size: 'L',
    cond: 'S',
    location: '성동구',
    price: 128000,
    likes: 88,
    chats: 6,
    gradient: 'navy'
  },
  {
    id: 'a5',
    num: '11',
    title: '바르샤 어웨이 22-23',
    size: 'M',
    cond: 'A',
    location: '서초구',
    price: 74000,
    likes: 33,
    chats: 2,
    gradient: 'pitch'
  },
  {
    id: 'a6',
    num: '18',
    title: 'KIA 타이거즈 어센틱',
    size: 'L',
    cond: 'A',
    location: '광진구',
    price: 65000,
    likes: 21,
    chats: 3,
    hot: true,
    gradient: 'red'
  },
];

const CATEGORIES = ['전체', '야구', '축구', '농구', '배구', '럭비', 'e스포츠'];

function HomeScreen({liked, onLike, onSelect, dark}) {
  const [cat, setCat] = useStateScr('전체');
  return (
    <>
      <GNB dark={dark} right={<>
        <IconBtn><I.search/></IconBtn>
        <IconBtn badge><I.bell/></IconBtn>
      </>}/>
      <div style={{padding: '14px 16px 8px'}}>
        <div style={{
          background: 'linear-gradient(135deg,#002147 0%,#1A3051 100%)',
          borderRadius: 14, padding: '18px 18px 16px', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px)',
          }}/>
          <div style={{position: 'relative'}}>
            <div style={{
              fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
              fontSize: 13,
              letterSpacing: '0.1em',
              color: '#FF2E4D'
            }}>WEEKLY DRAFT
            </div>
            <div style={{
              fontFamily: 'Pretendard',
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1.2,
              marginTop: 4,
              letterSpacing: '-0.02em'
            }}>이번 주 가장 빠르게<br/>거래된 유니폼
            </div>
            <div style={{display: 'flex', gap: 8, marginTop: 14}}>
              <Badge kind="accent" sport>LIVE 12</Badge>
              <Badge kind="mvp" sport>MVP PICKS</Badge>
            </div>
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '4px 16px 12px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 9999,
            border: `1px solid ${cat === c ? '#002147' : 'rgba(13,27,42,.20)'}`,
            background: cat === c ? '#002147' : '#fff',
            color: cat === c ? '#fff' : '#0D1B2A',
            fontFamily: 'Pretendard', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>{c}</button>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 16px 12px'}}>
        <h2 style={{fontFamily: 'Pretendard', fontWeight: 700, fontSize: 18, margin: 0, letterSpacing: '-0.015em'}}>오늘의
          유니폼</h2>
        <button style={{
          background: 'none',
          border: 'none',
          color: '#5A6A7A',
          fontSize: 12,
          fontFamily: 'Pretendard',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <I.filter size={14}/> 필터
        </button>
      </div>
      <ListingGrid items={SAMPLE} liked={liked} onLike={onLike} onSelect={onSelect}/>
    </>
  );
}

function DetailScreen({item, liked, onLike, onBack, dark}) {
  return (
    <>
      <GNB dark={dark} onBack={onBack} title={null} right={<>
        <IconBtn onClick={() => onLike(item.id)}>
          <I.heart size={22} fill={liked}/>
        </IconBtn>
        <IconBtn><I.share/></IconBtn>
      </>}/>
      <div>
        <JerseyThumb num={item.num} hot={item.hot} sold={item.sold} gradient={item.gradient}/>
      </div>
      <div style={{padding: '14px 16px 8px', fontFamily: 'Pretendard'}}>
        <div style={{display: 'flex', gap: 6}}>
          <Badge kind="primary">정품 인증</Badge>
          <Badge kind="soft">컨디션 {item.cond}</Badge>
        </div>
        <h2 style={{
          fontFamily: 'Pretendard',
          fontWeight: 800,
          fontSize: 22,
          margin: '10px 0 4px',
          letterSpacing: '-0.02em',
          color: '#0D1B2A'
        }} data-text-main>
          {item.title}
        </h2>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, color: '#5A6A7A', fontSize: 12}} data-text-sub>
          <I.pin size={14}/> {item.location} · 3시간 전
        </div>
        <div style={{marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 10}}>
          <span style={{
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            fontSize: 36,
            color: '#002147',
            letterSpacing: '0.02em'
          }} data-price>
            ₩{item.price.toLocaleString()}
          </span>
          <Badge kind="accent" sport>−12%</Badge>
        </div>
      </div>
      <div style={{height: 8, background: '#EBEEF3', margin: '16px 0'}} data-surface-2/>
      <div style={{padding: '0 16px 16px', fontFamily: 'Pretendard'}}>
        <h3 style={{fontFamily: 'Pretendard', fontWeight: 700, fontSize: 15, margin: '0 0 8px'}}>상품 설명</h3>
        <p style={{fontSize: 14, color: '#0D1B2A', lineHeight: 1.65, margin: 0}} data-text-main>
          22-23 시즌 홈 유니폼. 어센틱 모델, 사이즈 {item.size}.
          한 시즌 응원용으로만 착용했고 세탁 완료 상태입니다.
          정품 인증 가능. 직거래 우선, 택배도 가능합니다.
        </p>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14}}>
          {[
            ['브랜드', 'Adidas'],
            ['시즌', '22-23'],
            ['컨디션', `${item.cond} · 매우 좋음`],
            ['사이즈', item.size],
          ].map(([k, v]) => (
            <div key={k} style={{background: '#F4F6F9', borderRadius: 8, padding: '10px 12px'}} data-surface-sunken>
              <div style={{fontSize: 11, color: '#5A6A7A'}}>{k}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: '#0D1B2A', marginTop: 2}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{height: 8, background: '#EBEEF3'}} data-surface-2/>
      <div style={{padding: '14px 16px 24px', display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 44, height: 44, borderRadius: 99, background: 'linear-gradient(135deg,#FF2E4D,#002147)'}}/>
        <div style={{flex: 1, fontFamily: 'Pretendard'}}>
          <div style={{fontWeight: 700, fontSize: 14}}>jersey_collector</div>
          <div style={{display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, color: '#5A6A7A'}}>
            <I.star size={12} fill/> 4.9 · 거래 87회
          </div>
        </div>
        <Button kind="ghost" size="sm">팔로우</Button>
      </div>
    </>
  );
}

function CommunityScreen({dark}) {
  const tabs = ['인기', '구단', '이적시장', '리뷰'];
  const [t, setT] = useStateScr('인기');
  const posts = [
    {
      id: 'p1',
      tag: '이적시장',
      title: '손흥민 폼 회복했네요. 이번 시즌 기대됩니다',
      author: 'spurs_fan',
      time: '12분 전',
      likes: 64,
      chats: 18,
      comments: '23',
      hot: true
    },
    {
      id: 'p2',
      tag: '구단',
      title: 'KIA 우승 기념 유니폼 어디서 구하나요?',
      author: 'tigerking',
      time: '1시간 전',
      likes: 21,
      chats: 7,
      comments: '7'
    },
    {
      id: 'p3',
      tag: '리뷰',
      title: '어센틱 vs 레플리카 솔직 비교',
      author: 'jersey_lab',
      time: '3시간 전',
      likes: 155,
      chats: 42,
      comments: '42',
      hot: true
    },
    {
      id: 'p4',
      tag: '인기',
      title: '중고 거래 사이즈 안 맞을 때 환불 가능?',
      author: 'newbie22',
      time: '어제',
      likes: 18,
      chats: 11,
      comments: '11'
    },
  ];
  return (
    <>
      <GNB dark={dark} title="커뮤니티" right={<><IconBtn><I.search/></IconBtn><IconBtn><I.bell/></IconBtn></>}/>
      <div style={{display: 'flex', gap: 4, padding: '10px 12px 4px', borderBottom: '1px solid rgba(13,27,42,.10)'}}
           data-divider>
        {tabs.map(x => (
          <button key={x} onClick={() => setT(x)} style={{
            flex: 1, padding: '10px 8px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `2px solid ${t === x ? '#002147' : 'transparent'}`,
            color: t === x ? '#002147' : '#5A6A7A',
            fontFamily: 'Pretendard', fontWeight: 700, fontSize: 14,
          }}>{x}</button>
        ))}
      </div>
      <div>
        {posts.map(p => (
          <div key={p.id} style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(13,27,42,.08)',
            fontFamily: 'Pretendard',
            cursor: 'pointer'
          }} data-divider>
            <div style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6}}>
              <Badge kind="soft">{p.tag}</Badge>
              {p.hot ? <Badge kind="accent" sport>HOT</Badge> : null}
            </div>
            <h3 style={{
              fontFamily: 'Pretendard',
              fontWeight: 700,
              fontSize: 15,
              margin: 0,
              color: '#0D1B2A',
              lineHeight: 1.4,
              letterSpacing: '-0.01em'
            }}>
              {p.title}
            </h3>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, color: '#5A6A7A', fontSize: 12}}>
              <span>{p.author}</span><span>·</span><span>{p.time}</span>
              <span style={{marginLeft: 'auto', display: 'inline-flex', gap: 10, color: '#9BAAB9'}}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 3}}><I.heart
                  size={12}/>{p.likes}</span>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 3}}><I.msg
                  size={12}/>{p.comments}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <button style={{
        position: 'absolute', right: 16, bottom: 80,
        width: 52, height: 52, borderRadius: 99,
        background: '#FF2E4D', color: '#fff', border: 'none', cursor: 'pointer',
        boxShadow: '0 6px 16px -2px rgba(255,46,77,.45)',
        display: 'grid', placeItems: 'center',
      }}>
        <I.plus size={22}/>
      </button>
    </>
  );
}

function ChatScreen({dark}) {
  const chats = [
    {id: 'c1', name: 'jersey_collector', last: '직거래 가능하세요?', time: '2분 전', unread: 2, item: '07'},
    {id: 'c2', name: 'spurs_kim', last: '네 사이즈 L 맞습니다', time: '14분 전', unread: 0, item: '10'},
    {id: 'c3', name: 'tigerking', last: '배송지 알려드릴게요', time: '1시간 전', unread: 0, item: '18'},
  ];
  return (
    <>
      <GNB dark={dark} title="채팅" right={<IconBtn><I.search/></IconBtn>}/>
      <div>
        {chats.map(c => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderBottom: '1px solid rgba(13,27,42,.08)', fontFamily: 'Pretendard', cursor: 'pointer',
          }} data-divider>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg,#1A3051,#002147)',
              display: 'grid', placeItems: 'center',
              fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
              fontSize: 22, color: 'rgba(255,255,255,.6)', letterSpacing: '0.04em',
              flexShrink: 0,
            }}>{c.item}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                <span style={{fontWeight: 700, fontSize: 14, color: '#0D1B2A'}}>{c.name}</span>
                <span style={{fontSize: 11, color: '#9BAAB9', marginLeft: 'auto'}}>{c.time}</span>
              </div>
              <div style={{
                fontSize: 13,
                color: '#5A6A7A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2
              }}>{c.last}</div>
            </div>
            {c.unread ? (
              <span style={{
                background: '#FF2E4D', color: '#fff', minWidth: 20, height: 20, borderRadius: 99,
                display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, padding: '0 6px',
                fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
              }}>{c.unread}</span>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

function MyScreen({dark}) {
  return (
    <>
      <GNB dark={dark} title="마이페이지"/>
      <div style={{padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Pretendard'}}>
        <div style={{width: 64, height: 64, borderRadius: 99, background: 'linear-gradient(135deg,#FF2E4D,#002147)'}}/>
        <div style={{flex: 1}}>
          <div style={{
            fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif",
            fontSize: 22,
            letterSpacing: '0.04em'
          }}>JERSEY_07
          </div>
          <div style={{
            fontSize: 12,
            color: '#5A6A7A',
            marginTop: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            <I.star size={12} fill/> 4.9 · 거래 23회
          </div>
        </div>
        <Button kind="ghost" size="sm">프로필 편집</Button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        borderTop: '1px solid rgba(13,27,42,.08)',
        borderBottom: '1px solid rgba(13,27,42,.08)'
      }} data-divider>
        {[['찜', '38'], ['판매', '12'], ['구매', '11']].map(([k, v]) => (
          <div key={k} style={{padding: '14px 0', textAlign: 'center', fontFamily: 'Pretendard'}}>
            <div style={{fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", fontSize: 24, color: '#002147'}}>{v}</div>
            <div style={{fontSize: 12, color: '#5A6A7A', marginTop: 2}}>{k}</div>
          </div>
        ))}
      </div>
      {[
        '판매 내역', '구매 내역', '찜 목록', '관심 구단 설정', '알림 설정', '고객센터',
      ].map(x => (
        <div key={x} style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(13,27,42,.06)',
          fontFamily: 'Pretendard',
          fontSize: 14,
          color: '#0D1B2A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center'
        }}>
          {x}
          <span style={{marginLeft: 'auto', color: '#9BAAB9'}}>›</span>
        </div>
      ))}
    </>
  );
}

window.RF.HomeScreen = HomeScreen;
window.RF.DetailScreen = DetailScreen;
window.RF.CommunityScreen = CommunityScreen;
window.RF.ChatScreen = ChatScreen;
window.RF.MyScreen = MyScreen;
