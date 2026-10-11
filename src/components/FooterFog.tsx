import {useEffect, useRef, type MutableRefObject} from 'react';
import {gsap} from 'gsap';
import * as THREE from 'three';

const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform float uPulse;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float value=0.0, amplitude=0.5;
  for(int i=0; i<4; i++) {
    value += amplitude*noise(p);
    p=mat2(.8,.6,-.6,.8)*p*2.05+vec2(3.7,8.3);
    amplitude *= .5;
  }
  return value;
}
void main() {
  vec2 uv = vUv;
  vec2 p=vec2(uv.x*uAspect*2.8,uv.y*3.8-uTime*.045);
  vec2 warp=vec2(fbm(p+vec2(uTime*.014,0)),fbm(p+vec2(4.1,7.3)));
  float field=fbm(p+warp*2.8);
  float tendrils=smoothstep(.38,.78,field);
  float cloud=pow(tendrils,1.45);
  float horizontal=pow(max(0.0,sin(uv.x*3.14159)),.7);
  float vertical=smoothstep(0.0,.22,uv.y)*(1.0-smoothstep(.8,1.0,uv.y));
  float density=cloud*horizontal*vertical;
  vec3 charcoal=vec3(.0196,.0235,.0275);
  vec3 smoke=vec3(.33,.35,.37);
  vec3 color=mix(charcoal,smoke,density*(.55+uPulse*.35));
  gl_FragColor=vec4(color,1.0);
}`;

type Props = {active: boolean; reduced: boolean; pulse: MutableRefObject<number>};

export default function FooterFog({active, reduced, pulse}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sync = useRef<(() => void) | null>(null);
  const settings = useRef({active, reduced});
  settings.current = {active, reduced};

  useEffect(() => {
    const element = host.current;
    if (!element || matchMedia('(max-width: 767px)').matches) return;
    let renderer: THREE.WebGLRenderer;
    try {renderer = new THREE.WebGLRenderer({antialias: false, alpha: false, powerPreference: 'low-power'});} catch {return;}
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const geometry = new THREE.PlaneGeometry(2,2);
    const uniforms = {uTime: {value: 18}, uAspect: {value: 1}, uPulse: {value: 0}};
    const material = new THREE.ShaderMaterial({uniforms, fragmentShader, vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}'});
    scene.add(new THREE.Mesh(geometry,material));
    renderer.setPixelRatio(1);
    renderer.domElement.setAttribute('aria-hidden','true');
    element.append(renderer.domElement);
    let inView = false, subscribed = false, lost = false;
    const render = (_time = 0, delta = 16) => {
      if (lost) return;
      const dt = Math.min(delta / 1000, .05);
      if (!settings.current.reduced) {
        uniforms.uTime.value += dt;
        pulse.current *= Math.exp(-dt*3.8);
      }
      uniforms.uPulse.value = settings.current.reduced ? 0 : pulse.current;
      renderer.render(scene,camera);
    };
    const synchronize = () => {
      const visible = inView && settings.current.active && !document.hidden && !lost;
      const running = visible && !settings.current.reduced;
      if (running && !subscribed) {gsap.ticker.add(render); subscribed = true;}
      if (!running && subscribed) {gsap.ticker.remove(render); subscribed = false;}
      element.dataset.rendering = running ? 'running' : visible ? 'static' : 'paused';
      if (visible && settings.current.reduced) render();
    };
    const resize = () => {
      const {width,height} = element.getBoundingClientRect();
      // Fog is soft by design; a smaller backing buffer saves fill rate on wide displays.
      renderer.setSize(Math.max(1,Math.round(width*.65)),Math.max(1,Math.round(height*.65)),false);
      uniforms.uAspect.value = width / Math.max(1,height);
      if (inView && settings.current.active) render();
    };
    const observer = new IntersectionObserver(entries => {inView = entries[0].isIntersecting; synchronize();});
    const resizeObserver = new ResizeObserver(resize);
    const contextLost = (event: Event) => {event.preventDefault(); lost = true; synchronize(); element.dataset.fallback = 'true';};
    const contextRestored = () => {lost = false; delete element.dataset.fallback; resize(); synchronize();};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
    document.addEventListener('visibilitychange',synchronize);
    observer.observe(element); resizeObserver.observe(element); resize();
    sync.current = synchronize;
    return () => {
      sync.current = null;
      gsap.ticker.remove(render);
      observer.disconnect(); resizeObserver.disconnect();
      document.removeEventListener('visibilitychange',synchronize);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);
      geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [pulse]);
  useEffect(() => {sync.current?.();}, [active,reduced]);
  return <div ref={host} className="footer-fog" aria-hidden="true" />;
}
