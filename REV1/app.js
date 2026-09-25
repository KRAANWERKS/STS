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
let zoomFrameDuration = 1 / 30;
let zoomLastMediaTime = null;
let zoomSeekTarget = 0;
let zoomSeekBusy = false;

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

  // Keep the physical final frame out of view; finish on frame -2.
  const frame = Math.max(1 / 60, zoomFrameDuration);
  return Math.max(0, heroZoomVideo.duration - frame * 2);
}

function getZoomProgress() {
  if (!company) return getHeroProgress();

  const heroTop = scrollY + hero.getBoundingClientRect().top;
  const companyTop = scrollY + company.getBoundingClientRect().top;

  // Linear CodePen-style mapping: every scroll position maps to one video time.
  // The final mapped frame is reached just as #company starts entering the viewport.
  const start = heroTop + Math.max(24, innerHeight * .035);
  const end = companyTop - innerHeight * .96;
  return clamp01((scrollY - start) / Math.max(1, end - start));
}

function requestZoomSeek(targetTime) {
  if (!heroZoomVideo || !zoomReady) return;

  const endTime = getZoomEndTime();
  const frame = Math.max(1 / 60, zoomFrameDuration);
  zoomSeekTarget = Math.min(endTime, Math.max(0, targetTime));

  // Let the browser finish the current decode, then jump immediately to the
  // newest scroll target. This avoids piling up seeks that visibly stutter.
  if (zoomSeekBusy || heroZoomVideo.seeking) return;

  const delta = zoomSeekTarget - (heroZoomVideo.currentTime || 0);
  if (Math.abs(delta) <= frame * .20) return;

  zoomSeekBusy = true;
  try {
    heroZoomVideo.currentTime = zoomSeekTarget;
  } catch {
    zoomSeekBusy = false;
  }
}

function animateZoomPlayback() {
  // The zoom clip is always paused. Scroll position, not playback time,
  // is the clock, so up/down scrubbing is perfectly symmetric.
  if (heroZoomVideo && !heroZoomVideo.paused) heroZoomVideo.pause();
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
    requestZoomSeek(zoomTargetTime);
  }

  if (progress <= .012) {
    zoomActive = false;
    zoomTargetTime = 0;
    if (heroZoomVideo && heroZoomVideo.currentTime > .02) {
      requestZoomSeek(0);
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
  lastScrollY = y;
  lastScrollAt = now;

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

heroZoomVideo?.addEventListener('seeked', () => {
  zoomSeekBusy = false;

  if (!zoomReady || reducedMotion.matches || userPaused) return;

  const frame = Math.max(1 / 60, zoomFrameDuration);
  const current = heroZoomVideo.currentTime || 0;
  if (Math.abs(zoomSeekTarget - current) > frame * .20) {
    requestAnimationFrame(() => requestZoomSeek(zoomSeekTarget));
  }
});

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


/* REV1.4 — hover-driven Engineered Availability + equipment marquee + fixed-open HSE. */
const availabilityList = $('.reliability-list');
const availabilityItems = $$('.reliability-list details');
const availabilityHover = matchMedia('(hover:hover) and (pointer:fine)');

if (availabilityList && availabilityItems.length) {
  availabilityList.classList.add('show-equipment-marquee');
  const setEquipmentMarquee = (show) => {
    if (availabilityList.classList.contains('marquee-persistent')) {
      availabilityList.classList.add('show-equipment-marquee');
      return;
    }
    availabilityList.classList.toggle('show-equipment-marquee', show);
  };

  availabilityItems.forEach((item, index) => {
    item.addEventListener('pointerenter', () => {
      if (!availabilityHover.matches) return;

      availabilityItems.forEach((other) => {
        if (other !== item) other.removeAttribute('open');
      });
      item.setAttribute('open', '');
      setEquipmentMarquee(index === 0);
    });

    item.addEventListener('toggle', () => {
      if (!item.open && index === 0) setEquipmentMarquee(false);
      if (item.open && index !== 0) setEquipmentMarquee(false);
    });

    item.querySelector('summary')?.addEventListener('click', () => {
      requestAnimationFrame(() => {
        setEquipmentMarquee(index === 0 && item.open);
      });
    });
  });

  availabilityList.addEventListener('pointerleave', () => {
    if (availabilityHover.matches) setEquipmentMarquee(false);
  });
}

$$('.equipment-logo img').forEach((logo) => {
  logo.addEventListener('error', () => {
    logo.closest('.equipment-logo')?.classList.add('is-fallback');
  }, { once:true });
});

const staticHse = $('.hse-static');
if (staticHse) {
  staticHse.open = true;
  staticHse.querySelector('summary')?.addEventListener('click', (event) => {
    event.preventDefault();
  });
  staticHse.addEventListener('toggle', () => {
    if (!staticHse.open) staticHse.open = true;
  });
}
