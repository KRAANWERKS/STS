const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('[data-header]');
const progress = document.querySelector('.scroll-progress span');
const menuBtn = document.querySelector('.menu-button');
const menu = document.querySelector('[data-menu]');
const hero = document.querySelector('.hero');
const fleetStory = document.querySelector('[data-fleet-story]');

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const clamp = (n,min=0,max=1)=>Math.max(min,Math.min(max,n));

function scrollState(){
  const y = scrollY;
  header?.classList.toggle('scrolled', y > 30);
  const docMax = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${docMax > 0 ? y/docMax : 0})`;

  if(hero){
    const r = hero.getBoundingClientRect();
    const range = Math.max(1, r.height - innerHeight);
    const p = clamp(-r.top / range);
    root.style.setProperty('--hero-p', p.toFixed(4));
  }
  if(fleetStory){
    const r = fleetStory.getBoundingClientRect();
    const range = Math.max(1, r.height - innerHeight);
    const p = clamp(-r.top / range);
    root.style.setProperty('--fleet-p', p.toFixed(4));
  }
}
addEventListener('scroll', scrollState, {passive:true});
addEventListener('resize', scrollState, {passive:true});
scrollState();

menuBtn?.addEventListener('click',()=>{
  const open=!menu.classList.contains('open');
  menu.classList.toggle('open',open);
  menuBtn.classList.toggle('open',open);
  menuBtn.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-hidden',String(!open));
  document.body.style.overflow=open?'hidden':'';
});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  menu.classList.remove('open');
  menuBtn.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}));

if(!reduced && 'IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
}else{
  document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-visible'));
}

document.querySelectorAll('[data-counter]').forEach(el=>{
  const target=Number(el.dataset.counter);
  if(reduced){el.textContent=target.toLocaleString('en-US');return}
  let ran=false;
  const obs=new IntersectionObserver(([entry])=>{
    if(!entry.isIntersecting||ran)return;
    ran=true;
    const start=performance.now(),duration=1250;
    const tick=now=>{
      const t=clamp((now-start)/duration);
      const eased=1-Math.pow(1-t,4);
      el.textContent=Math.round(target*eased).toLocaleString('en-US');
      if(t<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);obs.disconnect();
  },{threshold:.35});
  obs.observe(el);
});

/* Subtle pointer light: moves the illumination, never the vessel itself. */
const heroPin=document.querySelector('.hero-pin');
heroPin?.addEventListener('pointermove',e=>{
  if(reduced)return;
  const r=heroPin.getBoundingClientRect();
  const x=((e.clientX-r.left)/r.width)*100;
  const y=((e.clientY-r.top)/r.height)*100;
  heroPin.style.setProperty('--mx',x+'%');
  heroPin.style.setProperty('--my',y+'%');
},{passive:true});

/* Lightweight 2D sea glints + wake particles over the real photograph. */
function initWake(){
  const canvas=document.getElementById('wake-canvas');
  if(!canvas||reduced)return;
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;

  let w=0,h=0,dpr=1,last=performance.now(),raf=0;
  const particles=[];
  const glints=[];
  const mobile=matchMedia('(max-width: 700px)').matches;
  const maxParticles=mobile?42:82;
  const maxGlints=mobile?34:70;

  function resize(){
    const rect=canvas.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,1.6);
    const nw=Math.max(1,Math.round(rect.width*dpr));
    const nh=Math.max(1,Math.round(rect.height*dpr));
    if(canvas.width!==nw||canvas.height!==nh){
      canvas.width=nw;canvas.height=nh;w=rect.width;h=rect.height;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      glints.length=0;
      for(let i=0;i<maxGlints;i++){
        glints.push({
          x:Math.random()*w,
          y:h*(.62+Math.random()*.34),
          len:8+Math.random()*34,
          a:.03+Math.random()*.11,
          s:.05+Math.random()*.16,
          ph:Math.random()*Math.PI*2
        });
      }
    }
  }

  function spawn(){
    if(particles.length>=maxParticles)return;
    const p=Number(getComputedStyle(root).getPropertyValue('--hero-p'))||0;
    const count=p>.05?2:1;
    for(let i=0;i<count;i++){
      particles.push({
        x:w*(.22+Math.random()*.13),
        y:h*(.78+Math.random()*.09),
        vx:-(16+Math.random()*35),
        vy:4+Math.random()*12,
        life:0,
        ttl:1.3+Math.random()*2.1,
        len:10+Math.random()*34,
        a:.08+Math.random()*.18
      });
    }
  }

  function frame(now){
    resize();
    const dt=Math.min(.04,(now-last)/1000);last=now;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation='lighter';

    const t=now/1000;
    glints.forEach(g=>{
      g.x-=g.s;
      if(g.x<-g.len)g.x=w+g.len;
      const flick=.4+.6*Math.sin(t*1.1+g.ph);
      ctx.strokeStyle=`rgba(190,235,242,${g.a*Math.max(0,flick)})`;
      ctx.lineWidth=.7;
      ctx.beginPath();
      ctx.moveTo(g.x,g.y);
      ctx.lineTo(g.x+g.len,g.y);
      ctx.stroke();
    });

    spawn();
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const q=1-p.life/p.ttl;
      if(q<=0){particles.splice(i,1);continue}
      ctx.strokeStyle=`rgba(220,248,250,${p.a*q})`;
      ctx.lineWidth=.7+q*.7;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.len*(.6+q),p.y+2.5);
      ctx.stroke();
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}
initWake();
