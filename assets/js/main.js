
(() => {
  const body = document.body;
  const preloader = document.querySelector('.preloader');
  const nav = document.querySelector('.site-nav');
  const menu = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  menu?.addEventListener('click', () => {
    menu.classList.toggle('open');
    navLinks?.classList.toggle('open');
    body.style.overflow = navLinks?.classList.contains('open') ? 'hidden' : '';
  });
  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu?.classList.remove('open'); navLinks.classList.remove('open'); body.style.overflow='';
  }));

  const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

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

  // Subtle poster tilt.
  document.querySelectorAll('.poster-frame').forEach(frame => {
    frame.addEventListener('pointermove', e => {
      if(reduce || innerWidth < 900) return;
      const r=frame.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      frame.style.transform=`rotateY(${x*7}deg) rotateX(${-y*5}deg) translateY(-4px)`;
    });
    frame.addEventListener('pointerleave', () => frame.style.transform='rotateY(0) rotateX(0)');
  });

  // Custom cursor.
  const cursor=document.querySelector('.cursor');
  const dot=document.querySelector('.cursor-dot');
  if(cursor && dot && matchMedia('(pointer:fine)').matches && !reduce){
    let mx=-100,my=-100,cx=-100,cy=-100;
    addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px'});
    const tick=()=>{cx+=(mx-cx)*.14;cy+=(my-cy)*.14;cursor.style.left=cx+'px';cursor.style.top=cy+'px';requestAnimationFrame(tick)};tick();
    document.querySelectorAll('a,button,.poster-frame').forEach(el=>{
      el.addEventListener('mouseenter',()=>cursor.classList.add('active'));
      el.addEventListener('mouseleave',()=>cursor.classList.remove('active'));
    });
  }

  // Premium micro-parallax for the hero logo.
  const heroLogo=document.querySelector('.hero-logo-stage');
  const heroSection=document.querySelector('.hero');
  if(heroLogo && heroSection && matchMedia('(pointer:fine)').matches && !reduce){
    heroSection.addEventListener('pointermove',e=>{
      const r=heroSection.getBoundingClientRect();
      const nx=((e.clientX-r.left)/r.width-.5);
      const ny=((e.clientY-r.top)/r.height-.5);
      heroLogo.style.setProperty('--logo-x',`${nx*5}px`);
      heroLogo.style.setProperty('--logo-y',`${ny*3}px`);
    },{passive:true});
    heroSection.addEventListener('pointerleave',()=>{
      heroLogo.style.setProperty('--logo-x','0px');
      heroLogo.style.setProperty('--logo-y','0px');
    });
  }

  // Starfield.
  const canvas=document.getElementById('starfield');
  if(canvas && !reduce){
    const ctx=canvas.getContext('2d');
    let stars=[],w=0,h=0,dpr=Math.min(devicePixelRatio||1,2);
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
      requestAnimationFrame(draw);
    };
    resize();addEventListener('resize',resize);requestAnimationFrame(draw);
  }


  // Refined starlight cursor trail — first screen only.
  const sparkleCanvas=document.getElementById('cursorSparkles');
  const hero=document.querySelector('.hero');
  if(sparkleCanvas && hero && matchMedia('(pointer:fine)').matches && !reduce){
    const sctx=sparkleCanvas.getContext('2d');
    let sw=0,sh=0,sdpr=Math.min(devicePixelRatio||1,2);
    let particles=[];
    let pointer={x:-999,y:-999,inside:false,lastX:-999,lastY:-999,lastSpawn:0};
    const palette=[
      [255,255,255],
      [210,214,255],
      [174,160,255],
      [170,226,239]
    ];
    const resizeSparkles=()=>{
      const r=hero.getBoundingClientRect();
      sw=Math.max(1,r.width); sh=Math.max(1,r.height);
      sparkleCanvas.width=Math.round(sw*sdpr);
      sparkleCanvas.height=Math.round(sh*sdpr);
      sctx.setTransform(sdpr,0,0,sdpr,0,0);
    };
    const localPoint=e=>{
      const r=hero.getBoundingClientRect();
      return {x:e.clientX-r.left,y:e.clientY-r.top};
    };
    const spawn=(x,y,force=1)=>{
      const color=palette[(Math.random()*palette.length)|0];
      const star=Math.random()<.24;
      particles.push({
        x:x+(Math.random()-.5)*3,
        y:y+(Math.random()-.5)*3,
        vx:(Math.random()-.5)*.22-force*.025,
        vy:(Math.random()-.5)*.22-.08,
        life:1,
        decay:.017+Math.random()*.014,
        size:star?1.55+Math.random()*1.15:.46+Math.random()*.78,
        color,
        star,
        spin:Math.random()*Math.PI,
        spinV:(Math.random()-.5)*.045
      });
      if(particles.length>145) particles.splice(0,particles.length-145);
    };
    hero.addEventListener('pointerenter',e=>{
      const p=localPoint(e); pointer.x=p.x; pointer.y=p.y; pointer.lastX=p.x; pointer.lastY=p.y; pointer.inside=true;
    });
    hero.addEventListener('pointerleave',()=>{pointer.inside=false});
    hero.addEventListener('pointermove',e=>{
      const p=localPoint(e);
      pointer.x=p.x; pointer.y=p.y;
      const dx=p.x-pointer.lastX,dy=p.y-pointer.lastY;
      const dist=Math.hypot(dx,dy);
      const now=performance.now();
      if(dist>4 || now-pointer.lastSpawn>34){
        const count=Math.min(5,Math.max(1,Math.floor(dist/13)));
        for(let i=0;i<count;i++){
          const t=(i+1)/(count+1);
          spawn(pointer.lastX+dx*t,pointer.lastY+dy*t,Math.min(2,dist/18));
        }
        if(Math.random()<.34) spawn(p.x,p.y,1.6);
        pointer.lastX=p.x; pointer.lastY=p.y; pointer.lastSpawn=now;
      }
    },{passive:true});
    const drawFourPoint=(ctx,x,y,r,rot)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0,-r*2.45);ctx.quadraticCurveTo(r*.2,-r*.35,r*.48,0);
      ctx.quadraticCurveTo(r*.2,r*.35,0,r*2.45);
      ctx.quadraticCurveTo(-r*.2,r*.35,-r*.48,0);
      ctx.quadraticCurveTo(-r*.2,-r*.35,0,-r*2.45);
      ctx.fill();ctx.restore();
    };
    let last=performance.now();
    const drawSparkles=now=>{
      const dt=Math.min(2.2,(now-last)/16.67);last=now;
      sctx.clearRect(0,0,sw,sh);
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.life-=p.decay*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=.0012*dt;p.spin+=p.spinV*dt;
        if(p.life<=0){particles.splice(i,1);continue}
        const [r,g,b]=p.color;
        const alpha=Math.max(0,p.life)*.76;
        sctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
        sctx.shadowColor=`rgba(${r},${g},${b},${alpha*.9})`;
        sctx.shadowBlur=p.star?10:6;
        if(p.star){
          drawFourPoint(sctx,p.x,p.y,p.size,p.spin);
        }else{
          sctx.beginPath();sctx.arc(p.x,p.y,p.size,0,Math.PI*2);sctx.fill();
        }
      }
      sctx.shadowBlur=0;
      requestAnimationFrame(drawSparkles);
    };
    resizeSparkles();
    addEventListener('resize',resizeSparkles,{passive:true});
    requestAnimationFrame(drawSparkles);
  }

  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
