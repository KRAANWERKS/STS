import * as THREE from 'three';

const VERT = `
uniform float uTime;
uniform float uAmp;
varying float vHeight;
varying vec3 vWorld;

float wave(vec2 p, vec2 d, float f, float s, float a){
  return sin(dot(p,d)*f + uTime*s)*a;
}
void main(){
  vec3 pos = position;
  float h = 0.0;
  h += wave(pos.xz, normalize(vec2(1.0,.35)), .72, 1.05, .22);
  h += wave(pos.xz, normalize(vec2(-.32,1.0)), 1.12, .82, .12);
  h += wave(pos.xz, normalize(vec2(.8,-.65)), 1.95, 1.35, .055);
  h += wave(pos.xz, normalize(vec2(-.9,-.1)), 3.35, 1.75, .025);
  pos.y += h * uAmp;
  vec4 world = modelMatrix * vec4(pos,1.0);
  vHeight = h;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAG = `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform float uTime;
varying float vHeight;
varying vec3 vWorld;

void main(){
  float h = smoothstep(-.35,.35,vHeight);
  vec3 col = mix(uDeep,uShallow,h);
  float glint = pow(max(0.0, sin(vWorld.x*.75 + uTime*.25)*.5 + .5),18.0) * .12;
  col += uSky * glint;
  float distFade = smoothstep(4.0,38.0,length(vWorld.xz));
  col = mix(col,uSky,distFade*.19);
  gl_FragColor = vec4(col,1.0);
}`;

function makeMat(color, rough=.48, metal=.16){
  return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
}
function box(w,h,d,color, x=0,y=0,z=0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),makeMat(color));
  m.position.set(x,y,z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(a,b,r,color){
  const dir = new THREE.Vector3().subVectors(b,a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,10),makeMat(color));
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
  return m;
}
function addHull(group,length,width,height,color){
  const shape = new THREE.Shape();
  shape.moveTo(-length*.5,-width*.48);
  shape.lineTo(length*.38,-width*.48);
  shape.lineTo(length*.5,-width*.25);
  shape.lineTo(length*.5,width*.25);
  shape.lineTo(length*.38,width*.48);
  shape.lineTo(-length*.5,width*.48);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
  geo.rotateX(Math.PI/2);
  geo.translate(0,height*.5,0);
  const mesh = new THREE.Mesh(geo,makeMat(color,.58,.12));
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function floatingCrane(){
  const g = new THREE.Group();
  addHull(g,6.4,2.05,.42,0x1c2a30);
  g.add(box(5.2,.18,1.72,0x37464b,0,.38,0));
  g.add(box(1.25,.85,1.15,0xe9ece9,-1.8,.9,0));
  g.add(box(.8,.54,1.06,0xdadfdd,-1.85,1.58,0));
  const glass=makeMat(0x173844,.28,.05);
  [[-2.08,1.63,-.54],[-1.78,1.63,-.54],[-1.48,1.63,-.54]].forEach(p=>{
    const w=box(.2,.16,.025,0x173844,...p);w.material=glass;g.add(w);
  });
  g.add(box(.55,2.85,.62,0xe7ad1a,.55,1.82,0));
  const pivot = new THREE.Group(); pivot.position.set(.55,3.02,0); g.add(pivot);
  const boomStart = new THREE.Vector3(0,0,0);
  const boomEnd = new THREE.Vector3(4.55,1.2,0);
  const boom = cyl(boomStart,boomEnd,.115,0xe7ad1a); pivot.add(boom);
  const brace = cyl(new THREE.Vector3(.1,-.1,0),new THREE.Vector3(3.8,1.03,0),.025,0xf0c650); pivot.add(brace);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,2.55,6),makeMat(0x283033,.8,0));
  cable.position.set(4.52,-.05,0); pivot.add(cable);
  const grab = new THREE.Group();
  grab.position.set(4.52,-1.36,0); pivot.add(grab);
  grab.add(box(.55,.42,.65,0x1a2428,0,0,0));
  grab.add(cyl(new THREE.Vector3(-.24,-.05,-.28),new THREE.Vector3(-.1,-.42,0),.035,0x323b3e));
  grab.add(cyl(new THREE.Vector3(.24,-.05,-.28),new THREE.Vector3(.1,-.42,0),.035,0x323b3e));
  g.userData = {pivot,cable,grab};
  return g;
}
function barge(){
  const g=new THREE.Group(); addHull(g,7.2,2.1,.34,0x202b2f);
  g.add(box(6.1,.26,1.68,0x1a1510,0,.35,0));
  const coal=box(5.75,.24,1.45,0x19130e,0,.59,0); coal.rotation.z=.015; g.add(coal);
  return g;
}
function carrier(){
  const g=new THREE.Group(); addHull(g,12.5,2.7,.72,0x2b373b);
  g.add(box(3.1,1.4,2.2,0xe6e9e6,-4.1,1.05,0));
  g.add(box(1.25,.55,1.8,0xdadfdd,-4.3,2.02,0));
  for(let i=0;i<5;i++) g.add(box(1.25,.16,2.15,0x192126,-1.8+i*1.6,.88,0));
  return g;
}
function buoy(x,z){
  const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.SphereGeometry(.11,14,10),makeMat(0xe52a34,.35,.1));b.scale.y=1.5;g.add(b);
  g.add(cyl(new THREE.Vector3(0,.08,0),new THREE.Vector3(0,.7,0),.02,0xb7bfc0));
  g.position.set(x,.02,z);return g;
}
function sampleWave(x,z,t){
  return (
    Math.sin((x*.72+z*.252)+t*1.05)*.22 +
    Math.sin((-x*.358+z*1.118)+t*.82)*.12 +
    Math.sin((x*1.56-z*1.267)+t*1.35)*.055 +
    Math.sin((-x*3.015-z*.335)+t*1.75)*.025
  );
}
function orientFloat(obj,t,baseY=.15){
  const x=obj.position.x,z=obj.position.z;
  const h=sampleWave(x,z,t);
  const dx=sampleWave(x+.45,z,t)-sampleWave(x-.45,z,t);
  const dz=sampleWave(x,z+.45,t)-sampleWave(x,z-.45,t);
  obj.position.y=baseY+h*.72;
  obj.rotation.z=THREE.MathUtils.lerp(obj.rotation.z,-dx*.08,.08);
  obj.rotation.x=THREE.MathUtils.lerp(obj.rotation.x,dz*.06,.08);
}
export async function initOcean({canvas,reducedMotion=false}){
  if(!canvas) return;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x07141b);
  scene.fog=new THREE.FogExp2(0x071923,.026);

  const camera=new THREE.PerspectiveCamera(38,1,.1,120);
  camera.position.set(10.8,5.6,12.5);
  camera.lookAt(0,.8,0);

  scene.add(new THREE.HemisphereLight(0x95cbd7,0x071014,2.4));
  const sun=new THREE.DirectionalLight(0xffe8ca,3.3);
  sun.position.set(-8,15,4);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);

  const horizon = new THREE.Mesh(new THREE.PlaneGeometry(120,50),new THREE.MeshBasicMaterial({color:0x0a2631,transparent:true,opacity:.8}));
  horizon.position.set(0,12,-44); scene.add(horizon);

  const seaGeo=new THREE.PlaneGeometry(85,70,150,120);seaGeo.rotateX(-Math.PI/2);
  const seaMat=new THREE.ShaderMaterial({
    vertexShader:VERT,fragmentShader:FRAG,
    uniforms:{uTime:{value:0},uAmp:{value:1},uDeep:{value:new THREE.Color(0x062c39)},uShallow:{value:new THREE.Color(0x168095)},uSky:{value:new THREE.Color(0x7fb2be)}},
    side:THREE.DoubleSide
  });
  const sea=new THREE.Mesh(seaGeo,seaMat);sea.position.y=-.33;scene.add(sea);

  const crane=floatingCrane();crane.position.set(0,.1,0);crane.rotation.y=-.16;scene.add(crane);
  const cargo=barge();cargo.position.set(5.4,-.05,-.85);cargo.rotation.y=.03;scene.add(cargo);
  const ship=carrier();ship.position.set(-7.4,-.12,-5.6);ship.rotation.y=.12;scene.add(ship);
  const b1=buoy(7.5,4.6),b2=buoy(-6.2,3.8);scene.add(b1,b2);

  const group=new THREE.Group();
  for(let i=0;i<90;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.06+Math.random()*.2,.01),new THREE.MeshBasicMaterial({color:0xb9e3e9,transparent:true,opacity:.08+Math.random()*.12,side:THREE.DoubleSide}));
    m.rotation.x=-Math.PI/2;m.position.set((Math.random()-.5)*38,.02,(Math.random()-.5)*26);group.add(m);
  }
  scene.add(group);

  let pointerX=0,pointerY=0,scrollP=0,last=performance.now(),t=0,raf=0;
  const hero=document.querySelector('.hero');

  hero?.addEventListener('pointermove',e=>{
    if(reducedMotion) return;
    const r=hero.getBoundingClientRect();
    pointerX=((e.clientX-r.left)/r.width-.5);
    pointerY=((e.clientY-r.top)/r.height-.5);
  },{passive:true});

  function updateScroll(){
    const heroR=hero.getBoundingClientRect();
    scrollP=Math.max(0,Math.min(1,-heroR.top/Math.max(heroR.height,1)));
  }
  addEventListener('scroll',updateScroll,{passive:true});updateScroll();

  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const dpr=renderer.getPixelRatio();
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      renderer.setSize(w,h,false);
      camera.aspect=w/h;camera.updateProjectionMatrix();
    }
  }

  function render(now){
    resize();
    const dt=Math.min(.035,(now-last)/1000);last=now;
    if(!reducedMotion) t+=dt;
    seaMat.uniforms.uTime.value=t;

    orientFloat(crane,t,.06);
    orientFloat(cargo,t+.2,-.02);
    orientFloat(ship,t+.45,-.06);
    orientFloat(b1,t,0);orientFloat(b2,t+.6,0);

    const cycle=(Math.sin(t*.48)+1)/2;
    const lift=.35+cycle*1.25;
    crane.userData.grab.position.y=-1.6+lift;
    crane.userData.cable.scale.y=Math.max(.35,(2.9-lift)/2.55);
    crane.userData.cable.position.y=-.08 + lift*.22;
    crane.userData.pivot.rotation.z=.018*Math.sin(t*.32);

    const targetX=10.8 + pointerX*.8 - scrollP*1.8;
    const targetY=5.6 - pointerY*.35 - scrollP*.5;
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX,.035);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,targetY,.035);
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,12.5-scrollP*2.4,.035);
    camera.lookAt(-scrollP*.8,.65,0);

    group.children.forEach((m,i)=>{m.material.opacity=.07+.08*(.5+.5*Math.sin(t*1.2+i));});

    renderer.render(scene,camera);
    raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);

  addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}
