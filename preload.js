const root = document.documentElement;
const desktop = matchMedia('(min-width: 761px)').matches;

root.classList.add('site-preloading');

const style = document.createElement('style');
style.textContent = `
  html.site-preloading, html.site-preloading body {
    overflow: hidden !important;
    background: #000 !important;
  }
  #site-preloader {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: grid;
    place-items: center;
    background: #000;
    opacity: 1;
    transition: opacity .42s ease;
    pointer-events: auto;
  }
  #site-preloader.is-ready { opacity: 0; pointer-events: none; }
  .site-preloader-inner {
    width: min(470px, 84vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .site-preloader-logo-wrap {
    position: relative;
    width: min(410px, 76vw);
    aspect-ratio: 2 / 1;
    display: grid;
    place-items: center;
    isolation: isolate;
  }
  .site-preloader-logo-wrap::before {
    content: '';
    position: absolute;
    left: 3%;
    right: 3%;
    top: 52%;
    height: 2.5px;
    z-index: 0;
    opacity: 0;
    transform: translate3d(-28%, 15px, 0) scaleX(.34);
    transform-origin: left center;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(237,28,46,0) 8%,
      rgba(237,28,46,.10) 22%,
      rgba(237,28,46,.22) 40%,
      rgba(255,45,62,.54) 61%,
      rgba(255,108,120,.86) 78%,
      rgba(255,224,227,.98) 90%,
      rgba(237,28,46,.24) 96%,
      transparent 100%);
    filter:
      blur(.12px)
      drop-shadow(0 0 4px rgba(255,64,80,.52))
      drop-shadow(0 0 10px rgba(237,28,46,.32));
    animation: siteLogoSpeedLine 4.4s cubic-bezier(.28,.56,.24,1) infinite;
  }
  .site-preloader-logo-wrap::after {
    content: '';
    position: absolute;
    inset: 10% 8%;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(237,28,46,.10) 0%, rgba(237,28,46,0) 72%);
    filter: blur(22px);
  }
  .site-preloader-logo {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    opacity: 1 !important;
    visibility: visible !important;
    filter: drop-shadow(0 0 16px rgba(237,28,46,.10));
    animation: siteLogoPresence 4.4s ease-in-out infinite;
  }
  .site-logo-sheen {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(104deg,
      transparent 0%,
      transparent 34%,
      rgba(255,255,255,.08) 41%,
      rgba(255,255,255,.94) 48%,
      rgba(255,214,218,.82) 53%,
      rgba(255,92,105,.20) 59%,
      transparent 69%,
      transparent 100%);
    background-size: 225% 100%;
    background-position: 126% 0;
    -webkit-mask: url('assets/logo.png') center / contain no-repeat;
    mask: url('assets/logo.png') center / contain no-repeat;
    mix-blend-mode: screen;
    filter:
      drop-shadow(0 0 3px rgba(255,255,255,.55))
      drop-shadow(0 0 7px rgba(237,28,46,.18));
    animation: siteLogoVelocityPass 4.4s cubic-bezier(.28,.56,.24,1) infinite;
  }
  .site-preloader-label {
    font: 600 11px/1.3 'DM Sans', Arial, sans-serif;
    letter-spacing: .18em;
    color: #c8cdd2;
    text-align: center;
  }
  .site-preloader-track {
    width: min(360px, 74vw);
    height: 2px;
    background: #252525;
    overflow: hidden;
  }
  .site-preloader-bar {
    width: 100%;
    height: 100%;
    background: #ed1c2e;
    box-shadow: 0 0 7px rgba(237,28,46,.36);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform .12s linear;
  }
  .site-preloader-percent {
    font: 600 12px/1 'DM Sans', Arial, sans-serif;
    color: #f3f4f6;
    letter-spacing: .08em;
  }
  @keyframes siteLogoVelocityPass {
    0%, 8% {
      opacity: 0;
      background-position: 126% 0;
    }
    15% {
      opacity: .22;
    }
    31% {
      opacity: 1;
    }
    49% {
      opacity: .82;
    }
    62% {
      opacity: .48;
      background-position: -118% 0;
    }
    72% {
      opacity: .16;
    }
    78%, 100% {
      opacity: 0;
      background-position: -118% 0;
    }
  }
  @keyframes siteLogoSpeedLine {
    0%, 9% {
      opacity: 0;
      transform: translate3d(-28%, 15px, 0) scaleX(.34);
    }
    16% {
      opacity: .28;
    }
    32% {
      opacity: .72;
      transform: translate3d(4%, 15px, 0) scaleX(.62);
    }
    51% {
      opacity: .58;
      transform: translate3d(28%, 15px, 0) scaleX(.86);
    }
    67% {
      opacity: .36;
      transform: translate3d(48%, 15px, 0) scaleX(.74);
    }
    78% {
      opacity: .16;
      transform: translate3d(62%, 15px, 0) scaleX(.56);
    }
    86%, 100% {
      opacity: 0;
      transform: translate3d(72%, 15px, 0) scaleX(.40);
    }
  }
  @keyframes siteLogoPresence {
    0%, 16%, 78%, 100% {
      filter: drop-shadow(0 0 16px rgba(237,28,46,.10)) brightness(1);
      transform: translate3d(0,0,0);
    }
    36% {
      filter: drop-shadow(0 0 18px rgba(237,28,46,.14)) brightness(1.035);
      transform: translate3d(.75px,0,0);
    }
    58% {
      filter: drop-shadow(0 0 16px rgba(237,28,46,.11)) brightness(1.015);
      transform: translate3d(.25px,0,0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .site-logo-sheen,
    .site-preloader-logo,
    .site-preloader-logo-wrap::before { animation: none; }
    .site-logo-sheen { display: none; }
  }
  @media (max-width: 760px) {
    .site-preloader-inner { width: min(370px, 90vw); gap: 20px; }
    .site-preloader-logo-wrap { width: min(330px, 82vw); }
    .site-preloader-track { width: min(300px, 72vw); }
    .site-preloader-label { font-size: 10px; }
  }
`;
document.head.appendChild(style);

const preloader = document.createElement('div');
preloader.id = 'site-preloader';
preloader.setAttribute('role', 'status');
preloader.setAttribute('aria-live', 'polite');
preloader.innerHTML = `
  <div class="site-preloader-inner">
    <div class="site-preloader-logo-wrap">
      <img class="site-preloader-logo" src="assets/logo.png" alt="SUPERFAST" fetchpriority="high" decoding="sync">
      <span class="site-logo-sheen" aria-hidden="true"></span>
    </div>
    <div class="site-preloader-label" id="site-preload-label">PREPARING SUPERFAST</div>
    <div class="site-preloader-track" aria-hidden="true">
      <div class="site-preloader-bar" id="site-preload-bar"></div>
    </div>
    <div class="site-preloader-percent" id="site-preload-percent">0%</div>
  </div>
`;
document.body.prepend(preloader);

const progressBar = document.getElementById('site-preload-bar');
const progressText = document.getElementById('site-preload-percent');
const preloadLabel = document.getElementById('site-preload-label');

const setProgress = (value, label) => {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  if (progressBar) progressBar.style.transform = `scaleX(${percent / 100})`;
  if (progressText) progressText.textContent = `${percent}%`;
  if (label && preloadLabel) preloadLabel.textContent = label;
};

const waitForImage = (image, timeout = 3000) => new Promise((resolve) => {
  if (!image) {
    resolve();
    return;
  }

  if (image.complete && image.naturalWidth > 0) {
    if (image.decode) image.decode().catch(() => {}).finally(resolve);
    else resolve();
    return;
  }

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    image.removeEventListener('load', finish);
    image.removeEventListener('error', finish);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  };

  image.addEventListener('load', finish, { once: true });
  image.addEventListener('error', finish, { once: true });
  setTimeout(finish, timeout);
});

const waitForMedia = (video, timeout = 8000) => new Promise((resolve) => {
  if (!video || video.readyState >= 2) {
    resolve();
    return;
  }

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    video.removeEventListener('loadeddata', finish);
    video.removeEventListener('canplay', finish);
    video.removeEventListener('error', finish);
    resolve();
  };

  video.addEventListener('loadeddata', finish, { once: true });
  video.addEventListener('canplay', finish, { once: true });
  video.addEventListener('error', finish, { once: true });
  setTimeout(finish, timeout);
});

async function preloadZoomForScrub() {
  if (!desktop) return;

  const zoomVideo = document.getElementById('hero-zoom-video');
  const source = zoomVideo?.querySelector('source');
  const sourceUrl = source?.getAttribute('src');
  if (!zoomVideo || !sourceUrl) return;

  setProgress(8, 'PREPARING MARINE OPERATIONS');

  try {
    const response = await fetch(sourceUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Zoom video returned ${response.status}`);

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const expectedBytes = Number(response.headers.get('content-length')) || 2129270;
    let blob;

    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        const ratio = Math.min(1, loaded / expectedBytes);
        setProgress(8 + ratio * 79, 'LOADING SCROLL VIDEO');
      }

      blob = new Blob(chunks, { type: contentType });
    } else {
      blob = await response.blob();
      setProgress(87, 'LOADING SCROLL VIDEO');
    }

    const blobUrl = URL.createObjectURL(blob);
    zoomVideo.pause();
    source.remove();
    zoomVideo.src = blobUrl;
    zoomVideo.preload = 'auto';
    zoomVideo.load();

    await waitForMedia(zoomVideo, 8000);
    setProgress(92, 'PREPARING FIRST FRAME');

    addEventListener('pagehide', () => URL.revokeObjectURL(blobUrl), { once: true });
  } catch (error) {
    console.warn('Zoom video preload fell back to normal loading.', error);
    zoomVideo.preload = 'auto';
    try { zoomVideo.load(); } catch {}
    await waitForMedia(zoomVideo, 5000);
    setProgress(92, 'PREPARING FIRST FRAME');
  }
}

async function runSitePreloader() {
  const startedAt = performance.now();
  const logo = document.querySelector('.site-preloader-logo');

  setProgress(2, 'PREPARING SUPERFAST');

  // Let the brand mark win the network/decode race before larger media requests begin.
  await waitForImage(logo, 3000);
  setProgress(desktop ? 8 : 48, desktop ? 'PREPARING MARINE OPERATIONS' : 'LOADING EXPERIENCE');

  if (desktop) {
    await preloadZoomForScrub();
    setProgress(95, 'LOADING HERO');
    await waitForMedia(document.getElementById('hero-video'), 5000);
  } else {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  setProgress(100, 'READY');

  const minimumDisplay = desktop ? 700 : 1050;
  const elapsed = performance.now() - startedAt;
  if (elapsed < minimumDisplay) {
    await new Promise((resolve) => setTimeout(resolve, minimumDisplay - elapsed));
  }

  preloader.classList.add('is-ready');
  root.classList.remove('site-preloading');
  setTimeout(() => {
    preloader.remove();
    style.remove();
  }, 460);
}

await runSitePreloader();