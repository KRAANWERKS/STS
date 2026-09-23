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

const reliabilityDetails = $$('.reliability-list details');
reliabilityDetails.forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    reliabilityDetails.forEach((other) => {
      if (other !== detail && other.open) other.open = false;
    });
  });
});

const outcomeCards = $('.outcome-card');
outcomeCards.forEach((card) => {
  const toggle = card.querySelector('.outcome-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const willOpen = !card.classList.contains('is-open');
    outcomeCards.forEach((other) => {
      other.classList.remove('is-open');
      const otherToggle = other.querySelector('.outcome-toggle');
      if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
    });
    if (willOpen) {
      card.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const heroFlow = $('.hero-company-flow');
const hero = $('.hero');
const heroStage = $('.hero-stage');
const heroVideo = $('#hero-video');
const heroZoomVideo = $('#hero-zoom-video');
const heroLines = $$('.hero h1 > *');
const motion = $('#motion');

let userPaused = false;
let flowVisible = true;
let scrollScheduled = false;
let zoomReady = false;
let zoomActive = false;
let zoomTargetTime = 0;
let zoomControlFrame = 0;
let zoomLastCorrectionAt = 0;
let lastScrollY = scrollY;
let lastScrollAt = performance.now();
let scrollVelocity = 0;
let scrollDirection = 0;
let scrollingUntil = 0;
let zoomPlaybackRate = .82;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0, edge1, value) => {
  const x = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
  return x * x * (3 - 2 * x);
};

function getHeroProgress() {
  const bounds = hero.getBoundingClientRect();
  const travel = Math.max(1, hero.offsetHeight - heroStage.offsetHeight);
  return clamp01(-bounds.top / travel);
}

function updateMotionLabel() {
  const paused = reducedMotion.matches || userPaused;
  motion.setAttribute('aria-pressed', String(paused));
  motion.textContent = paused ? 'Play motion ▷' : 'Pause motion Ⅱ';
}

async function syncHeroPlayback() {
  const blocked = reducedMotion.matches || userPaused || !flowVisible || document.hidden;
  const progress = getHeroProgress();

  if (heroVideo) {
    const shouldLoop = !blocked && progress < .16;
    if (shouldLoop) {
      try { await heroVideo.play(); } catch {}
    } else {
      heroVideo.pause();
    }
  }

  if (heroZoomVideo) {
    heroZoomVideo.pause();
  }

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

function getZoomProgress(heroProgress) {
  // Use nearly the full sticky travel so the final wide frame lands
  // as the Company section begins entering the viewport.
  return smoothstep(.02, .96, heroProgress);
}

function animateZoomPlayback(now = performance.now()) {
  const blocked = reducedMotion.matches || userPaused || !flowVisible || document.hidden;
  const activelyScrolling = now < scrollingUntil;

  if (zoomReady && heroZoomVideo) {
    if (blocked || !zoomActive) {
      if (!heroZoomVideo.paused) heroZoomVideo.pause();
    } else if (activelyScrolling && scrollDirection > 0) {
      // Smooth forward motion: no currentTime seeking at all.
      // Scroll only controls how long the clip plays and gently modulates its speed.
      const velocityBoost = Math.min(.28, Math.abs(scrollVelocity) * .12);
      const desiredRate = .78 + velocityBoost;
      zoomPlaybackRate += (desiredRate - zoomPlaybackRate) * .10;
      heroZoomVideo.playbackRate = Math.min(1.08, Math.max(.72, zoomPlaybackRate));

      if (heroZoomVideo.paused && !heroZoomVideo.ended) {
        heroZoomVideo.play().catch(() => {});
      }
    } else if (activelyScrolling && scrollDirection < 0) {
      if (!heroZoomVideo.paused) heroZoomVideo.pause();

      // Reverse scrolling cannot decode backward natively. Move backward only
      // occasionally, leaving normal downward playback completely seek-free.
      if (!heroZoomVideo.seeking && now - zoomLastCorrectionAt > 150) {
        const current = heroZoomVideo.currentTime || 0;
        const target = zoomTargetTime;
        const delta = target - current;
        if (delta < -.18) {
          heroZoomVideo.currentTime = Math.max(0, current + delta * .42);
          zoomLastCorrectionAt = now;
        }
      }
    } else if (!heroZoomVideo.paused) {
      // A generous grace period means wheel/trackpad event gaps do not cause
      // visible play/pause chatter.
      heroZoomVideo.pause();
    }
  }

  zoomControlFrame = requestAnimationFrame(animateZoomPlayback);
}

function renderScroll() {
  const progress = getHeroProgress();

  heroLines.forEach((line, index) => {
    const direction = index === 1 ? -1 : 1;
    line.style.transform = reducedMotion.matches ? '' : `translate3d(${direction * progress * 7}vw,${progress * 1.5}vh,0)`;
  });

  const replaceMix = reducedMotion.matches ? 0 : smoothstep(.025, .23, progress);
  heroFlow.style.setProperty('--primary-opacity', (1 - replaceMix).toFixed(4));
  heroFlow.style.setProperty('--zoom-opacity', replaceMix.toFixed(4));
  hero.style.setProperty('--hero-progress', progress.toFixed(4));

  const shouldUseZoom = zoomReady && !reducedMotion.matches && progress > .025;
  zoomActive = shouldUseZoom;

  if (zoomReady && heroZoomVideo?.duration && !reducedMotion.matches && !userPaused) {
    const scrub = getZoomProgress(progress);
    zoomTargetTime = scrub * Math.max(0, heroZoomVideo.duration - .04);
  }

  if (progress <= .012) {
    zoomActive = false;
    zoomTargetTime = 0;
    zoomPlaybackRate = .82;
    if (heroZoomVideo && !heroZoomVideo.seeking && heroZoomVideo.currentTime > .02) {
      try { heroZoomVideo.currentTime = 0; } catch {}
    }
    if (heroVideo?.paused && !userPaused && flowVisible && !document.hidden) syncHeroPlayback();
  } else if (progress >= .14 && !heroVideo?.paused) {
    heroVideo.pause();
    updateMotionLabel();
  }
}

addEventListener('scroll', () => {
  const now = performance.now();
  const y = scrollY;
  const dy = y - lastScrollY;
  const dt = Math.max(8, now - lastScrollAt);

  scrollVelocity = dy / dt;
  if (dy !== 0) scrollDirection = Math.sign(dy);
  lastScrollY = y;
  lastScrollAt = now;
  scrollingUntil = now + 520;

  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    renderScroll();
    scrollScheduled = false;
  });
}, { passive: true });

addEventListener('resize', () => requestAnimationFrame(renderScroll), { passive: true });

new IntersectionObserver((entries) => {
  flowVisible = entries[0]?.isIntersecting ?? true;
  syncHeroPlayback();
}, { threshold: .01 }).observe(heroFlow);

heroVideo?.addEventListener('loadeddata', () => {
  heroFlow.classList.add('media-ready');
  syncHeroPlayback();
}, { once: true });

function prepareZoomVideo() {
  if (!heroZoomVideo || !Number.isFinite(heroZoomVideo.duration) || heroZoomVideo.duration <= 0) return;
  zoomReady = true;
  heroZoomVideo.pause();
  zoomTargetTime = 0;
  try { heroZoomVideo.currentTime = 0; } catch {}
  renderScroll();
}

if (heroZoomVideo?.readyState >= 1) prepareZoomVideo();
else heroZoomVideo?.addEventListener('loadedmetadata', prepareZoomVideo, { once: true });

heroZoomVideo?.addEventListener('durationchange', () => {
  if (!zoomReady) prepareZoomVideo();
});

heroZoomVideo?.addEventListener('error', () => {
  zoomReady = false;
  zoomActive = false;
  heroFlow.style.setProperty('--zoom-opacity', '0');
  heroFlow.style.setProperty('--primary-opacity', '1');
}, { once: true });

heroVideo?.addEventListener('play', updateMotionLabel);
heroVideo?.addEventListener('pause', updateMotionLabel);
heroZoomVideo?.addEventListener('play', updateMotionLabel);
heroZoomVideo?.addEventListener('pause', updateMotionLabel);

requestAnimationFrame(() => {
  requestAnimationFrame(() => hero.classList.add('is-entered'));
});

renderScroll();
syncHeroPlayback();
zoomControlFrame = requestAnimationFrame(animateZoomPlayback);

addEventListener('pagehide', () => {
  if (zoomControlFrame) cancelAnimationFrame(zoomControlFrame);
}, { once:true });
