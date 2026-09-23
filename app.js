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
let paused = reducedMotion.matches;
const motion = $('#motion');
function updateMotionLabel() {
  motion.setAttribute('aria-pressed', paused);
  motion.textContent = paused ? 'Play motion ▷' : 'Pause motion Ⅱ';
}
motion.addEventListener('click', () => { paused = !paused; updateMotionLabel(); });
reducedMotion.addEventListener('change', (event) => { paused = event.matches; updateMotionLabel(); });
updateMotionLabel();

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

const hero = $('.hero');
const heroLines = $$('.hero h1 > *');
let scrollScheduled = false;
function renderScroll() {
  const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
  heroLines.forEach((line, index) => {
    const direction = index === 1 ? -1 : 1;
    line.style.transform = reducedMotion.matches ? '' : `translate3d(${direction * progress * 9}vw,${progress * 2}vh,0)`;
  });
  hero.style.setProperty('--hero-progress', progress);
}
addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => { renderScroll(); scrollScheduled = false; });
}, { passive: true });
renderScroll();

async function startHero() {
  try {
    const THREE = await import('./assets/three.module.js');
    const host = $('#ocean');
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const texture = await new THREE.TextureLoader().loadAsync('./assets/floating-crane.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    const uniforms = {
      image: { value: texture }, time: { value: 0 }, pointer: { value: new THREE.Vector2() }, aspect: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}',
      fragmentShader: `uniform sampler2D image;uniform float time;uniform float aspect;uniform vec2 pointer;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec2 uv=vUv;float ia=994./533.;if(aspect>ia)uv.y=(uv.y-.5)*ia/aspect+.5;else uv.x=(uv.x-.5)*aspect/ia+.5;uv=(uv-.5)*.95+.5;uv+=pointer*vec2(.012,.007);float water=smoothstep(.44,.02,uv.y);uv.x+=sin(uv.y*72.+time*.8)*.0011*water;uv.y+=cos(uv.x*58.+time*.6)*.0007*water;vec4 c=texture2D(image,uv);vec2 cell=floor(vec2(vUv.x*170.,(vUv.y+time*.025)*95.));float cargo=step(.992,hash(cell))*water;c.rgb+=cargo*vec3(.93,.11,.18)*.72;float glow=.035/max(.04,distance(vUv,pointer*.15+vec2(.5)));c.rgb+=glow*vec3(.08,.13,.15);gl_FragColor=c;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>`,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    function resize() {
      renderer.setSize(hero.clientWidth, hero.clientHeight);
      uniforms.aspect.value = hero.clientWidth / hero.clientHeight;
      renderer.render(scene, camera);
    }
    resize();
    new ResizeObserver(resize).observe(hero);
    const target = new THREE.Vector2();
    let visible = true;
    let last = performance.now();
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      target.set((event.clientX - bounds.left) / bounds.width - .5, .5 - (event.clientY - bounds.top) / bounds.height);
    });
    hero.addEventListener('pointerleave', () => target.set(0, 0));
    new IntersectionObserver((entries) => visible = entries[0].isIntersecting).observe(hero);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden || paused) { last = now; return; }
      uniforms.time.value += Math.min((now - last) / 1000, .05);
      uniforms.pointer.value.lerp(target, .035);
      last = now;
      renderer.render(scene, camera);
    }
    host.classList.add('ready');
    requestAnimationFrame(frame);
  } catch {
    motion.hidden = true;
  }
}
startHero();
