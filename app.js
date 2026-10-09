const headerLogoAnimationStylesheet = document.createElement('link');
headerLogoAnimationStylesheet.rel = 'stylesheet';
headerLogoAnimationStylesheet.href = './header-logo-animation.css?v=20261009-velocity4';
document.head.appendChild(headerLogoAnimationStylesheet);

await import('./preload.js?v=20261009-preload1');
await import('./app-core.js?v=20261009-preload1');
