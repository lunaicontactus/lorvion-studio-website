
(() => {
  const body = document.body;
  const nav = document.querySelector('.site-nav');
  const menu = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceMQ.matches;

  // ── Garage-door opening intro (symbol only) ───────────────
  (function garageIntro(){
    const intro = document.getElementById('garageIntro');
    if(!intro || intro.dataset.init) return;
    intro.dataset.init = '1';
    const KEY = 'eunGarageIntroPlayed';
    const door = intro.querySelector('.garage-door');
    const skip = document.getElementById('garageSkip');
    let cleaned = false, opened = false;

    const cleanup = () => {
      if(cleaned) return; cleaned = true;
      body.classList.remove('garage-lock');
      intro.classList.add('garage-intro--done');
      if(intro.parentNode) intro.parentNode.removeChild(intro);
    };
    const open = () => {
      if(opened || cleaned) return; opened = true;
      intro.classList.add('garage-intro--open');
      let finished = false;
      const finish = () => { if(finished) return; finished = true; cleanup(); };
      if(door) door.addEventListener('transitionend', e => { if(e.propertyName === 'transform') finish(); });
      setTimeout(finish, 1500);
    };

    let played = false;
    try { played = sessionStorage.getItem(KEY) === 'true'; } catch(e){}
    if(played || reduce){
      try { sessionStorage.setItem(KEY, 'true'); } catch(e){}
      cleanup();
      return;
    }
    try { sessionStorage.setItem(KEY, 'true'); } catch(e){}
    body.classList.add('garage-lock');

    if(skip) skip.addEventListener('click', cleanup);
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && !cleaned) cleanup(); });

    const logo = intro.querySelector('.garage-door__logo');
    const start = Date.now(), minHold = 380;
    const ready = () => setTimeout(open, Math.max(0, minHold - (Date.now() - start)));
    if(logo && !logo.complete){
      logo.addEventListener('load', ready);
      logo.addEventListener('error', ready);
      setTimeout(ready, 1400);
    } else { ready(); }
    setTimeout(() => { open(); setTimeout(cleanup, 1500); }, 3500);   // hard safety net
  })();

  window.addEventListener('load', () => { body.classList.remove('loading'); });

  // ── Menu ──────────────────────────────────────────────────
  menu?.addEventListener('click', () => {
    menu.classList.toggle('open');
    navLinks?.classList.toggle('open');
    body.style.overflow = navLinks?.classList.contains('open') ? 'hidden' : '';
  });
  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu?.classList.remove('open'); navLinks.classList.remove('open'); body.style.overflow='';
  }));

  // ── Nav scrolled state ────────────────────────────────────
  const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // ── Scroll reveal (+ project shutter via .project.is-visible) ──
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, {threshold:.18});
  document.querySelectorAll('.reveal,.project,.manifesto-copy span').forEach(el => observer.observe(el));

  // ── Night sky: stars, constellations, earth + moon (one canvas, one rAF, one pointermove) ──
  (function starfield(){
    const canvas = document.getElementById('starfield');
    const hero = document.querySelector('.hero');
    if(!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    let finePointerActive = false;        // set by a real mouse/pen pointermove, not a one-shot media query
    let stars=[], w=0, h=0, dpr=Math.min(devicePixelRatio||1,2);
    // constellations only exist while the cursor is near stars
    let con=null, fading=null, lastPick={x:-9999,y:-9999};
    let rafId=null, heroVisible=true;
    let pointer={x:-9999,y:-9999,inside:false,lastMove:0};
    let heroRect=null;
    // ORBIT EARTH + MOON — the logo is the sun (shares this rAF + pointermove)
    const orbitEl=document.querySelector('.hero-orbit');
    const earth=orbitEl && orbitEl.querySelector('.hero-orbit__earth');
    const moon=earth && earth.querySelector('.hero-orbit__moon');
    const REST=-Math.PI/2;                       // resting position: top of ring
    let earthAngle=REST, earthTarget=REST, earthOpacity=0, orbitR=0;
    let moonPhase=Math.random()*6.28, moonR=14;  // moon's own slow turn around the earth
    // SHOOTING STAR — one at a time, rare, desktop only
    const allowShooting = !reduce && matchMedia('(hover:hover) and (pointer:fine)').matches;
    let shoot=null, nextShoot=0, logoBox=null, textSafe=null;
    const shortest=(a)=>Math.atan2(Math.sin(a),Math.cos(a));

    // star palette: silver-white, a little pale blue, a rare warm white
    const TINTS=[[214,220,236],[214,220,236],[205,216,240],[238,233,222]];

    const measureRect = ()=>{ heroRect = hero.getBoundingClientRect(); };

    // the logo + headline sit here; keep constellation lines out so text stays readable
    const safeZone = ()=>({x:w*0.25, y:h*0.15, w:w*0.5, h:h*0.7});
    const inSafeZone=(x,y)=>{ const s=safeZone(); return x>s.x && x<s.x+s.w && y>s.y && y<s.y+s.h; };

    // measure the logo and the text block in canvas-local coordinates
    const measureHeroBoxes=()=>{
      const hr=hero.getBoundingClientRect();
      const lk=document.querySelector('.hero-lockup');
      if(lk){
        const r=lk.getBoundingClientRect();
        logoBox={cx:r.left-hr.left+r.width/2, cy:r.top-hr.top+r.height/2,
                 core:Math.min(r.width,r.height)*0.42};
      }
      const els=[document.querySelector('.hero-headline'), document.querySelector('.hero-copy')].filter(Boolean);
      if(els.length){
        let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
        for(const el of els){
          const r=el.getBoundingClientRect();
          x0=Math.min(x0,r.left-hr.left); y0=Math.min(y0,r.top-hr.top);
          x1=Math.max(x1,r.right-hr.left); y1=Math.max(y1,r.bottom-hr.top);
        }
        textSafe={x:x0-14,y:y0-14,w:(x1-x0)+28,h:(y1-y0)+28};
      }
    };

    // a long straight diagonal: enters near a top corner, crosses the sky, leaves the far side
    const spawnShoot=(t)=>{
      if(!logoBox) measureHeroBoxes();
      const ceiling = textSafe ? textSafe.y-24 : h*0.68;     // stay above the headline/copy band
      for(let a=0;a<20;a++){
        const dirX=Math.random()<0.5?1:-1;                   // top-left→bottom-right or top-right→bottom-left
        const theta=(16+Math.random()*14)*Math.PI/180;       // 16-30 degrees: shallow, so it can cross
        const ux=dirX*Math.cos(theta), uy=Math.sin(theta);
        const x0=dirX>0 ? -90 : w+90;                        // start just off the entering corner
        const y0=-40+Math.random()*(h*0.24);
        const len=(w+180)/Math.cos(theta);                   // always traverses the full width
        const dx=ux*len, dy=uy*len;
        if(y0+dy > ceiling) continue;                        // would run into the text block
        shoot={t0:t, dur:800+Math.random()*600, x0, y0, dx, dy, ux, uy,
               tail:Math.max(220, Math.min(420, Math.min(w,h)*0.34)) + Math.random()*60};
        return;
      }
      nextShoot=t+2500;                                      // no clean line right now, retry soon
    };

    const makeStars=()=>{
      const count=Math.max(80, Math.min(230, Math.round(w*h/6200)));
      const lb=logoBox;
      stars=Array.from({length:count},()=>{
        // thin the field a little right behind the logo so the wordmark stays clean
        let bx=Math.random()*w, by=Math.random()*h;
        if(lb){
          for(let k=0;k<2;k++){
            if(Math.hypot(bx-lb.cx,by-lb.cy)>lb.core*1.15 || Math.random()>0.55) break;
            bx=Math.random()*w; by=Math.random()*h;
          }
        }
        const r=Math.random();
        const tier = r<0.06 ? 2 : (r<0.28 ? 1 : 0);          // 6% anchor, 22% mid, rest small
        const radius = tier===2 ? 1.8+Math.random()*0.6
                     : tier===1 ? 1.2+Math.random()*0.5
                                : 0.55+Math.random()*0.6;
        const alpha  = tier===2 ? 0.62+Math.random()*0.28
                     : tier===1 ? 0.46+Math.random()*0.26
                                : 0.30+Math.random()*0.28;
        const tw     = tier===2 ? 0.18+Math.random()*0.10
                     : tier===1 ? 0.14+Math.random()*0.08
                                : 0.10+Math.random()*0.08;
        return {
          baseX:bx, baseY:by, x:0, y:0, tier,
          radius, alpha, tw,
          sh: 0.03+Math.random()*0.04,                        // faint fast shimmer on top of the slow wave
          s: 0.00055+Math.random()*0.0011, phase:Math.random()*6.28,
          s2:0.0022+Math.random()*0.0026, phase2:Math.random()*6.28,
          tint:TINTS[(Math.random()*TINTS.length)|0]
        };
      });
      stars.forEach(st=>{ st.x=st.baseX; st.y=st.baseY; });
    };

    const resize=()=>{
      w=canvas.clientWidth; h=canvas.clientHeight;
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      measureHeroBoxes();      // logoBox first: star density uses it
      makeStars();
      measureRect();
      if(orbitEl) orbitR=orbitEl.getBoundingClientRect().width/2;     // ride exactly on the drawn ring
      if(earth){ const ew=earth.getBoundingClientRect().width||18; moonR=ew*0.72+5; }
      measureHeroBoxes();
      return w>0 && h>0;
    };

    const radiusFor = ()=> Math.max(140, Math.min(220, w*0.145));

    // Pick the stars around the cursor and wire them with a minimum spanning tree,
    // then order the edges outward from the anchor so the shape draws itself.
    const buildCursorConstellation=(px,py)=>{
      const R=radiusFor(), R2=R*R;
      const near=[];
      for(let i=0;i<stars.length;i++){
        const dx=stars[i].baseX-px, dy=stars[i].baseY-py, d2=dx*dx+dy*dy;
        if(d2>R2) continue;
        // closer and brighter stars win, but keep it cheap: no full sort of the field
        near.push({i, score:Math.sqrt(d2)-stars[i].alpha*46-stars[i].radius*14, d2});
      }
      if(near.length<3) return null;                      // nothing worth joining here
      near.sort((a,b)=>a.score-b.score);
      const take=Math.min(7, Math.max(3, near.length>=5?5+((Math.random()*3)|0):near.length));
      const idx=near.slice(0,take).map(n=>n.i);
      // anchor: the star closest to the cursor
      let anchor=idx[0], ad=Infinity;
      for(const i of idx){
        const d=Math.hypot(stars[i].baseX-px, stars[i].baseY-py);
        if(d<ad){ ad=d; anchor=i; }
      }
      // Prim's MST — n-1 edges, never a closed loop
      const inTree=[anchor], rest=idx.filter(i=>i!==anchor), tree=[];
      while(rest.length){
        let bi=0,bj=0,bd=Infinity;
        for(let a=0;a<inTree.length;a++) for(let b=0;b<rest.length;b++){
          const p1=stars[inTree[a]], q=stars[rest[b]];
          const d=Math.hypot(p1.baseX-q.baseX, p1.baseY-q.baseY);
          if(d<bd){ bd=d; bi=a; bj=b; }
        }
        tree.push([inTree[bi], rest[bj]]);
        inTree.push(rest[bj]); rest.splice(bj,1);
      }
      // order edges by depth from the anchor so lines run outward
      const adj=new Map(); idx.forEach(i=>adj.set(i,[]));
      tree.forEach(([a,b])=>{ adj.get(a).push([a,b]); adj.get(b).push([b,a]); });
      const seen=new Set([anchor]), queue=[anchor], edges=[];
      while(queue.length){
        const cur=queue.shift();
        for(const [from,to] of adj.get(cur)){
          if(seen.has(to)) continue;
          seen.add(to); edges.push([from,to]); queue.push(to);
        }
      }
      return {stars:idx, set:new Set(idx), edges, anchor, t0:performance.now()};
    };
    const starAlpha = (st,t)=> st.alpha + st.tw*Math.sin(t*st.s+st.phase) + st.sh*Math.sin(t*st.s2+st.phase2);

    // reduced motion: a still sky, no lines at all
    const drawStatic = ()=>{
      ctx.clearRect(0,0,w,h);
      for(const st of stars){
        const [r,g,b]=st.tint;
        ctx.beginPath(); ctx.fillStyle=`rgba(${r},${g},${b},${st.alpha})`;
        ctx.arc(st.baseX,st.baseY,st.radius,0,6.283); ctx.fill();
      }
    };

    const glint=(x,y,len,a)=>{
      ctx.lineWidth=0.7; ctx.strokeStyle=`rgba(233,238,248,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(x-len,y); ctx.lineTo(x+len,y);
      ctx.moveTo(x,y-len); ctx.lineTo(x,y+len);
      ctx.stroke();
    };

    const render = (t)=>{
      ctx.clearRect(0,0,w,h);

      // ── the only constellation is the one under the cursor ──
      const now=performance.now();
      if(fading && now-fading.fadeAt>240) fading=null;
      const selSet = (con && finePointerActive && pointer.inside) ? con.set : null;

      // ── stars ──
      for(let i=0;i<stars.length;i++){
        const st=stars[i];
        let tx=st.baseX, ty=st.baseY;
        if(selSet && selSet.has(i)){
          const dx=pointer.x-st.baseX, dy=pointer.y-st.baseY, d=Math.hypot(dx,dy)||1;
          tx=st.baseX+(dx/d)*4; ty=st.baseY+(dy/d)*4;   // max 4px toward pointer
        }
        st.x+=(tx-st.x)*0.12; st.y+=(ty-st.y)*0.12;

        let a=starAlpha(st,t);
        let rad=st.radius;
        if(selSet && selSet.has(i)){
          a+=0.24; rad+=(i===con.anchor?0.5:0.3);      // picked stars read a touch clearer
        }
        a=Math.max(0,Math.min(0.96,a));
        const [r,g,b]=st.tint;
        ctx.beginPath(); ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
        ctx.arc(st.x,st.y,rad,0,6.283); ctx.fill();
      }

      // ── draw the cursor constellation: edges appear outward from the anchor ──
      const drawCon=(c, mul)=>{
        if(!c || c.edges.length<2) return;
        const age=now-c.t0;
        const since=now-pointer.lastMove;
        // dwell makes the shape a little clearer, then it settles back
        let base=0.32;
        if(since>300) base=Math.min(0.5, 0.32+(since-300)/350*0.18);
        if(since>1100) base=Math.max(0.3, 0.5-(since-1100)/700*0.2);
        ctx.lineWidth=0.95; ctx.lineCap='round';
        for(let k=0;k<c.edges.length;k++){
          const e=c.edges[k];
          const p=(age-k*60)/200;                       // 60ms apart, 200ms each
          if(p<=0) continue;
          const grow=Math.min(1,p);
          const A=base*mul*Math.min(1,p*1.4);
          const s0=stars[e[0]], s1=stars[e[1]];
          ctx.strokeStyle=`rgba(223,231,247,${A.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(s0.x,s0.y);
          ctx.lineTo(s0.x+(s1.x-s0.x)*grow, s0.y+(s1.y-s0.y)*grow);
          ctx.stroke();
        }
        ctx.lineCap='butt';
        // the star nearest the cursor gets one short glint once the pointer settles
        if(mul>0.9 && since>=300 && since<1100){
          const n=stars[c.anchor];
          const g=Math.min(1,(since-300)/200)*Math.max(0,1-(since-800)/300);
          if(g>0.01) glint(n.x,n.y,6+n.radius*1.2,0.4*g);
        }
      };
      if(fading) drawCon(fading, Math.max(0,1-(now-fading.fadeAt)/240));
      if(selSet) drawCon(con,1);

      // ── shooting star: at most one, quiet, well under the logo in weight ──
      if(allowShooting){
        if(!nextShoot) nextShoot=t+5000+Math.random()*5000;
        if(!shoot && t>=nextShoot) spawnShoot(t);
        if(shoot){
          const p=(t-shoot.t0)/shoot.dur;
          if(p>=1){ shoot=null; nextShoot=t+8000+Math.random()*8000; }
          else{
            const x=shoot.x0+shoot.dx*p, y=shoot.y0+shoot.dy*p;
            const env=Math.sin(Math.PI*p);                  // in, peak, out
            // fade down over the logo core (and over the text, if a line ever clips it)
            let dim=1;
            if(logoBox){
              const d=Math.hypot(x-logoBox.cx, y-logoBox.cy);
              if(d<logoBox.core) dim=Math.min(dim, 0.42+0.58*(d/logoBox.core));
            }
            if(textSafe && x>textSafe.x && x<textSafe.x+textSafe.w && y>textSafe.y && y<textSafe.y+textSafe.h) dim=Math.min(dim,0.35);
            const a=0.58*env*dim;
            const len=shoot.tail*(0.55+0.45*env);           // stays long; only eases at the ends
            const tx=x-shoot.ux*len, ty=y-shoot.uy*len;
            const g=ctx.createLinearGradient(x,y,tx,ty);
            g.addColorStop(0,`rgba(232,239,252,${a.toFixed(3)})`);
            g.addColorStop(0.3,`rgba(228,236,251,${(a*0.62).toFixed(3)})`);
            g.addColorStop(0.7,`rgba(224,233,249,${(a*0.22).toFixed(3)})`);
            g.addColorStop(1,'rgba(224,233,249,0)');
            ctx.lineCap='round'; ctx.lineWidth=1.3; ctx.strokeStyle=g;
            ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(tx,ty); ctx.stroke();
            ctx.lineCap='butt';
            ctx.beginPath(); ctx.fillStyle=`rgba(242,247,255,${(a*0.9).toFixed(3)})`;
            ctx.arc(x,y,1.5,0,6.283); ctx.fill();
          }
        }
      }

      // ── ORBIT EARTH: rides the ring by pointer angle; the moon travels with it ──
      if(earth && finePointerActive){
        if(!orbitR && orbitEl) orbitR=orbitEl.getBoundingClientRect().width/2;
        const idle = performance.now()-pointer.lastMove > 850;
        const wantOpacity = pointer.inside ? (idle ? 0.68 : 0.96) : 0;
        earthTarget = pointer.inside ? earthTarget : REST;
        earthAngle += shortest(earthTarget-earthAngle)*0.1;
        earthOpacity += (wantOpacity-earthOpacity)*0.14;
        earth.style.opacity=earthOpacity.toFixed(3);
        earth.style.transform=
          `translate(-50%,-50%) translate(${(Math.cos(earthAngle)*orbitR).toFixed(2)}px, ${(Math.sin(earthAngle)*orbitR).toFixed(2)}px)`;
        if(moon && earthOpacity>0.01){
          moonPhase += 0.009;                    // one slow turn about every 12s
          moon.style.transform=
            `translate(-50%,-50%) translate(${(Math.cos(moonPhase)*moonR).toFixed(2)}px, ${(Math.sin(moonPhase)*moonR*0.62).toFixed(2)}px)`;
        }
      }
    };

    const draw = (t)=>{ render(t); rafId=requestAnimationFrame(draw); };

    const running=()=> heroVisible && !document.hidden;
    const stop=()=>{ if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; } };
    const startLoop=()=>{ if(rafId==null && running()) rafId=requestAnimationFrame(draw); };

    resize();
    if(reduce){ drawStatic(); return; }      // static sky, no motion, no magnet
    render(performance.now());               // paint the sky immediately, don't wait for the first frame

    hero.addEventListener('pointerleave', ()=>{
      pointer.inside=false;
      if(con){ fading={...con, fadeAt:performance.now()}; con=null; }
      lastPick={x:-9999,y:-9999};
    });
    hero.addEventListener('pointermove', e=>{
      if(e.pointerType==='touch') return;                       // touch never drives these effects
      if(e.pointerType==='mouse' || e.pointerType==='pen' || !e.pointerType) finePointerActive=true;
      if(!finePointerActive) return;
      if(!heroRect || !orbitR) resize();                        // first move recovers a stale measure
      if(!heroRect) return;
      pointer.x=e.clientX-heroRect.left; pointer.y=e.clientY-heroRect.top;
      pointer.inside=true; pointer.lastMove=performance.now();
      // only rebuild after a real move, so small jitter doesn't reshuffle the shape
      if(Math.hypot(pointer.x-lastPick.x, pointer.y-lastPick.y) > 26){
        lastPick={x:pointer.x, y:pointer.y};
        const next=buildCursorConstellation(pointer.x, pointer.y);
        if(next){
          if(con) fading={...con, fadeAt:performance.now()};
          con=next;
        } else if(con){
          fading={...con, fadeAt:performance.now()}; con=null;
        }
      }
      if(earth) earthTarget=Math.atan2(e.clientY-(heroRect.top+heroRect.height/2), e.clientX-(heroRect.left+heroRect.width/2));
    }, {passive:true});
    addEventListener('resize', ()=>{ resize(); render(performance.now()); }, {passive:true});
    addEventListener('orientationchange', ()=>{ resize(); render(performance.now()); }, {passive:true});
    addEventListener('load', ()=>{ resize(); render(performance.now()); });
    if(!w || !h) requestAnimationFrame(()=>{ resize(); render(performance.now()); });
    if(typeof ResizeObserver!=='undefined') new ResizeObserver(()=>{ resize(); render(performance.now()); }).observe(hero);
    addEventListener('scroll', measureRect, {passive:true});
    document.addEventListener('visibilitychange', ()=> document.hidden ? stop() : startLoop());
    const io = new IntersectionObserver(([e])=>{ heroVisible=e.isIntersecting; heroVisible ? startLoop() : stop(); }, {threshold:0});
    io.observe(hero);
    startLoop();
  })();

  // ── WORLD BLUEPRINT ───────────────────────────────────────
  (function blueprints(){
    const frames=[...document.querySelectorAll('.poster-frame')].filter(f=>f.querySelector('.blueprint'));
    if(!frames.length) return;
    const fineMQ=matchMedia('(hover: hover) and (pointer: fine)');

    // single source of truth: one blueprint at a time
    let cur={frame:null,panel:null,opener:null,mode:'idle',closeTimer:null};
    let openTimer=null;

    const setPreviewAria=(panel,opener)=>{      // non-modal: visual aid only
      panel.setAttribute('aria-hidden','true');
      panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      opener.setAttribute('aria-expanded','false');
    };
    const setPinnedAria=(panel,opener)=>{       // real dialog
      panel.removeAttribute('aria-hidden');
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
      opener.setAttribute('aria-expanded','true');
    };
    const restoreStaticAria=(panel)=>{          // back to markup defaults (hidden anyway)
      panel.removeAttribute('aria-hidden');
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
    };

    const close=(returnFocus)=>{
      if(cur.mode==='idle') return;
      const {panel,frame,opener,mode}=cur;
      clearTimeout(cur.closeTimer); clearTimeout(openTimer); openTimer=null;
      cur={frame:null,panel:null,opener:null,mode:'idle',closeTimer:null};
      panel.classList.remove('is-open','is-pinned');
      frame.classList.remove('is-bp-dim','is-bp-pinned');
      opener.setAttribute('aria-expanded','false');
      restoreStaticAria(panel);
      const hide=()=>{ if(!panel.classList.contains('is-open')) panel.setAttribute('hidden',''); panel.removeEventListener('transitionend',hide); };
      panel.addEventListener('transitionend',hide);
      setTimeout(hide,420);                      // fallback if transitionend never fires
      if(returnFocus && mode==='pinned') opener.focus();
    };

    const show=(frame,mode)=>{
      const panel=frame.querySelector('.blueprint');
      const opener=frame.querySelector('.blueprint-open');
      if(!panel||!opener) return;
      if(cur.frame && cur.frame!==frame) close(false);          // only one at a time
      clearTimeout(cur.closeTimer);
      const wasVisible = cur.frame===frame && cur.mode!=='idle';
      cur={frame,panel,opener,mode,closeTimer:null};
      if(!wasVisible){                                          // no re-animation on preview→pinned
        panel.removeAttribute('hidden');
        void panel.offsetWidth;                                 // reflow so the transition runs
        panel.classList.add('is-open');
        frame.classList.add('is-bp-dim');
      }
      if(mode==='pinned'){
        panel.classList.add('is-pinned');
        frame.classList.add('is-bp-pinned');
        setPinnedAria(panel,opener);
        (panel.querySelector('.blueprint__close')||panel).focus();
      }else{
        setPreviewAria(panel,opener);
      }
    };

    frames.forEach(frame=>{
      const opener=frame.querySelector('.blueprint-open');

      // desktop hover preview (fine pointers only, never on touch)
      frame.addEventListener('pointerenter',e=>{
        if(!fineMQ.matches||e.pointerType==='touch') return;
        if(cur.mode==='pinned') return;                         // a pinned panel wins
        clearTimeout(cur.closeTimer); cur.closeTimer=null;      // re-entry cancels pending close
        if(cur.frame===frame && cur.mode==='preview') return;
        clearTimeout(openTimer);
        openTimer=setTimeout(()=>show(frame,'preview'),80);
      });
      frame.addEventListener('pointerleave',e=>{
        if(!fineMQ.matches||e.pointerType==='touch') return;
        clearTimeout(openTimer); openTimer=null;
        if(cur.frame===frame && cur.mode==='preview'){
          cur.closeTimer=setTimeout(()=>close(false),170);
        }
      });

      // click / tap / Enter / Space → pin (or toggle-close when already pinned)
      opener.addEventListener('click',()=>{
        if(cur.frame===frame && cur.mode==='pinned'){ close(true); return; }
        show(frame,'pinned');
      });
    });

    document.querySelectorAll('.blueprint__close').forEach(btn=>btn.addEventListener('click',()=>close(true)));

    document.addEventListener('keydown',e=>{
      if(cur.mode!=='pinned') return;
      if(e.key==='Escape'){ close(true); return; }
      if(e.key==='Tab'){
        const f=[...cur.panel.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter(el=>!el.disabled && el.offsetParent!==null);
        if(!f.length) return;
        const first=f[0], last=f[f.length-1];
        if(!cur.panel.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
        else if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
    });

    // outside click closes only a pinned panel (the opening tap is guarded)
    document.addEventListener('click',e=>{
      if(cur.mode!=='pinned') return;
      if(cur.panel.contains(e.target)||cur.opener.contains(e.target)) return;
      close(false);
    });
  })();

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
