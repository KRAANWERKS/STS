const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const menu = $('.menu');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', open);
  $('#nav').classList.toggle('open', open);
});
$$('#nav a').forEach((link) => link.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', 'false');
  $('#nav').classList.remove('open');
}));
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') menu.click();
});
$('#year').textContent = new Date().getFullYear();

const phases = {
  initial: {
    status: 'INITIAL DELIVERY / 2 FLOATING CRANES',
    name: 'Heavy duty.\nReady for the long run.',
    description: 'MacGregor K5036 cranes paired with Nemag clamshell grabs form the initial platform for continuous offshore bulk handling.',
    crane: 'MacGregor K5036', grab: 'Nemag clamshell', capacity: '40,000 mtpd',
  },
  expansion: {
    status: 'PLANNED EXPANSION / 2 FLOATING CRANES',
    name: 'More capacity.\nThe same discipline.',
    description: 'Two planned E-Crane units add a target 60,000 mtpd, taking the combined fleet programme to up to 100,000 mtpd under suitable operating conditions.',
    crane: 'E-Crane 4000C EC28421', grab: 'J&B grab', capacity: '60,000 mtpd (planned)',
  },
};
const tabs = $$('[data-phase]');
function selectTab(tab) {
  tabs.forEach((item) => {
    item.setAttribute('aria-selected', item === tab);
    item.tabIndex = item === tab ? 0 : -1;
  });
  const phase = phases[tab.dataset.phase];
  $('#fleet-panel').setAttribute('aria-labelledby', tab.id);
  ['status', 'name', 'description'].forEach((key) => $(`#fleet-${key}`).textContent = phase[key]);
  ['crane', 'grab', 'capacity'].forEach((key) => $(`#${key}`).textContent = phase[key]);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + 1) % tabs.length;
    selectTab(tabs[target]);
    tabs[target].focus();
  });
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = $('.hero');
const heroVideo = $('#hero-video');
const heroLines = $$('.hero h1 > *');
const motion = $('#motion');

let userPaused = false;
let heroVisible = true;
let scrollScheduled = false;
let pointerFrame = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let pointerX = 0;
let pointerY = 0;

function updateMotionLabel() {
  const paused = reducedMotion.matches || userPaused || heroVideo?.paused;
  motion.setAttribute('aria-pressed', String(paused));
  motion.textContent = paused ? 'Play motion ▷' : 'Pause motion Ⅱ';
}

async function syncHeroPlayback() {
  if (!heroVideo) return;
  const shouldPause = reducedMotion.matches || userPaused || !heroVisible || document.hidden;
  if (shouldPause) {
    heroVideo.pause();
  } else {
    try { await heroVideo.play(); } catch {}
  }
  updateMotionLabel();
}

motion.addEventListener('click', () => {
  userPaused = !userPaused;
  syncHeroPlayback();
});

reducedMotion.addEventListener('change', () => {
  syncHeroPlayback();
});

document.addEventListener('visibilitychange', syncHeroPlayback);

if (!reducedMotion.matches) {
  const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    reveal.unobserve(entry.target);
  }), { threshold: .08 });
  $$('.section-top,.intro>div:last-child,.configurations>div,.promise-grid article,.reliability-title,.outcome-list article').forEach((element) => {
    element.classList.add('reveal');
    reveal.observe(element);
  });
}

function renderScroll() {
  const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
  heroLines.forEach((line, index) => {
    const direction = index === 1 ? -1 : 1;
    line.style.transform = reducedMotion.matches ? '' : `translate3d(${direction * progress * 9}vw,${progress * 2}vh,0)`;
  });
  hero.style.setProperty('--hero-progress', progress.toFixed(4));
  hero.style.setProperty('--hero-media-scale', (1.035 + progress * .025).toFixed(4));
}

addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    renderScroll();
    scrollScheduled = false;
  });
}, { passive: true });

function animatePointer() {
  pointerFrame = requestAnimationFrame(animatePointer);
  pointerX += (pointerTargetX - pointerX) * .055;
  pointerY += (pointerTargetY - pointerY) * .055;
  hero.style.setProperty('--hero-media-x', `${(pointerX * 14).toFixed(2)}px`);
  hero.style.setProperty('--hero-media-y', `${(pointerY * 9).toFixed(2)}px`);
}

if (!reducedMotion.matches && matchMedia('(pointer:fine)').matches) {
  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    pointerTargetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    pointerTargetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    pointerTargetX = 0;
    pointerTargetY = 0;
  });
  animatePointer();
}

new IntersectionObserver((entries) => {
  heroVisible = entries[0]?.isIntersecting ?? true;
  syncHeroPlayback();
}, { threshold: .01 }).observe(hero);

heroVideo?.addEventListener('loadeddata', () => {
  hero.classList.add('media-ready');
  syncHeroPlayback();
}, { once: true });

heroVideo?.addEventListener('play', updateMotionLabel);
heroVideo?.addEventListener('pause', updateMotionLabel);

requestAnimationFrame(() => {
  requestAnimationFrame(() => hero.classList.add('is-entered'));
});

renderScroll();
syncHeroPlayback();

addEventListener('pagehide', () => {
  if (pointerFrame) cancelAnimationFrame(pointerFrame);
}, { once: true });
