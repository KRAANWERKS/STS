const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const menu = $('.menu');
const header = $('header');
const nav = $('#nav');
const hoverMenu = matchMedia('(hover:hover) and (pointer:fine)');

function setMenuOpen(open) {
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
}

menu.addEventListener('click', () => {
  setMenuOpen(menu.getAttribute('aria-expanded') !== 'true');
});

menu.addEventListener('focus', () => setMenuOpen(true));

if (hoverMenu.matches) {
  menu.addEventListener('pointerenter', () => setMenuOpen(true));
  nav.addEventListener('pointerenter', () => setMenuOpen(true));
  header.addEventListener('pointerleave', () => setMenuOpen(false));
}

$$('#nav a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuOpen(false);
    menu.focus();
  }
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
const heroFlow = $('.hero-company-flow');
const hero = $('.hero');
const heroStage = $('.hero-stage');
const company = $('#company');
const heroVideo = $('#hero-video');
const heroZoomVideo = $('#hero-zoom-video');
const heroLines = $$('.hero h1 > *');
const motion = $('#motion');

let userPaused = false;
let heroVisible = true;
let scrollScheduled = false;
let zoomReady = false;
let zoomTargetTime = 0;
let zoomFrame = 0;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0, edge1, value) => {
  const x = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
  return x * x * (3 - 2 * x);
};

function updateMotionLabel() {
  const paused = reducedMotion.matches || userPaused || heroVideo?.paused;
  motion.setAttribute('aria-pressed', String(paused));
  motion.textContent = paused ? 'Play motion ▷' : 'Pause motion Ⅱ';
}

async function syncHeroPlayback() {
  if (!heroVideo) return;
  const shouldPause = reducedMotion.matches || userPaused || !heroVisible || document.hidden;
  if (shouldPause) heroVideo.pause();
  else {
    try { await heroVideo.play(); } catch {}
  }
  if (heroZoomVideo) heroZoomVideo.pause();
  updateMotionLabel();
}

motion.addEventListener('click', () => {
  userPaused = !userPaused;
  syncHeroPlayback();
});

reducedMotion.addEventListener('change', () => {
  renderScroll();
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

function getHeroProgress() {
  const bounds = hero.getBoundingClientRect();
  const travel = Math.max(1, hero.offsetHeight - heroStage.offsetHeight);
  return clamp01(-bounds.top / travel);
}

function getZoomScrubProgress(heroProgress) {
  // Replace the opening hero clip almost immediately, then run the
  // complete zoom-out shot over a shorter scroll distance.
  return smoothstep(.035, .58, heroProgress);
}

function renderScroll() {
  const heroProgress = getHeroProgress();
  const companyBounds = company.getBoundingClientRect();
  const companyDepth = clamp01(-companyBounds.top / Math.max(1, innerHeight * .46));

  heroLines.forEach((line, index) => {
    const direction = index === 1 ? -1 : 1;
    line.style.transform = reducedMotion.matches ? '' : `translate3d(${direction * heroProgress * 7}vw,${heroProgress * 1.5}vh,0)`;
  });

  // The zoom-out clip replaces the opening video shortly after scroll begins.
  const replaceMix = smoothstep(.025, .18, heroProgress);
  const transitionOut = smoothstep(.16, .98, companyDepth);
  const transitionOpacity = reducedMotion.matches ? 0 : replaceMix * (1 - transitionOut);

  hero.style.setProperty('--hero-progress', heroProgress.toFixed(4));
  hero.style.setProperty('--primary-opacity', (1 - replaceMix).toFixed(4));
  heroFlow.style.setProperty('--transition-opacity', transitionOpacity.toFixed(4));

  if (zoomReady && heroZoomVideo?.duration && !reducedMotion.matches && !userPaused) {
    const scrub = getZoomScrubProgress(heroProgress);
    zoomTargetTime = scrub * Math.max(0, heroZoomVideo.duration - .04);
  }
}

addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    renderScroll();
    scrollScheduled = false;
  });
}, { passive: true });

addEventListener('resize', () => requestAnimationFrame(renderScroll), { passive: true });

new IntersectionObserver((entries) => {
  heroVisible = entries[0]?.isIntersecting ?? true;
  syncHeroPlayback();
}, { threshold: .01 }).observe(hero);

heroVideo?.addEventListener('loadeddata', () => {
  hero.classList.add('media-ready');
  syncHeroPlayback();
}, { once: true });

function prepareZoomVideo() {
  if (!heroZoomVideo || !Number.isFinite(heroZoomVideo.duration) || heroZoomVideo.duration <= 0) return;
  zoomReady = true;
  heroZoomVideo.pause();
  zoomTargetTime = heroZoomVideo.currentTime || 0;
  renderScroll();
}

function animateZoomScrub() {
  if (zoomReady && heroZoomVideo && !reducedMotion.matches && !userPaused && !document.hidden) {
    const current = heroZoomVideo.currentTime || 0;
    const delta = zoomTargetTime - current;

    // Ease toward the scroll target every animation frame. Large deltas catch
    // up faster; small deltas are damped to avoid visible frame stepping.
    if (Math.abs(delta) > .003 && !heroZoomVideo.seeking) {
      const ease = Math.abs(delta) > .45 ? .38 : Math.abs(delta) > .16 ? .28 : .20;
      const next = current + delta * ease;
      const maxTime = Math.max(0, heroZoomVideo.duration - .04);
      heroZoomVideo.currentTime = Math.min(maxTime, Math.max(0, next));
    }
  }
  zoomFrame = requestAnimationFrame(animateZoomScrub);
}

if (heroZoomVideo?.readyState >= 1) prepareZoomVideo();
else heroZoomVideo?.addEventListener('loadedmetadata', prepareZoomVideo, { once: true });

heroZoomVideo?.addEventListener('durationchange', () => {
  if (!zoomReady) prepareZoomVideo();
});

heroZoomVideo?.addEventListener('error', () => {
  zoomReady = false;
  heroFlow.style.setProperty('--transition-opacity', '0');
}, { once: true });

heroVideo?.addEventListener('play', updateMotionLabel);
heroVideo?.addEventListener('pause', updateMotionLabel);

requestAnimationFrame(() => {
  requestAnimationFrame(() => hero.classList.add('is-entered'));
});

renderScroll();
syncHeroPlayback();
zoomFrame = requestAnimationFrame(animateZoomScrub);

addEventListener('pagehide', () => {
  if (zoomFrame) cancelAnimationFrame(zoomFrame);
}, { once: true });
