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

if (hoverMenu.matches) {
  menu.addEventListener('pointerenter', () => setMenuOpen(true));
  nav.addEventListener('pointerenter', () => setMenuOpen(true));
  header.addEventListener('pointerleave', () => setMenuOpen(false));
}

const navLinks = [...document.querySelectorAll('#nav a[href^="#"]')];
const navSections = navLinks
  .map((link) => {
    const id = link.getAttribute('href')?.slice(1);
    const section = id ? document.getElementById(id) : null;
    return section ? { link, section, id } : null;
  })
  .filter(Boolean);

function setActiveNav(id) {
  navSections.forEach(({ link, id: sectionId }) => {
    const active = sectionId === id;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function getActiveSectionId() {
  const marker = scrollY + header.offsetHeight + Math.min(160, innerHeight * .22);
  let active = '';

  navSections.forEach(({ section, id }) => {
    const top = scrollY + section.getBoundingClientRect().top;
    if (top <= marker) active = id;
  });

  const nearBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 8;
  if (nearBottom && navSections.length) active = navSections[navSections.length - 1].id;

  return active;
}

let navSpyScheduled = false;
function syncActiveNav() {
  setActiveNav(getActiveSectionId());
  navSpyScheduled = false;
}

function scheduleActiveNavSync() {
  if (navSpyScheduled) return;
  navSpyScheduled = true;
  requestAnimationFrame(syncActiveNav);
}

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href');
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return;

    event.preventDefault();

    const sectionId = hash.slice(1);
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    setMenuOpen(false);
    setActiveNav(sectionId);

    // Let the mobile menu fully leave the layout before resolving the section position.
    // scroll-margin-top on each section handles the fixed header offset reliably.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({
          block: 'start',
          behavior
        });
        history.replaceState(null, '', hash);
      });
    });
  });
});

addEventListener('scroll', scheduleActiveNavSync, { passive: true });
addEventListener('resize', scheduleActiveNavSync, { passive: true });
addEventListener('hashchange', scheduleActiveNavSync);

addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenuOpen(false);
    menu.focus();
  }
});
$('#year').textContent = new Date().getFullYear();
requestAnimationFrame(syncActiveNav);

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
const mobileHero = matchMedia('(max-width: 760px)');
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
let zoomSeekStartedAt = 0;
let zoomLoadRequested = false;

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
    const shouldLoop = !blocked && !mobileHero.matches && progress < .16;
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
  renderScroll();
});

reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) requestZoomLoad();
  renderScroll();
  syncHeroPlayback();
});

mobileHero.addEventListener('change', ({ matches }) => {
  heroFlow.style.setProperty('--primary-opacity', '1');
  heroFlow.style.setProperty('--zoom-opacity', '0');
  heroZoomVideo?.pause();
  if (!matches) requestZoomLoad();
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

  // Recover if a browser/host combination leaves a seek lock hanging.
  if (zoomSeekBusy && performance.now() - zoomSeekStartedAt > 900) {
    zoomSeekBusy = false;
  }

  // Let the browser finish the current decode, then jump immediately to the
  // newest scroll target. This avoids piling up seeks that visibly stutter.
  if (zoomSeekBusy || heroZoomVideo.seeking) return;

  const delta = zoomSeekTarget - (heroZoomVideo.currentTime || 0);
  if (Math.abs(delta) <= frame * .20) return;

  zoomSeekBusy = true;
  zoomSeekStartedAt = performance.now();
  try {
    heroZoomVideo.currentTime = zoomSeekTarget;
  } catch {
    zoomSeekBusy = false;
    zoomSeekStartedAt = 0;
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

  /* Mobile uses only the static/primary hero treatment. */
  if (mobileHero.matches) {
    heroLines.forEach((line) => { line.style.transform = ''; });
    heroFlow.style.setProperty('--primary-opacity', '1');
    heroFlow.style.setProperty('--zoom-opacity', '0');
    hero.style.setProperty('--hero-progress', '0');
    zoomActive = false;
    heroZoomVideo?.pause();
    return;
  }

  heroLines.forEach((line, index) => {
    const direction = index === 1 ? -1 : 1;
    line.style.transform = reducedMotion.matches ? '' : `translate3d(${direction * progress * 7}vw,${progress * 1.5}vh,0)`;
  });

  // Do not fade away the primary hero until the zoom clip has decoded data.
  const canShowZoom = Boolean(
    zoomReady &&
    heroZoomVideo &&
    heroZoomVideo.readyState >= 2 &&
    !reducedMotion.matches &&
    !userPaused
  );
  const replaceMix = canShowZoom ? smoothstep(.025, .23, progress) : 0;
  heroFlow.style.setProperty('--primary-opacity', (1 - replaceMix).toFixed(4));
  heroFlow.style.setProperty('--zoom-opacity', replaceMix.toFixed(4));
  hero.style.setProperty('--hero-progress', progress.toFixed(4));

  const zoomProgress = getZoomProgress();
  const shouldUseZoom = canShowZoom && zoomProgress > .012;
  zoomActive = shouldUseZoom;

  if (canShowZoom && heroZoomVideo?.duration) {
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
  zoomSeekStartedAt = 0;

  if (!zoomReady || reducedMotion.matches || userPaused) return;

  const frame = Math.max(1 / 60, zoomFrameDuration);
  const current = heroZoomVideo.currentTime || 0;
  if (Math.abs(zoomSeekTarget - current) > frame * .20) {
    requestAnimationFrame(() => requestZoomSeek(zoomSeekTarget));
  }
});

function prepareZoomVideo() {
  if (mobileHero.matches) return;
  if (!heroZoomVideo || heroZoomVideo.readyState < 2) return;
  if (!Number.isFinite(heroZoomVideo.duration) || heroZoomVideo.duration <= 0) return;

  zoomReady = true;
  zoomSeekBusy = false;
  zoomSeekStartedAt = 0;
  heroZoomVideo.pause();
  zoomTargetTime = 0;
  try { heroZoomVideo.currentTime = 0; } catch {}
  if (heroZoomVideo.requestVideoFrameCallback && zoomLastMediaTime === null) {
    heroZoomVideo.requestVideoFrameCallback(trackZoomFrame);
  }
  renderScroll();
}

function requestZoomLoad() {
  if (mobileHero.matches || reducedMotion.matches || !heroZoomVideo) return;

  // This clip is small enough to preload fully on desktop. Metadata-only loading
  // proved unreliable on some production hosts when the first action is a seek.
  heroZoomVideo.preload = 'auto';

  if (heroZoomVideo.readyState >= 2) {
    prepareZoomVideo();
    return;
  }

  if (!zoomLoadRequested) {
    zoomLoadRequested = true;
    try { heroZoomVideo.load(); } catch {}
  }
}

if (heroZoomVideo?.readyState >= 2) prepareZoomVideo();
else {
  heroZoomVideo?.addEventListener('loadeddata', prepareZoomVideo, { once: true });
  heroZoomVideo?.addEventListener('canplay', prepareZoomVideo, { once: true });
}

heroZoomVideo?.addEventListener('durationchange', () => {
  if (!zoomReady && heroZoomVideo.readyState >= 2) prepareZoomVideo();
});

heroZoomVideo?.addEventListener('stalled', () => {
  zoomSeekBusy = false;
  zoomSeekStartedAt = 0;
});

heroZoomVideo?.addEventListener('error', () => {
  zoomReady = false;
  zoomActive = false;
  zoomSeekBusy = false;
  zoomSeekStartedAt = 0;
  heroFlow.style.setProperty('--zoom-opacity', '0');
  heroFlow.style.setProperty('--primary-opacity', '1');
}, { once: true });

if (!mobileHero.matches && !reducedMotion.matches) requestZoomLoad();

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


/* REV1.6 — Engineered Availability hover/click state + shared showcase + fixed-open HSE. */
const availabilityList = $('.reliability-list');
const availabilityItems = $$('.reliability-list details');
const availabilityShowcasePanels = $$('.reliability-showcase-panel');
const availabilityHover = matchMedia('(hover:hover) and (pointer:fine)');

function setAvailabilityShowcase(name = 'equipment') {
  availabilityShowcasePanels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.showcasePanel === name);
  });
  $('.reliability-showcase')?.setAttribute('data-active-showcase', name);
}

function activateAvailabilityItem(item) {
  if (!item) return;
  availabilityItems.forEach((other) => {
    if (other !== item) other.removeAttribute('open');
  });
  item.setAttribute('open', '');
  setAvailabilityShowcase(item.dataset.showcase || 'equipment');
}

if (availabilityList && availabilityItems.length) {
  const defaultItem = availabilityItems[0];
  activateAvailabilityItem(defaultItem);

  availabilityItems.forEach((item) => {
    item.addEventListener('pointerenter', () => {
      if (!availabilityHover.matches) return;
      activateAvailabilityItem(item);
    });

    item.querySelector('summary')?.addEventListener('click', () => {
      requestAnimationFrame(() => {
        if (item.open) setAvailabilityShowcase(item.dataset.showcase || 'equipment');
      });
    });
  });

  availabilityList.addEventListener('pointerleave', () => {
    if (!availabilityHover.matches) return;
    activateAvailabilityItem(defaultItem);
  });
}

$$('.equipment-logo img').forEach((logo) => {
  logo.addEventListener('error', () => {
    logo.closest('.equipment-logo')?.classList.add('is-fallback');
  }, { once:true });
});

const staticHse = $('.hse-static');
if (staticHse) {
  // Keep the HSE framework collapsed on initial load on every viewport.
  // Native <details> behavior handles open/close clicks accessibly.
  staticHse.open = false;
}

/* REV1.19 — seamless desktop marquee with an accessibility-hidden runtime duplicate. */
const equipmentMarquee = $('.equipment-marquee');
const equipmentMarqueeTrack = $('.equipment-marquee-track');
const equipmentMarqueeSet = $('.equipment-logo-set');
const desktopMarquee = matchMedia('(min-width: 761px)');
let equipmentMarqueeClone = null;

function ensureEquipmentMarqueeClone() {
  if (!equipmentMarqueeTrack || !equipmentMarqueeSet) return;

  if (desktopMarquee.matches) {
    if (!equipmentMarqueeClone || !equipmentMarqueeClone.isConnected) {
      equipmentMarqueeClone = equipmentMarqueeSet.cloneNode(true);
      equipmentMarqueeClone.setAttribute('aria-hidden', 'true');
      equipmentMarqueeTrack.appendChild(equipmentMarqueeClone);

      $$('img', equipmentMarqueeClone).forEach((logo) => {
        logo.addEventListener('error', () => {
          logo.closest('.equipment-logo')?.classList.add('is-fallback');
        }, { once:true });
      });
    }
  } else if (equipmentMarqueeClone?.isConnected) {
    equipmentMarqueeClone.remove();
    equipmentMarqueeClone = null;
  }
}

function syncEquipmentMarqueeLoop() {
  if (!equipmentMarquee || !equipmentMarqueeTrack || !equipmentMarqueeSet) return;

  ensureEquipmentMarqueeClone();

  if (!desktopMarquee.matches) return;

  const setWidth = equipmentMarqueeSet.getBoundingClientRect().width;
  if (setWidth <= 0) return;

  // Preserve the approved visual speed while looping over the full set width.
  const pxPerSecond = 88;
  const duration = Math.max(8, setWidth / pxPerSecond);

  equipmentMarqueeTrack.style.setProperty('--marquee-loop-distance', `${setWidth}px`);
  equipmentMarqueeTrack.style.setProperty('--marquee-loop-duration', `${duration}s`);
}

if (equipmentMarquee && equipmentMarqueeTrack && equipmentMarqueeSet) {
  requestAnimationFrame(syncEquipmentMarqueeLoop);
  addEventListener('load', syncEquipmentMarqueeLoop, { once:true });
  addEventListener('resize', syncEquipmentMarqueeLoop, { passive:true });

  desktopMarquee.addEventListener('change', syncEquipmentMarqueeLoop);

  if ('ResizeObserver' in window) {
    const seamlessMarqueeResizeObserver = new ResizeObserver(syncEquipmentMarqueeLoop);
    seamlessMarqueeResizeObserver.observe(equipmentMarquee);
    seamlessMarqueeResizeObserver.observe(equipmentMarqueeSet);
  }
}


/* REV1.20 — mobile-only seamless equipment marquee. Desktop behavior stays unchanged. */
const mobileEquipmentMarquee = matchMedia('(max-width: 760px)');
let mobileEquipmentMarqueeClone = null;

function syncMobileEquipmentMarquee() {
  if (!equipmentMarquee || !equipmentMarqueeTrack || !equipmentMarqueeSet) return;

  if (!mobileEquipmentMarquee.matches) {
    if (mobileEquipmentMarqueeClone?.isConnected) {
      mobileEquipmentMarqueeClone.remove();
      mobileEquipmentMarqueeClone = null;
    }
    return;
  }

  if (!mobileEquipmentMarqueeClone || !mobileEquipmentMarqueeClone.isConnected) {
    mobileEquipmentMarqueeClone = equipmentMarqueeSet.cloneNode(true);
    mobileEquipmentMarqueeClone.setAttribute('aria-hidden', 'true');
    equipmentMarqueeTrack.appendChild(mobileEquipmentMarqueeClone);
  }

  const setWidth = equipmentMarqueeSet.getBoundingClientRect().width;
  if (setWidth <= 0) return;

  const pxPerSecond = 58;
  const duration = Math.max(13, setWidth / pxPerSecond);

  equipmentMarqueeTrack.style.setProperty('--mobile-marquee-distance', `${setWidth}px`);
  equipmentMarqueeTrack.style.setProperty('--mobile-marquee-duration', `${duration}s`);
}

if (equipmentMarquee && equipmentMarqueeTrack && equipmentMarqueeSet) {
  requestAnimationFrame(syncMobileEquipmentMarquee);
  addEventListener('load', syncMobileEquipmentMarquee, { once:true });
  addEventListener('resize', syncMobileEquipmentMarquee, { passive:true });
  mobileEquipmentMarquee.addEventListener('change', syncMobileEquipmentMarquee);
}