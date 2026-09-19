import { initOcean } from './ocean.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('[data-header]');
const progress = document.querySelector('.scroll-progress span');
const menuBtn = document.querySelector('.menu-button');
const menu = document.querySelector('[data-menu]');

document.querySelector('[data-year]').textContent = new Date().getFullYear();

function onScroll(){
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 30);
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? y / max : 0;
  progress.style.transform = `scaleX(${p})`;
}
addEventListener('scroll', onScroll, {passive:true});
onScroll();

menuBtn?.addEventListener('click', () => {
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  menuBtn.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
});
menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  menu.classList.remove('open');
  menuBtn.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}));

if(!reduced && 'IntersectionObserver' in window){
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'));
}

const fleetStory = document.querySelector('.fleet-story');
const fleetVisual = document.querySelector('.fleet-visual');
const techPoints = [...document.querySelectorAll('.tech-point')];

function fleetScroll(){
  if(!fleetStory || reduced) return;
  const r = fleetStory.getBoundingClientRect();
  const total = r.height - innerHeight;
  const p = Math.max(0, Math.min(1, -r.top / Math.max(total,1)));
  const scale = .88 + p * .15;
  const x = (p - .5) * -34;
  fleetVisual.style.transform = `translate3d(${x}px,${(p-.5)*14}px,0) scale(${scale})`;
  techPoints.forEach((el,i)=>{
    const local = Math.max(0, Math.min(1,(p - i*.13)*3.2));
    el.style.opacity = local;
  });
}
addEventListener('scroll', fleetScroll, {passive:true});
fleetScroll();

document.querySelectorAll('[data-counter]').forEach((el) => {
  const target = Number(el.dataset.counter);
  if(reduced){ el.textContent = target.toLocaleString('en-US'); return; }
  let done = false;
  const obs = new IntersectionObserver(([entry]) => {
    if(!entry.isIntersecting || done) return;
    done = true;
    const start = performance.now();
    const duration = 1300;
    const tick = (now) => {
      const t = Math.min(1,(now-start)/duration);
      const eased = 1 - Math.pow(1-t,4);
      el.textContent = Math.round(target*eased).toLocaleString('en-US');
      if(t<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    obs.disconnect();
  },{threshold:.35});
  obs.observe(el);
});

initOcean({
  canvas: document.getElementById('ocean-canvas'),
  reducedMotion: reduced
}).catch((err) => {
  console.warn('Ocean scene fallback active.', err);
});
