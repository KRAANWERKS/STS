const root = document.documentElement;
const desktop = matchMedia('(min-width: 761px)').matches;

root.classList.add('site-preloading');

const style = document.createElement('style');
style.textContent = `
  html.site-preloading, html.site-preloading body { overflow: hidden !important; }
  #site-preloader {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: grid;
    place-items: center;
    background: #fff;
    opacity: 1;
    transition: opacity .36s ease;
    pointer-events: auto;
  }
  #site-preloader.is-ready { opacity: 0; pointer-events: none; }
  .site-preloader-inner {
    width: min(320px, 72vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
  }
  .site-preloader-logo { width: min(230px, 62vw); height: auto; display: block; }
  .site-preloader-label {
    font: 600 11px/1.3 'DM Sans', Arial, sans-serif;
    letter-spacing: .18em;
    color: #60646b;
    text-align: center;
  }
  .site-preloader-track { width: 100%; height: 2px; background: #e5e7eb; overflow: hidden; }
  .site-preloader-bar {
    width: 100%;
    height: 100%;
    background: #ed1c2e;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform .12s linear;
  }
  .site-preloader-percent {
    font: 600 12px/1 'DM Sans', Arial, sans-serif;
    color: #111827;
    letter-spacing: .08em;
  }
  @media (max-width: 760px) {
    .site-preloader-inner { width: min(280px, 70vw); gap: 18px; }
    .site-preloader-logo { width: min(205px, 58vw); }
  }
`;
document.head.appendChild(style);

const preloader = document.createElement('div');
preloader.id = 'site-preloader';
preloader.setAttribute('role', 'status');
preloader.setAttribute('aria-live', 'polite');
preloader.innerHTML = `
  <div class="site-preloader-inner">
    <img class="site-preloader-logo" src="assets/logo.png" alt="SUPERFAST">
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

  setProgress(5, 'PREPARING MARINE OPERATIONS');

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
        setProgress(5 + ratio * 82, 'LOADING SCROLL VIDEO');
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
  setProgress(2, desktop ? 'PREPARING MARINE OPERATIONS' : 'PREPARING SUPERFAST');

  if (desktop) {
    await preloadZoomForScrub();
    setProgress(95, 'LOADING HERO');
    await waitForMedia(document.getElementById('hero-video'), 5000);
  } else {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  setProgress(100, 'READY');

  const minimumDisplay = 500;
  const elapsed = performance.now() - startedAt;
  if (elapsed < minimumDisplay) {
    await new Promise((resolve) => setTimeout(resolve, minimumDisplay - elapsed));
  }

  preloader.classList.add('is-ready');
  root.classList.remove('site-preloading');
  setTimeout(() => {
    preloader.remove();
    style.remove();
  }, 420);
}

await runSitePreloader();
