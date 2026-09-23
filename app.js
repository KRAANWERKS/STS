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

const outcomeCards = $$('.outcome-card');
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
const company = $('#company');
const companyPromise = $('.company-promise');
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
let zoomPlaybackRate = .98;
let zoomFrameDuration = 1 / 30;
let zoomLastMediaTime = null;

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

function getZoomEndTime() {
  if (!heroZoomVideo || !Number.isFinite(heroZoomVideo.duration) || heroZoomVideo.duration <= 0) return 0;

  // Keep the physical final frame out of view; stop on the second-to-last decoded frame.
  const frame = Math.max(1 / 60, zoomFrameDuration);
  return Math.max(0, heroZoomVideo.duration - frame * 2);
}

function getZoomProgress() {
  if (!company) return getHeroProgress();

  const heroTop = scrollY + hero.getBoundingClientRect().top;
  const companyTop = scrollY + company.getBoundingClientRect().top;

  // Complete the zoom before the Company panel visibly arrives.
  // By the time #company reaches the viewport, the clip is already on frame -2.
  const start = heroTop + Math.max(24, innerHeight * .035);
  const end = companyTop - innerHeight * .90;
  const raw = clamp01((scrollY - start) / Math.max(1, end - start));

  return raw * raw * (3 - 2 * raw);
}

function animateZoomPlayback(now = performance.now()) {
  const blocked = reducedMotion.matches || userPaused || !flowVisible || document.hidden;

  if (zoomReady && heroZoomVideo) {
    const endTime = getZoomEndTime();
    const frame = Math.max(1 / 60, zoomFrameDuration);
    const current = heroZoomVideo.currentTime || 0;
    const delta = zoomTargetTime - current;
    const zoomProgress = getZoomProgress();

    if (blocked || !zoomActive) {
      if (!heroZoomVideo.paused) heroZoomVideo.pause();
    } else if (zoomProgress >= .9985) {
      // Exact arrival state: second-to-last frame before Company takes over.
      if (!heroZoomVideo.paused) heroZoomVideo.pause();
      if (!heroZoomVideo.seeking && Math.abs(current - endTime) > frame * .15) {
        try { heroZoomVideo.currentTime = endTime; } catch {}
      }
    } else if (delta > frame * .55) {
      // Scroll down / target moves forward: use native decoding for smooth playback.
      const lagRatio = endTime > 0 ? Math.max(0, delta) / endTime : 0;
      const velocityBoost = Math.min(.38, Math.max(0, scrollVelocity) * .16);
      const catchupBoost = Math.min(.46, lagRatio * 1.45);
      const desiredRate = .98 + velocityBoost + catchupBoost;

      zoomPlaybackRate += (desiredRate - zoomPlaybackRate) * .12;
      heroZoomVideo.playbackRate = Math.min(1.55, Math.max(.90, zoomPlaybackRate));

      if (heroZoomVideo.paused && !heroZoomVideo.ended) {
        heroZoomVideo.play().catch(() => {});
      }
    } else if (delta < -frame * .55) {
      // Scroll up / target moves backward. Negative playbackRate is not reliable
      // in browsers, so rewind through small sequential frame-sized seeks.
      if (!heroZoomVideo.paused) heroZoomVideo.pause();

      if (!heroZoomVideo.seeking && now - zoomLastCorrectionAt > 24) {
        const distance = Math.abs(delta);
        const speed = Math.min(3.5, 1.1 + Math.abs(scrollVelocity) * 1.2);
        const step = Math.min(distance, Math.max(frame, Math.min(.085, frame * speed)));
        const nextTime = Math.max(zoomTargetTime, current - step);
        try { heroZoomVideo.currentTime = Math.max(0, nextTime); } catch {}
        zoomLastCorrectionAt = now;
      }
    } else if (!heroZoomVideo.paused) {
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

  const zoomProgress = getZoomProgress();
  const shouldUseZoom = zoomReady && !reducedMotion.matches && zoomProgress > .012;
  zoomActive = shouldUseZoom;

  if (zoomReady && heroZoomVideo?.duration && !reducedMotion.matches && !userPaused) {
    zoomTargetTime = zoomProgress * getZoomEndTime();
  }

  if (progress <= .012) {
    zoomActive = false;
    zoomTargetTime = 0;
    zoomPlaybackRate = .98;
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
  scrollingUntil = now + 360;

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

function trackZoomFrame(now, metadata) {
  if (Number.isFinite(metadata?.mediaTime)) {
    if (zoomLastMediaTime !== null) {
      const delta = Math.abs(metadata.mediaTime - zoomLastMediaTime);
      if (delta > .008 && delta < .10) {
        zoomFrameDuration += (delta - zoomFrameDuration) * .20;
      }
    }
    zoomLastMediaTime = metadata.mediaTime;
  }
  heroZoomVideo?.requestVideoFrameCallback?.(trackZoomFrame);
}

function prepareZoomVideo() {
  if (!heroZoomVideo || !Number.isFinite(heroZoomVideo.duration) || heroZoomVideo.duration <= 0) return;
  zoomReady = true;
  heroZoomVideo.pause();
  zoomTargetTime = 0;
  try { heroZoomVideo.currentTime = 0; } catch {}
  if (heroZoomVideo.requestVideoFrameCallback && zoomLastMediaTime === null) {
    heroZoomVideo.requestVideoFrameCallback(trackZoomFrame);
  }
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
