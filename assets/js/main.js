
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

  // ── Starfield + CONSTELLATION MAGNET (one canvas, one rAF, one pointermove) ──
  (function starfield(){
    const canvas = document.getElementById('starfield');
    const hero = document.querySelector('.hero');
    if(!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
    let stars=[], w=0, h=0, dpr=Math.min(devicePixelRatio||1,2);
    let rafId=null, heroVisible=true;
    let pointer={x:-9999,y:-9999,inside:false,lastMove:0};
    let heroRect=null;

    const measureRect = ()=>{ heroRect = hero.getBoundingClientRect(); };
    const resize=()=>{
      w=canvas.clientWidth; h=canvas.clientHeight;
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(120, Math.max(70, Math.floor(w*h/13000)));   // ~90-120 desktop
      stars=Array.from({length:count},()=>{
        const bx=Math.random()*w, by=Math.random()*h, big=Math.random()<0.05;
        return {baseX:bx,baseY:by,x:bx,y:by,
          radius: big ? 0.85+Math.random()*0.25 : 0.2+Math.random()*0.6,
          alpha: 0.1+Math.random()*0.48, s:0.0004+Math.random()*0.0008, phase:Math.random()*6.28};
      });
      measureRect();
    };

    const radiusFor = ()=> Math.max(130, Math.min(170, w*0.12));
    const drawStatic = ()=>{
      ctx.clearRect(0,0,w,h);
      for(const st of stars){ ctx.beginPath(); ctx.fillStyle=`rgba(210,216,232,${st.alpha})`; ctx.arc(st.baseX,st.baseY,st.radius,0,6.283); ctx.fill(); }
    };
    const draw = (t)=>{
      ctx.clearRect(0,0,w,h);
      // nearest-3 stars to pointer (single pass, no full sort)
      let sel=[];
      if(fine && pointer.inside){
        const R2=radiusFor()**2; const best=[];
        for(let i=0;i<stars.length;i++){
          const dx=stars[i].baseX-pointer.x, dy=stars[i].baseY-pointer.y, d2=dx*dx+dy*dy;
          if(d2>R2) continue;
          if(best.length<3){ best.push({i,d2}); best.sort((a,b)=>a.d2-b.d2); }
          else if(d2<best[2].d2){ best[2]={i,d2}; best.sort((a,b)=>a.d2-b.d2); }
        }
        sel=best.map(b=>b.i);
      }
      const selSet = sel.length ? new Set(sel) : null;
      for(let i=0;i<stars.length;i++){
        const st=stars[i];
        let tx=st.baseX, ty=st.baseY;
        if(selSet && selSet.has(i)){
          const dx=pointer.x-st.baseX, dy=pointer.y-st.baseY, d=Math.hypot(dx,dy)||1;
          tx=st.baseX+(dx/d)*4; ty=st.baseY+(dy/d)*4;   // max 4px toward pointer
        }
        st.x+=(tx-st.x)*0.12; st.y+=(ty-st.y)*0.12;
        const a=st.alpha*(0.62+0.38*Math.sin(t*st.s+st.phase));
        ctx.beginPath(); ctx.fillStyle=`rgba(210,216,232,${a})`; ctx.arc(st.x,st.y,st.radius,0,6.283); ctx.fill();
      }
      if(sel.length===3){
        const since = performance.now()-pointer.lastMove;
        let lineA;
        if(since<280) lineA=0.11;
        else if(since<650) lineA=0.11+(since-280)/370*0.17;      // dwell → brighten (max ~0.28)
        else lineA=Math.max(0.10, 0.28-(since-650)/500*0.18);   // then fade back
        ctx.lineWidth=0.7; ctx.strokeStyle=`rgba(214,220,236,${lineA})`;
        ctx.beginPath();
        ctx.moveTo(stars[sel[0]].x,stars[sel[0]].y);
        ctx.lineTo(stars[sel[1]].x,stars[sel[1]].y);
        ctx.lineTo(stars[sel[2]].x,stars[sel[2]].y);
        ctx.stroke();
      }
      rafId=requestAnimationFrame(draw);
    };

    const running=()=> heroVisible && !document.hidden;
    const stop=()=>{ if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; } };
    const startLoop=()=>{ if(rafId==null && running()) rafId=requestAnimationFrame(draw); };

    resize();
    if(reduce){ drawStatic(); return; }      // static stars, no motion, no magnet

    if(fine){
      hero.addEventListener('pointerleave', ()=>{ pointer.inside=false; });
      hero.addEventListener('pointermove', e=>{
        if(e.pointerType==='touch' || !heroRect) return;
        pointer.x=e.clientX-heroRect.left; pointer.y=e.clientY-heroRect.top;
        pointer.inside=true; pointer.lastMove=performance.now();
      }, {passive:true});
    }
    addEventListener('resize', resize, {passive:true});
    addEventListener('orientationchange', resize, {passive:true});
    addEventListener('scroll', measureRect, {passive:true});
    document.addEventListener('visibilitychange', ()=> document.hidden ? stop() : startLoop());
    const io = new IntersectionObserver(([e])=>{ heroVisible=e.isIntersecting; heroVisible ? startLoop() : stop(); }, {threshold:0});
    io.observe(hero);
    startLoop();
  })();

  // ── WORLD BLUEPRINT ───────────────────────────────────────
  (function blueprints(){
    const openers=[...document.querySelectorAll('.blueprint-open')];
    if(!openers.length) return;
    let current=null;   // {panel, opener}

    const close=(returnFocus=true)=>{
      if(!current) return;
      const {panel,opener}=current; current=null;
      panel.classList.remove('is-open');
      opener.setAttribute('aria-expanded','false');
      const hide=()=>{ if(!panel.classList.contains('is-open')) panel.setAttribute('hidden',''); panel.removeEventListener('transitionend',hide); };
      panel.addEventListener('transitionend',hide);
      setTimeout(hide, 400);
      if(returnFocus) opener.focus();
    };
    const open=(opener)=>{
      const panel=document.getElementById(opener.getAttribute('aria-controls'));
      if(!panel) return;
      if(current) close(false);
      panel.removeAttribute('hidden');
      void panel.offsetWidth;               // reflow so the transition runs
      panel.classList.add('is-open');
      opener.setAttribute('aria-expanded','true');
      current={panel,opener};
      (panel.querySelector('.blueprint__close') || panel).focus();
    };

    openers.forEach(op => op.addEventListener('click', ()=>{
      const panel=document.getElementById(op.getAttribute('aria-controls'));
      (current && current.panel===panel) ? close() : open(op);
    }));
    document.querySelectorAll('.blueprint__close').forEach(btn => btn.addEventListener('click', ()=> close()));
    document.addEventListener('keydown', e=>{
      if(!current) return;
      if(e.key==='Escape'){ close(); return; }
      if(e.key==='Tab'){ e.preventDefault(); (current.panel.querySelector('.blueprint__close')||current.panel).focus(); } // simple trap
    });
    document.addEventListener('click', e=>{
      if(!current) return;
      if(current.panel.contains(e.target) || current.opener.contains(e.target)) return;
      close();
    });
  })();

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
