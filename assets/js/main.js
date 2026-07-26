
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
    let stars=[], constellations=[], w=0, h=0, dpr=Math.min(devicePixelRatio||1,2);
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
    const shortest=(a)=>Math.atan2(Math.sin(a),Math.cos(a));

    // star palette: silver-white, a little pale blue, a rare warm white
    const TINTS=[[214,220,236],[214,220,236],[205,216,240],[238,233,222]];

    const measureRect = ()=>{ heroRect = hero.getBoundingClientRect(); };

    // the logo + headline sit here; keep constellation lines out so text stays readable
    const safeZone = ()=>({x:w*0.25, y:h*0.15, w:w*0.5, h:h*0.7});
    const inSafeZone=(x,y)=>{ const s=safeZone(); return x>s.x && x<s.x+s.w && y>s.y && y<s.y+s.h; };

    const makeStars=()=>{
      const count=Math.max(80, Math.min(210, Math.round(w*h/6800)));
      stars=Array.from({length:count},()=>{
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
          baseX:Math.random()*w, baseY:Math.random()*h, x:0, y:0, tier, inCon:false, anchor:false,
          radius, alpha, tw,
          sh: 0.03+Math.random()*0.04,                        // faint fast shimmer on top of the slow wave
          s: 0.00055+Math.random()*0.0011, phase:Math.random()*6.28,
          s2:0.0022+Math.random()*0.0026, phase2:Math.random()*6.28,
          tint:TINTS[(Math.random()*TINTS.length)|0]
        };
      });
      stars.forEach(st=>{ st.x=st.baseX; st.y=st.baseY; });
    };

    // Build constellations as explicit node + edge sets, spread across six sectors,
    // each with its own shape (branching chain / open V / open polygon).
    const buildConstellations = ()=>{
      constellations=[];
      stars.forEach(st=>{ st.inCon=false; st.anchor=false; });
      if(stars.length<12) return;
      const target=Math.max(3, Math.min(14, Math.round(w/150)));
      const sectors=[];
      for(let cx=0;cx<2;cx++) for(let cy=0;cy<3;cy++)
        sectors.push({x:cx*w/2, y:cy*h/3, w:w/2, h:h/3});
      const used=new Set();
      const reach=Math.min(w,h)*0.22;

      for(let n=0;n<target;n++){
        const sec=sectors[n%sectors.length];
        // seed: a free star inside this sector and outside the logo safe zone
        let seed=-1;
        for(let t=0;t<60;t++){
          const i=(Math.random()*stars.length)|0;
          if(used.has(i)) continue;
          const st=stars[i];
          if(st.baseX<sec.x||st.baseX>sec.x+sec.w||st.baseY<sec.y||st.baseY>sec.y+sec.h) continue;
          if(inSafeZone(st.baseX,st.baseY)) continue;
          seed=i; break;
        }
        if(seed<0) continue;

        // gather 4-7 nearby free stars, none of them inside the safe zone
        const size=4+((Math.random()*4)|0);
        const nodes=[seed]; used.add(seed);
        while(nodes.length<size){
          let best=-1,bd=Infinity;
          for(let i=0;i<stars.length;i++){
            if(used.has(i)) continue;
            const st=stars[i];
            if(inSafeZone(st.baseX,st.baseY)) continue;
            let d=Infinity;
            for(const j of nodes) d=Math.min(d, Math.hypot(st.baseX-stars[j].baseX, st.baseY-stars[j].baseY));
            if(d<bd && d<reach){ bd=d; best=i; }
          }
          if(best<0) break;
          nodes.push(best); used.add(best);
        }
        if(nodes.length<4) continue;

        // order by angle around the centroid so the outline reads as a shape, not a zigzag
        const cx=nodes.reduce((a,i)=>a+stars[i].baseX,0)/nodes.length;
        const cy=nodes.reduce((a,i)=>a+stars[i].baseY,0)/nodes.length;
        nodes.sort((a,b)=>Math.atan2(stars[a].baseY-cy,stars[a].baseX-cx)-Math.atan2(stars[b].baseY-cy,stars[b].baseX-cx));

        const edges=[];
        const shape=n%3;
        if(shape===0){                                   // open path with one branch
          for(let k=0;k<nodes.length-1;k++) edges.push([k,k+1]);
          if(nodes.length>=5) edges.push([1, nodes.length-1]);
        } else if(shape===1){                            // gentle V / open chain
          for(let k=0;k<nodes.length-1;k++) edges.push([k,k+1]);
        } else {                                         // open polygon — deliberately not closed
          for(let k=0;k<nodes.length-1;k++) edges.push([k,k+1]);
          if(nodes.length>=6) edges.push([0,2]);
        }

        nodes.forEach(i=>{ stars[i].inCon=true; });
        // one clear anchor star per constellation
        let anchor=nodes[0];
        for(const i of nodes) if(stars[i].radius>stars[anchor].radius) anchor=i;
        stars[anchor].anchor=true;
        constellations.push({nodes, edges, phase:Math.random()*6.28});
      }
    };

    const resize=()=>{
      w=canvas.clientWidth; h=canvas.clientHeight;
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      makeStars();
      buildConstellations();
      measureRect();
      if(orbitEl) orbitR=orbitEl.getBoundingClientRect().width/2;     // ride exactly on the drawn ring
      if(earth){ const ew=earth.getBoundingClientRect().width||18; moonR=ew*0.72+5; }
      return w>0 && h>0;
    };

    const radiusFor = ()=> Math.max(130, Math.min(170, w*0.12));
    const starAlpha = (st,t)=> st.alpha + st.tw*Math.sin(t*st.s+st.phase) + st.sh*Math.sin(t*st.s2+st.phase2);

    const drawStatic = ()=>{
      ctx.clearRect(0,0,w,h);
      ctx.lineWidth=0.9; ctx.strokeStyle='rgba(198,211,235,.2)';
      for(const c of constellations){
        for(const [a,b] of c.edges){
          const p=stars[c.nodes[a]], q=stars[c.nodes[b]];
          ctx.beginPath(); ctx.moveTo(p.baseX,p.baseY); ctx.lineTo(q.baseX,q.baseY); ctx.stroke();
        }
      }
      for(const st of stars){
        const [r,g,b]=st.tint;
        const a=st.alpha+(st.inCon?0.15:0);
        ctx.beginPath(); ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
        ctx.arc(st.baseX,st.baseY,st.radius+(st.inCon?0.25:0),0,6.283); ctx.fill();
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

      // ── background constellations: readable, each breathing on its own phase ──
      for(const c of constellations){
        const a=0.20+0.06*Math.sin(t*0.00035+c.phase);      // ~0.14 – 0.26
        ctx.lineWidth=0.9; ctx.strokeStyle=`rgba(198,211,235,${a.toFixed(3)})`;
        ctx.beginPath();
        for(const [i,j] of c.edges){
          const p=stars[c.nodes[i]], q=stars[c.nodes[j]];
          ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
        }
        ctx.stroke();
      }

      // ── nearest-4 stars to the pointer (single pass, no full sort) ──
      let sel=[];
      if(finePointerActive && pointer.inside){
        const R2=radiusFor()**2; const best=[];
        for(let i=0;i<stars.length;i++){
          const dx=stars[i].baseX-pointer.x, dy=stars[i].baseY-pointer.y, d2=dx*dx+dy*dy;
          if(d2>R2) continue;
          if(best.length<4){ best.push({i,d2}); best.sort((a,b)=>a.d2-b.d2); }
          else if(d2<best[3].d2){ best[3]={i,d2}; best.sort((a,b)=>a.d2-b.d2); }
        }
        sel=best.map(b=>b.i);
      }
      const selSet = sel.length ? new Set(sel) : null;

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
        if(st.inCon){ a+=0.15; rad+=0.25; }
        if(st.anchor) rad=Math.max(rad,1.9);
        if(selSet && selSet.has(i)){ a+=0.26; rad+=0.4; }
        a=Math.max(0,Math.min(0.96,a));
        const [r,g,b]=st.tint;
        ctx.beginPath(); ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
        ctx.arc(st.x,st.y,rad,0,6.283); ctx.fill();

        // anchor stars flash a very short cross at the top of their own wave
        if(st.tier===2){
          const peak=Math.sin(t*st.s+st.phase);
          if(peak>0.93) glint(st.x, st.y, 4+st.radius*1.6, 0.25*(peak-0.93)/0.07);
        }
      }

      // ── pointer constellation: 3 shortest edges over the 4 picks (never a closed box) ──
      if(sel.length>=3){
        const since = performance.now()-pointer.lastMove;
        let lineA;
        if(since<300) lineA=0.34;
        else if(since<650) lineA=0.34+(since-300)/350*0.2;    // dwell → clearly readable (~0.54)
        else lineA=Math.max(0.3, 0.54-(since-650)/600*0.24);
        ctx.lineWidth=1.05; ctx.strokeStyle=`rgba(221,229,245,${lineA.toFixed(3)})`;
        // minimum spanning tree over the picks
        const inTree=[sel[0]], rest=sel.slice(1);
        ctx.beginPath();
        while(rest.length){
          let bi=0,bj=0,bd=Infinity;
          for(let a=0;a<inTree.length;a++) for(let b=0;b<rest.length;b++){
            const p=stars[inTree[a]], q=stars[rest[b]];
            const d=Math.hypot(p.x-q.x,p.y-q.y);
            if(d<bd){ bd=d; bi=a; bj=b; }
          }
          const p=stars[inTree[bi]], q=stars[rest[bj]];
          ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          inTree.push(rest[bj]); rest.splice(bj,1);
        }
        ctx.stroke();
        if(since>=300 && since<1150){
          const n=stars[sel[0]], g=Math.min(1,(since-300)/220)*Math.max(0,1-(since-750)/400);
          if(g>0.01) glint(n.x,n.y,5+n.radius*1.6,0.42*g);
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

    hero.addEventListener('pointerleave', ()=>{ pointer.inside=false; });
    hero.addEventListener('pointermove', e=>{
      if(e.pointerType==='touch') return;                       // touch never drives these effects
      if(e.pointerType==='mouse' || e.pointerType==='pen' || !e.pointerType) finePointerActive=true;
      if(!finePointerActive) return;
      if(!heroRect || !orbitR) resize();                        // first move recovers a stale measure
      if(!heroRect) return;
      pointer.x=e.clientX-heroRect.left; pointer.y=e.clientY-heroRect.top;
      pointer.inside=true; pointer.lastMove=performance.now();
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
