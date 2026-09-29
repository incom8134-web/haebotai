// Haebot site kit: tested WebGL scenes and interaction helpers that the
// homepage generator's pages import as "@haebot/kit". The generated page
// writes its own TypeScript (layout choreography, GSAP scroll moments,
// forms); the heavy, easy-to-get-wrong Three.js setup lives here, so every
// site gets a working, fast 3D moment instead of a broken canvas.
//
// This file is shipped to the browser as-is (types stripped on the server)
// and copied into the Vite project download as src/kit.ts, so it imports
// only "three" and its addons and uses no Node or app code.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type SceneType = "liquid-image" | "orb" | "particles-text" | "photo-ring" | "waves" | "floating" | "aurora";

export interface SceneOptions {
  type: SceneType;
  /** Palette as hex strings; the first is the main color. */
  colors?: string[];
  /** liquid-image: the photo to distort (the hero image URL). */
  image?: string;
  /** photo-ring: the photos on the ring. */
  images?: string[];
  /** particles-text: the word the particles form (brand name, 1-12 chars). */
  text?: string;
  /** floating: which family of shapes floats. */
  shapes?: "soft" | "geometric" | "rings" | "mixed";
  /** orb / floating: where the object sits in the frame. */
  align?: "center" | "left" | "right";
  /** 0..1, how strong the motion and pointer response are (default 0.6). */
  intensity?: number;
}

export interface SceneHandle {
  /** Drive the scene from outside (e.g. a GSAP ScrollTrigger), 0..1. */
  setProgress(p: number): void;
  destroy(): void;
}

interface Built {
  scene: THREE.Scene;
  camera: THREE.Camera;
  update(t: number, s: FrameState): void;
  resize?(w: number, h: number): void;
  dispose(): void;
}

interface FrameState {
  /** Pointer in -1..1 (smoothed), y up. */
  pointer: THREE.Vector2;
  /** Pointer in 0..1 texture space (smoothed), y up. */
  uv: THREE.Vector2;
  /** Whether the pointer has moved over the page yet. */
  active: boolean;
  /** Pointer speed, smoothed, roughly 0..1. */
  speed: number;
  /** 0 when the host's top is at the viewport top, 1 when scrolled past. */
  progress: number;
  /** Seconds since the last frame. */
  dt: number;
  width: number;
  height: number;
}

export const prefersReducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function palette(colors: string[] | undefined, n: number): THREE.Color[] {
  const base = (colors ?? []).filter((c) => /^#?[0-9a-f]{3,8}$/i.test(c.trim()));
  const fallback = ["#2b59ff", "#ff7a59", "#ffd166", "#06d6a0"];
  const list = base.length ? base : fallback;
  return Array.from({ length: n }, (_, i) => new THREE.Color(list[i % list.length].trim().startsWith("#") ? list[i % list.length].trim() : `#${list[i % list.length].trim()}`));
}

const vec3 = (c: THREE.Color) => new THREE.Vector3(c.r, c.g, c.b);

// Ashima/stegu simplex noise (MIT), shared by the shader scenes.
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function loadTexture(url: string, onLoad: (t: THREE.Texture) => void): THREE.Texture {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  return loader.load(url, onLoad, undefined, () => undefined);
}

/** Crop a texture to "cover" a plane of the given aspect ratio. */
function coverTexture(tex: THREE.Texture, planeAspect: number) {
  const img = tex.image as { width: number; height: number } | undefined;
  if (!img?.width) return;
  const imgAspect = img.width / img.height;
  tex.matrixAutoUpdate = true;
  if (imgAspect > planeAspect) {
    tex.repeat.set(planeAspect / imgAspect, 1);
    tex.offset.set((1 - tex.repeat.x) / 2, 0);
  } else {
    tex.repeat.set(1, imgAspect / planeAspect);
    tex.offset.set(0, (1 - tex.repeat.y) / 2);
  }
}

// ----------------------------------------------------------------- scenes

function liquidImage(o: SceneOptions, k: number): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTex: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uForce: { value: 0 },
    uReady: { value: 0 },
    uScroll: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uMouse;
      uniform float uTime; uniform float uForce; uniform float uReady; uniform float uScroll;
      varying vec2 vUv;
      ${NOISE}
      vec2 cover(vec2 uv){
        float rs = uRes.x / uRes.y; float ri = uImg.x / uImg.y;
        vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
        return (uv - 0.5) * s * (1.0 - uScroll * 0.08) + 0.5;
      }
      void main(){
        vec2 uv = vUv;
        vec2 d = uv - uMouse; d.x *= uRes.x / uRes.y;
        float dist = length(d);
        float ripple = sin(dist * 38.0 - uTime * 5.0) * exp(-dist * 5.5) * uForce;
        float n = snoise(vec3(uv * 2.2, uTime * 0.12));
        vec2 flow = vec2(n, snoise(vec3(uv * 2.2 + 7.0, uTime * 0.12))) * 0.006;
        vec2 off = normalize(d + 1e-5) * ripple * 0.028 + flow;
        vec2 c = cover(uv + off);
        float spread = length(off) * 0.9;
        float r = texture2D(uTex, c + vec2(spread, 0.0)).r;
        float g = texture2D(uTex, c).g;
        float b = texture2D(uTex, c - vec2(spread, 0.0)).b;
        gl_FragColor = vec4(r, g, b, uReady);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);
  if (o.image) {
    loadTexture(o.image, (t) => {
      const img = t.image as { width: number; height: number };
      uniforms.uTex.value = t;
      uniforms.uImg.value.set(img.width, img.height);
    });
  }
  return {
    scene,
    camera,
    resize(w, h) {
      uniforms.uRes.value.set(w, h);
    },
    update(t, s) {
      uniforms.uTime.value = t;
      uniforms.uMouse.value.copy(s.uv);
      uniforms.uForce.value = (0.12 + Math.min(1, s.speed * 3)) * k;
      uniforms.uScroll.value = s.progress;
      if (uniforms.uTex.value) uniforms.uReady.value = Math.min(1, uniforms.uReady.value + s.dt * 1.5);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      uniforms.uTex.value?.dispose();
    },
  };
}

function orb(o: SceneOptions, k: number): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 5.2);
  const [c1, c2, c3] = palette(o.colors, 3);
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.28 },
    uC1: { value: vec3(c1) },
    uC2: { value: vec3(c2) },
    uC3: { value: vec3(c3) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uAmp;
      varying vec3 vN; varying float vD; varying vec3 vView;
      ${NOISE}
      void main(){
        float d = snoise(normal * 1.35 + uTime * 0.28) * uAmp + snoise(normal * 3.2 - uTime * 0.2) * uAmp * 0.25;
        vec3 p = position + normal * d;
        vD = d;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uAmp;
      varying vec3 vN; varying float vD; varying vec3 vView;
      void main(){
        float f = pow(1.0 - max(dot(vN, vView), 0.0), 2.2);
        float m = clamp(vD / max(uAmp, 0.01) * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uC1, uC2, smoothstep(0.1, 0.9, m + vN.y * 0.25));
        col = mix(col, uC3, f * 0.85);
        float spec = pow(max(dot(reflect(-vView, vN), normalize(vec3(0.4, 0.8, 0.6))), 0.0), 24.0);
        col += spec * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 96), material);
  const x = o.align === "left" ? -1.1 : o.align === "right" ? 1.1 : 0;
  mesh.position.x = x;
  scene.add(mesh);
  return {
    scene,
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      // Keep the orb inside narrow (mobile) frames.
      camera.position.z = w < h ? 7.2 : 5.2;
      mesh.position.x = w < h ? 0 : x;
      camera.updateProjectionMatrix();
    },
    update(t, s) {
      uniforms.uTime.value = t;
      uniforms.uAmp.value = (0.2 + s.progress * 0.35 + s.speed * 0.4) * (0.6 + k * 0.6);
      mesh.rotation.y += (s.pointer.x * 0.6 - mesh.rotation.y) * 0.05 + s.dt * 0.1;
      mesh.rotation.x += (-s.pointer.y * 0.4 - mesh.rotation.x) * 0.05;
      mesh.position.y = -s.progress * 0.8;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

function textPoints(text: string, max: number): Float32Array {
  const cvs = document.createElement("canvas");
  const W = 1200;
  const H = 360;
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d");
  if (!ctx) return new Float32Array(0);
  let size = 300;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  do {
    ctx.font = `800 ${size}px ${family}`;
    size -= 10;
  } while (ctx.measureText(text).width > W * 0.92 && size > 40);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const pts: number[] = [];
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  const step = Math.max(1, Math.floor(pts.length / 2 / max));
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2 * step) out.push((pts[i] / W - 0.5) * 6, -(pts[i + 1] / H - 0.5) * 1.8, 0);
  return new Float32Array(out);
}

function particlesText(o: SceneOptions, k: number): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 6;
  const [c1, c2] = palette(o.colors, 2);
  const geometry = new THREE.BufferGeometry();
  const uniforms = {
    uTime: { value: 0 },
    uForm: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uSize: { value: 5 * Math.min(devicePixelRatio, 2) },
    uC1: { value: vec3(c1) },
    uC2: { value: vec3(c2) },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uForm; uniform vec3 uMouse; uniform float uSize;
      attribute vec3 aScatter; attribute float aSeed;
      varying float vX; varying float vA;
      ${NOISE}
      void main(){
        vec3 p = mix(aScatter, position, uForm);
        p += vec3(snoise(vec3(p.xy * 0.6, uTime * 0.3 + aSeed)), snoise(vec3(p.yx * 0.6, uTime * 0.3 - aSeed)), 0.0) * (0.04 + (1.0 - uForm) * 0.4);
        vec2 d = p.xy - uMouse.xy; float l = length(d);
        p.xy += normalize(d + 1e-5) * smoothstep(1.1, 0.0, l) * 0.55;
        vX = p.x; vA = 0.55 + 0.45 * uForm;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.6 + aSeed * 0.8) * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uC1; uniform vec3 uC2; varying float vX; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(mix(uC1, uC2, smoothstep(-3.0, 3.0, vX)), smoothstep(0.5, 0.1, d) * vA);
      }`,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  let formStart = -1;
  const build = () => {
    const target = textPoints((o.text ?? "HELLO").slice(0, 14), 7000);
    const n = target.length / 3;
    const scatter = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      scatter[i * 3] = (Math.random() - 0.5) * 12;
      scatter[i * 3 + 1] = (Math.random() - 0.5) * 7;
      scatter[i * 3 + 2] = (Math.random() - 0.5) * 4;
      seed[i] = Math.random();
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(target, 3));
    geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    formStart = -1;
  };
  // Korean web fonts must be loaded before the text is sampled.
  build();
  document.fonts?.ready.then(build).catch(() => undefined);
  const ray = new THREE.Vector3();
  return {
    scene,
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      camera.position.z = w < h ? 11 : 6;
      camera.updateProjectionMatrix();
    },
    update(t, s) {
      if (formStart < 0) formStart = t;
      const e = clamp((t - formStart) / 2.2);
      const eased = 1 - Math.pow(1 - e, 3);
      uniforms.uTime.value = t * (0.5 + k);
      uniforms.uForm.value = eased * (1 - clamp(s.progress * 1.4));
      // Pointer onto the z=0 plane.
      ray.set(s.pointer.x, s.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = -camera.position.z / ray.z;
      if (s.active) uniforms.uMouse.value.copy(camera.position).addScaledVector(ray, dist);
      points.rotation.y = s.pointer.x * 0.12;
      points.rotation.x = -s.pointer.y * 0.08;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function photoRing(o: SceneOptions, k: number, host: HTMLElement): Built & { detach(): void } {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 9);
  camera.lookAt(0, 0, 0);
  const urls = (o.images ?? []).filter(Boolean);
  const ring = new THREE.Group();
  ring.rotation.z = -0.06;
  scene.add(ring);
  const count = Math.max(6, urls.length * (urls.length < 5 ? 2 : 1));
  const radius = 4.2;
  const pw = 1.9;
  const ph = 2.5;
  const geometry = new THREE.PlaneGeometry(pw, ph, 16, 1);
  // Bend the planes to follow the ring.
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const a = x / radius;
    pos.setXYZ(i, Math.sin(a) * radius, pos.getY(i), Math.cos(a) * radius - radius);
  }
  geometry.computeVertexNormals();
  const materials: THREE.MeshBasicMaterial[] = [];
  const textures = new Map<string, THREE.Texture>();
  for (let i = 0; i < count; i++) {
    const url = urls.length ? urls[i % urls.length] : "";
    const mat = new THREE.MeshBasicMaterial({ color: palette(o.colors, 3)[i % 3], side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    if (url) {
      const tex =
        textures.get(url) ??
        loadTexture(url, (t) => {
          coverTexture(t, pw / ph);
          t.needsUpdate = true;
        });
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.set(url, tex);
      mat.map = tex;
      mat.color.set("#ffffff");
    }
    materials.push(mat);
    const mesh = new THREE.Mesh(geometry, mat);
    const a = (i / count) * Math.PI * 2;
    mesh.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
    mesh.rotation.y = a;
    ring.add(mesh);
  }
  // Drag to spin, with inertia.
  let dragging = false;
  let lastX = 0;
  let vel = 0;
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    vel = (e.clientX - lastX) * 0.004;
    lastX = e.clientX;
  };
  const up = () => (dragging = false);
  host.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  host.style.touchAction = "pan-y";
  let spin = 0;
  return {
    scene,
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      camera.position.z = w < h ? 13 : 9;
      camera.updateProjectionMatrix();
    },
    update(t, s) {
      spin += vel + s.dt * 0.12 * (0.5 + k);
      vel *= dragging ? 0.6 : 0.94;
      ring.rotation.y = spin + s.progress * 1.6;
      ring.rotation.x = s.pointer.y * 0.08;
      camera.position.x = s.pointer.x * 0.5;
      camera.lookAt(0, 0, 0);
    },
    detach() {
      host.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    },
    dispose() {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

function waves(o: SceneOptions, k: number): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 2.2, 6);
  camera.lookAt(0, 0, -1);
  const [c1, c2] = palette(o.colors, 2);
  const geometry = new THREE.PlaneGeometry(18, 12, 180, 120);
  geometry.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uAmp: { value: 0.5 },
    uC1: { value: vec3(c1) },
    uC2: { value: vec3(c2) },
    uSize: { value: 2.2 * Math.min(devicePixelRatio, 2) },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec2 uMouse; uniform float uAmp; uniform float uSize;
      varying float vH; varying float vFade;
      ${NOISE}
      void main(){
        vec3 p = position;
        float h = snoise(vec3(p.x * 0.25, p.z * 0.25, uTime * 0.18)) * uAmp;
        h += sin(p.x * 0.8 + uTime * 0.9) * 0.08;
        float md = length(p.xz - uMouse);
        h += exp(-md * md * 0.6) * 0.6 * uAmp;
        p.y += h;
        vH = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFade = smoothstep(-16.0, -3.0, mv.z) * smoothstep(0.0, -1.5, mv.z);
        gl_PointSize = uSize * (5.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uC1; uniform vec3 uC2; varying float vH; varying float vFade;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(mix(uC1, uC2, smoothstep(-0.4, 0.6, vH)), vFade * smoothstep(0.5, 0.2, d));
      }`,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return {
    scene,
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    update(t, s) {
      uniforms.uTime.value = t * (0.6 + k * 0.8);
      uniforms.uMouse.value.set(s.pointer.x * 6, -s.pointer.y * 3 - 1);
      uniforms.uAmp.value = 0.45 + s.progress * 0.8 + s.speed * 0.6;
      camera.position.y = 2.2 - s.progress * 1.2;
      camera.lookAt(0, 0, -1);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function floating(o: SceneOptions, k: number, renderer: THREE.WebGLRenderer): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 1.4);
  light.position.set(3, 4, 5);
  scene.add(light);
  const colors = palette(o.colors, 4);
  const kind = o.shapes ?? "mixed";
  const geos: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry) => (geos.push(g), g);
  const families: Record<string, () => THREE.BufferGeometry> = {
    sphere: () => add(new THREE.SphereGeometry(0.7, 48, 32)),
    capsule: () => add(new THREE.CapsuleGeometry(0.4, 0.8, 12, 32)),
    box: () => add(new RoundedBoxGeometry(1.1, 1.1, 1.1, 6, 0.18)),
    octa: () => add(new THREE.OctahedronGeometry(0.8, 0)),
    cone: () => add(new THREE.ConeGeometry(0.6, 1.2, 48)),
    torus: () => add(new THREE.TorusGeometry(0.6, 0.22, 32, 96)),
    knot: () => add(new THREE.TorusKnotGeometry(0.5, 0.16, 160, 24)),
  };
  const sets: Record<string, string[]> = {
    soft: ["sphere", "capsule", "sphere", "capsule"],
    geometric: ["box", "octa", "cone", "box"],
    rings: ["torus", "knot", "torus", "sphere"],
    mixed: ["sphere", "box", "torus", "capsule", "octa", "knot"],
  };
  const set = sets[kind] ?? sets.mixed;
  const group = new THREE.Group();
  scene.add(group);
  const items: { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; spin: THREE.Vector3 }[] = [];
  const mats: THREE.Material[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshPhysicalMaterial({ color: colors[i % colors.length], roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 });
    mats.push(mat);
    const mesh = new THREE.Mesh(families[set[i % set.length]](), mat);
    const a = (i / n) * Math.PI * 2;
    const r = 2.4 + (i % 3) * 0.9;
    const base = new THREE.Vector3(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.62, -(i % 4) * 0.9);
    mesh.position.copy(base);
    const s = 0.55 + ((i * 37) % 10) / 14;
    mesh.scale.setScalar(s);
    group.add(mesh);
    items.push({ mesh, base, speed: 0.4 + ((i * 13) % 7) / 10, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(0.6) });
  }
  const x = o.align === "left" ? -1.6 : o.align === "right" ? 1.6 : 0;
  group.position.x = x;
  return {
    scene,
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      camera.position.z = w < h ? 14 : 9;
      group.position.x = w < h ? 0 : x;
      camera.updateProjectionMatrix();
    },
    update(t, s) {
      const m = 0.5 + k;
      for (const it of items) {
        it.mesh.position.y = it.base.y + Math.sin(t * it.speed * m + it.base.x) * 0.25;
        it.mesh.rotation.x += it.spin.x * s.dt * m;
        it.mesh.rotation.y += it.spin.y * s.dt * m;
      }
      group.rotation.y += (s.pointer.x * 0.35 - group.rotation.y) * 0.05;
      group.rotation.x += (-s.pointer.y * 0.25 - group.rotation.x) * 0.05;
      group.position.y = s.progress * 2.2;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((mm) => mm.dispose());
      env.dispose();
      pmrem.dispose();
    },
  };
}

function aurora(o: SceneOptions, k: number): Built {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const [c1, c2, c3, c4] = palette(o.colors, 4);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uC1: { value: vec3(c1) },
    uC2: { value: vec3(c2) },
    uC3: { value: vec3(c3) },
    uC4: { value: vec3(c4) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
      uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4;
      varying vec2 vUv;
      ${NOISE}
      float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++){ s += a * snoise(p); p *= 2.02; a *= 0.5; } return s; }
      void main(){
        vec2 uv = vUv; vec2 q = uv; q.x *= uRes.x / uRes.y;
        q += (uMouse - 0.5) * 0.15;
        float t = uTime * 0.07;
        float n1 = fbm(vec3(q * 1.3, t));
        float n2 = fbm(vec3(q * 1.7 + n1, t * 1.3 + 4.0));
        vec3 col = mix(uC1, uC2, smoothstep(-0.5, 0.6, n1));
        col = mix(col, uC3, smoothstep(0.0, 0.8, n2) * 0.8);
        col = mix(col, uC4, smoothstep(0.4, 1.0, n1 * n2 + uv.y * 0.4) * 0.6);
        float grain = fract(sin(dot(uv * uRes, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
        col += (grain - 0.5) * 0.035;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);
  return {
    scene,
    camera,
    resize(w, h) {
      uniforms.uRes.value.set(w, h);
    },
    update(t, s) {
      uniforms.uTime.value = t * (0.6 + k);
      uniforms.uMouse.value.lerp(s.uv, 0.05);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

// ------------------------------------------------------------------ mount

function backgroundOf(el: HTMLElement): THREE.Color {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(node).backgroundColor);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) return new THREE.Color(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255);
  }
  return new THREE.Color(1, 1, 1);
}

function visibleOn(host: HTMLElement, colors: string[] | undefined): string[] | undefined {
  if (!colors?.length) return colors;
  const bg = backgroundOf(host);
  const keep = colors.filter((c) => {
    try {
      const col = new THREE.Color(c.trim().startsWith("#") ? c.trim() : `#${c.trim()}`);
      return Math.abs(col.r - bg.r) + Math.abs(col.g - bg.g) + Math.abs(col.b - bg.b) > 0.25;
    } catch {
      return false;
    }
  });
  return keep.length ? keep : colors;
}

/**
 * Mount a WebGL scene into `host` (which should already be sized and hold
 * a normal <img>/CSS fallback under it). Returns null — leaving the
 * fallback — when WebGL is unavailable. Pauses off-screen, respects
 * reduced motion (renders one still frame) and cleans up on destroy().
 */
export function mountScene(hostEl: HTMLElement | null, opts: SceneOptions): SceneHandle | null {
  if (!hostEl) return null;
  const host: HTMLElement = hostEl;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const k = clamp(opts.intensity ?? 0.6);
  // A color equal to the section's background would draw an invisible
  // scene; drop those (keeping at least one color).
  opts = { ...opts, colors: visibleOn(host, opts.colors) };
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.appendChild(canvas);

  let built: Built & { detach?(): void };
  try {
    switch (opts.type) {
      case "liquid-image":
        built = liquidImage(opts, k);
        break;
      case "orb":
        built = orb(opts, k);
        break;
      case "particles-text":
        built = particlesText(opts, k);
        break;
      case "photo-ring":
        built = photoRing(opts, k, host);
        canvas.style.pointerEvents = "none";
        host.style.cursor = "grab";
        break;
      case "waves":
        built = waves(opts, k);
        break;
      case "floating":
        built = floating(opts, k, renderer);
        break;
      default:
        built = aurora(opts, k);
    }
  } catch (err) {
    console.warn("[kit] scene failed", err);
    renderer.dispose();
    canvas.remove();
    return null;
  }

  const target = new THREE.Vector2();
  const state: FrameState = { pointer: new THREE.Vector2(), uv: new THREE.Vector2(0.5, 0.5), active: false, speed: 0, progress: 0, dt: 0.016, width: 1, height: 1 };
  let external: number | null = null;
  let lastPointer = { x: 0, y: 0, t: performance.now() };
  let rawSpeed = 0;
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    state.active = true;
    const now = performance.now();
    const d = Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y);
    rawSpeed = Math.min(1, d / Math.max(1, now - lastPointer.t) / 3);
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  const size = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    state.width = w;
    state.height = h;
    renderer.setSize(w, h, false);
    built.resize?.(w, h);
  };
  size();
  const ro = new ResizeObserver(() => {
    size();
    if (still) frame(performance.now());
  });
  ro.observe(host);

  const still = prefersReducedMotion();
  let visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !still && !raf) raf = requestAnimationFrame(frame);
  });
  io.observe(host);

  const t0 = performance.now();
  let last = t0;
  let raf = 0;
  function frame(now: number) {
    raf = 0;
    state.dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.pointer.lerp(target, 0.08);
    state.uv.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    state.speed += (rawSpeed - state.speed) * 0.1;
    rawSpeed *= 0.9;
    if (external !== null) state.progress = external;
    else {
      const r = host.getBoundingClientRect();
      state.progress = clamp(-r.top / Math.max(1, r.height));
    }
    built.update(still ? 2 : (now - t0) / 1000, state);
    renderer.render(built.scene, built.camera);
    if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => {
    if (!document.hidden && visible && !still && !raf) raf = requestAnimationFrame(frame);
  };
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);
  // Textures arrive later; redraw a still scene a few times as they load.
  if (still) [300, 1200, 3000].forEach((ms) => setTimeout(() => frame(performance.now()), ms));

  return {
    setProgress(p: number) {
      external = clamp(p);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      built.detach?.();
      built.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

// --------------------------------------------------------------- helpers

/**
 * Wrap each word of an element's text in <span class="w"><span class="wi">…
 * for staggered reveals (Korean-safe: splits on spaces, never inside a
 * word). Returns the inner spans to animate. Nested markup is kept.
 */
export function splitWords(el: Element | null): HTMLElement[] {
  if (!el) return [];
  const out: HTMLElement[] = [];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? "").split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            continue;
          }
          const outer = document.createElement("span");
          outer.className = "w";
          outer.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:0.08em;margin-bottom:-0.08em;";
          const inner = document.createElement("span");
          inner.className = "wi";
          inner.style.display = "inline-block";
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
          out.push(inner);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !["SVG", "IMG", "BR"].includes((child as Element).tagName.toUpperCase())) {
        walk(child);
      }
    }
  };
  walk(el);
  return out;
}

/**
 * Make GSAP forgiving: null/undefined targets and nulls inside target
 * lists (a querySelector that found nothing) become a harmless dummy
 * instead of throwing and leaving half-animated, hidden content.
 */
export function guardGsap(gsap: unknown): void {
  const g = gsap as { config?: (o: object) => void; core?: { Timeline?: { prototype: Record<string, unknown> } } } & Record<string, unknown>;
  if (!g || (g as { __kitGuard?: boolean }).__kitGuard) return;
  (g as { __kitGuard?: boolean }).__kitGuard = true;
  g.config?.({ nullTargetWarn: false });
  const clean = (t: unknown): unknown => {
    if (t === null || t === undefined) return {};
    if (typeof t === "string" || typeof t !== "object") return t;
    if (Array.isArray(t) || t instanceof NodeList || t instanceof HTMLCollection) {
      const list = Array.from(t as ArrayLike<unknown>).filter(Boolean);
      return list.length ? list : {};
    }
    return t;
  };
  const targets = [g, g.core?.Timeline?.prototype].filter(Boolean) as Record<string, unknown>[];
  for (const obj of targets) {
    for (const m of ["to", "from", "fromTo", "set"]) {
      const orig = obj[m];
      if (typeof orig !== "function") continue;
      obj[m] = function (this: unknown, t: unknown, ...rest: unknown[]) {
        return (orig as (...a: unknown[]) => unknown).call(this, clean(t), ...rest);
      };
    }
  }
}

/**
 * Safety net for entrance animations: a few seconds after load, any
 * heading, word span or hero text that is on screen but still invisible
 * (an animation that never ran) is shown. Menus, dialogs and anything
 * marked hidden are left alone.
 */
export function failsafe(delayMs = 4000): void {
  setTimeout(() => {
    const els = document.querySelectorAll<HTMLElement>("h1, h2, h3, .w > .wi, header p, [class*='hero'] p, [class*='hero'] a, [class*='hero'] img");
    for (const el of Array.from(els)) {
      if (el.closest("[hidden], dialog, [aria-hidden='true'], [role='dialog'], nav, [class*='menu'], [class*='overlay'], [class*='lightbox'], [class*='modal']")) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.width === 0) continue;
      const cs = getComputedStyle(el);
      const hiddenByTransform = el.classList.contains("wi") && cs.transform !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(cs.transform);
      if (Number(cs.opacity) < 0.05 || cs.visibility === "hidden" || hiddenByTransform) {
        el.style.opacity = "1";
        el.style.visibility = "visible";
        el.style.transform = "none";
        el.style.clipPath = "none";
      }
    }
  }, delayMs);
}

type Targets = string | Element | null | undefined | ArrayLike<Element | null>;

/** Elements from a selector, an element or a list; never throws. */
function elementsOf(t: Targets): HTMLElement[] {
  try {
    if (!t) return [];
    if (typeof t === "string") return Array.from(document.querySelectorAll<HTMLElement>(t));
    if (t instanceof Element) return [t as HTMLElement];
    return Array.from(t).filter((e): e is HTMLElement => e instanceof HTMLElement);
  } catch {
    return [];
  }
}

/** Buttons and links that lean toward the pointer. */
export function magnetic(targets: Targets, strength = 0.3): void {
  if (prefersReducedMotion() || !matchMedia("(hover: hover)").matches) return;
  elementsOf(targets).forEach((el) => {
    el.style.transition = "transform .35s cubic-bezier(.2,.8,.2,1)";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

/** Cards that tilt in 3D under the pointer. */
export function tilt(targets: Targets, maxDeg = 8): void {
  if (prefersReducedMotion() || !matchMedia("(hover: hover)").matches) return;
  elementsOf(targets).forEach((el) => {
    el.style.transition = "transform .4s cubic-bezier(.2,.8,.2,1)";
    el.style.transformStyle = "preserve-3d";
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-y * maxDeg}deg) rotateY(${x * maxDeg}deg)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}
