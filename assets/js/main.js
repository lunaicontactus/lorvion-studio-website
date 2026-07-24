
(() => {
  const body = document.body;
  const preloader = document.querySelector('.preloader');
  const nav = document.querySelector('.site-nav');
  const menu = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceMQ.matches;

  // ── Garage-door opening intro ─────────────────────────────
  (function garageIntro(){
    const intro = document.getElementById('garageIntro');
    if(!intro || intro.dataset.init) return;   // defensive + no double init
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
      if(door) door.addEventListener('transitionend', e => {
        if(e.propertyName === 'transform') finish();
      });
      setTimeout(finish, 1600);              // fallback if transitionend never fires
    };

    // Already seen this tab, or reduced motion → reveal immediately, no shutter.
    let played = false;
    try { played = sessionStorage.getItem(KEY) === 'true'; } catch(e){}
    if(played || reduce){
      try { sessionStorage.setItem(KEY, 'true'); } catch(e){}
      cleanup();
      return;
    }

    try { sessionStorage.setItem(KEY, 'true'); } catch(e){}
    body.classList.add('garage-lock');

    if(skip){
      skip.addEventListener('click', cleanup);            // SKIP = instant reveal
    }
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && !cleaned) cleanup();
    });

    // Open once the logo (or a short wait) is ready, with a short hold.
    const logo = intro.querySelector('.garage-door__logo');
    const start = Date.now(), minHold = 420;
    const ready = () => setTimeout(open, Math.max(0, minHold - (Date.now() - start)));
    if(logo && !logo.complete){
      logo.addEventListener('load', ready);
      logo.addEventListener('error', ready);
      setTimeout(ready, 1400);              // don't wait forever for the image
    } else {
      ready();
    }
    setTimeout(() => { open(); setTimeout(cleanup, 1600); }, 3500);  // hard safety net
  })();

  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader?.classList.add('done');
      body.classList.remove('loading');
    }, reduce ? 20 : 620);
  });

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

  // ── Scroll reveal ─────────────────────────────────────────
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        if(entry.target.classList.contains('project')){
          document.documentElement.style.setProperty('--active-accent', getComputedStyle(entry.target).getPropertyValue('--project-accent'));
        }
      }
    });
  }, {threshold:.18});
  document.querySelectorAll('.reveal,.project,.manifesto-copy span').forEach(el => observer.observe(el));

  // ── Background starfield (slow, paused when tab hidden) ────
  const canvas=document.getElementById('starfield');
  if(canvas && !reduce){
    const ctx=canvas.getContext('2d');
    let stars=[],w=0,h=0,dpr=Math.min(devicePixelRatio||1,2),sfRAF=null;
    const resize=()=>{
      w=canvas.clientWidth;h=canvas.clientHeight;
      canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(170,Math.floor(w*h/7500));
      stars=Array.from({length:count},()=>({
        x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.25+.15,
        a:Math.random()*.7+.15,s:Math.random()*.002+.0008,p:Math.random()*6.28
      }));
    };
    const draw=t=>{
      ctx.clearRect(0,0,w,h);
      stars.forEach(st=>{
        const a=st.a*(.58+.42*Math.sin(t*st.s+st.p));
        ctx.beginPath();ctx.fillStyle=`rgba(215,220,255,${a})`;ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();
      });
      sfRAF=requestAnimationFrame(draw);
    };
    const startSF=()=>{ if(sfRAF==null) sfRAF=requestAnimationFrame(draw); };
    const stopSF=()=>{ if(sfRAF!=null){ cancelAnimationFrame(sfRAF); sfRAF=null; } };
    resize();addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=> document.hidden ? stopSF() : startSF());
    startSF();
  }

  // ── ORBIT NAVIGATOR — probe rides the hero ring by pointer angle ──
  (function orbitNavigator(){
    const navigator = document.querySelector('.orbit-navigator');
    const hero = document.querySelector('.hero');
    const probe = navigator && navigator.querySelector('.orbit-navigator__probe');
    const status = document.querySelector('.orbit-status');
    if(!navigator || !hero || !probe) return;

    const fineMQ = matchMedia('(hover:hover) and (pointer:fine)');
    const REST = -Math.PI/2;                         // resting position: top of ring
    const nodes = [...navigator.querySelectorAll('.orbit-node')];
    const baseAngle = { lunai:-2.53, liminal:-0.61, wormup:0.96 }; // radians, spread around
    const signal = {
      lunai:   ['BAY 01','SIGNAL · LUNAI','AI MUSIC SYSTEM'],
      liminal: ['BAY 02','SIGNAL · LIMINAL','STORY WORLD'],
      wormup:  ['BAY 03','SIGNAL · WORM UP!','ACTION WORLD']
    };

    let cx=0, cy=0, R=0;
    let curAngle=REST, targetAngle=REST, lastPointerAngle=REST;
    let pointerInside=false, dockKey=null, locked=false;
    let rafId=null, heroVisible=true;

    const shortest = (a)=> Math.atan2(Math.sin(a), Math.cos(a));

    const placeProbe = (ang)=>{
      probe.style.transform =
        `translate(-50%,-50%) translate(${Math.cos(ang)*R}px, ${Math.sin(ang)*R}px)`;
    };
    const placeNode = (el, ang)=>{
      el.style.transform =
        `translate(-50%,-50%) translate(${Math.cos(ang)*R}px, ${Math.sin(ang)*R}px)`;
    };

    const measure = ()=>{
      const r = navigator.getBoundingClientRect();
      cx = r.left + r.width/2;
      cy = r.top  + r.height/2;
      R  = r.width/2;
      nodes.forEach(n => placeNode(n, baseAngle[n.dataset.project] ?? REST));
      placeProbe(curAngle);
    };

    const running = ()=> fineMQ.matches && heroVisible && !document.hidden;
    const loop = ()=>{
      const t = reduceMQ.matches ? 1 : 0.09;
      curAngle += shortest(targetAngle - curAngle) * t;
      placeProbe(curAngle);
      if(Math.abs(shortest(targetAngle - curAngle)) < 0.0008){
        curAngle = targetAngle; placeProbe(curAngle); rafId=null; return; // settled → stop
      }
      rafId = requestAnimationFrame(loop);
    };
    const kick = ()=>{ if(rafId==null && running()) rafId=requestAnimationFrame(loop); };
    const settleNow = ()=>{ curAngle=targetAngle; placeProbe(curAngle); };

    const setTarget = (ang)=>{
      targetAngle = ang;
      if(running()) kick(); else settleNow();  // if hero hidden, just snap invisibly
    };

    // Docking (hover / focus of a project)
    const setStatus = (key, lockedText)=>{
      if(!status) return;
      if(key && signal[key]){
        const [a,b,c] = signal[key];
        status.innerHTML =
          `<span class="orbit-status__bay">${a}</span>`+
          `<span class="orbit-status__sig">${lockedText || b}</span>`+
          `<span class="orbit-status__world">${c}</span>`;
        status.classList.add('is-on');
      } else {
        status.classList.remove('is-on');
      }
    };
    const dock = (key)=>{
      if(!(key in baseAngle)) return;
      dockKey = key;
      nodes.forEach(n => n.classList.toggle('is-active', n.dataset.project===key));
      if(fineMQ.matches) setTarget(baseAngle[key]);
      setStatus(key);
    };
    const undock = ()=>{
      if(locked) return;
      dockKey = null;
      nodes.forEach(n => n.classList.remove('is-active'));
      setStatus(null);
      setTarget(pointerInside && fineMQ.matches ? lastPointerAngle : REST);
    };

    // Pointer angle tracking (fine pointers only, not reduced-motion)
    if(!reduce){
      hero.addEventListener('pointerenter', e=>{
        if(!fineMQ.matches || e.pointerType==='touch') return;
        pointerInside = true; measure();
      });
      hero.addEventListener('pointerleave', ()=>{
        pointerInside = false;
        if(!dockKey && !locked) setTarget(REST);
      });
      hero.addEventListener('pointermove', e=>{
        if(!fineMQ.matches || e.pointerType==='touch' || dockKey || locked) return;
        pointerInside = true;
        lastPointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
        setTarget(lastPointerAngle);
      }, {passive:true});
    }

    // Wire project sections + links via data-project (no name string compares)
    document.querySelectorAll('[data-project]').forEach(el=>{
      const key = el.dataset.project;
      el.addEventListener('mouseenter', ()=>{ if(fineMQ.matches) dock(key); });
      el.addEventListener('mouseleave', ()=>{ if(fineMQ.matches) undock(); });
      el.addEventListener('focusin', ()=> dock(key));
      el.addEventListener('focusout', ()=> undock());
    });

    // Mechanical lock feedback on project-link click, then navigate
    document.querySelectorAll('a.project-link[data-project]').forEach(link=>{
      link.addEventListener('click', e=>{
        const key = link.dataset.project;
        const href = link.getAttribute('href');
        const newTab = link.target === '_blank' || link.hasAttribute('download');
        const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
        const keyboard = e.detail === 0;                 // activated via keyboard
        if(!href || newTab || modified || keyboard || reduce) return; // normal behaviour
        e.preventDefault();
        locked = true;
        dock(key);
        navigator.classList.add('is-locked');
        const node = nodes.find(n => n.dataset.project===key);
        node && node.classList.add('is-locked');
        if(fineMQ.matches) setTarget(baseAngle[key]);
        setStatus(key, 'SIGNAL LOCKED');
        setTimeout(()=>{ window.location.href = href; }, 150);
      });
    });

    // Pause / resume with hero visibility and tab visibility
    const io = new IntersectionObserver(([entry])=>{
      heroVisible = entry.isIntersecting;
      if(running()) kick();
      else if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; }
    }, {threshold:0});
    io.observe(hero);
    document.addEventListener('visibilitychange', ()=>{ if(running()) kick(); });

    addEventListener('resize', measure, {passive:true});
    addEventListener('orientationchange', measure, {passive:true});
    fineMQ.addEventListener?.('change', ()=>{ measure(); if(!fineMQ.matches){ curAngle=targetAngle=REST; placeProbe(REST); } });

    measure();
    placeProbe(REST);
  })();

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
