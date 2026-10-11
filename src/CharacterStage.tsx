import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {buildStickerField, stickerCanvas} from './characterStickers';
import {createDiamondField} from './characterDiamonds';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Use the original colored character and the prepared, in-place Walk / Idle clips.
const MODEL = `${import.meta.env.BASE_URL}models/character.glb`;
const CHARACTER = {height: 2.8, walkSpeed: .85, headYaw: .24, headPitch: .13, cameraDistance: 5.6};

export interface CharacterJourney {expand: number; turn: number; stickers: number}

export function CharacterStage({journey}: {journey: RefObject<CharacterJourney>}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});}
    catch {setStatus('failed'); return;}
    setStatus('loading');
    let disposed = false, frame = 0, previous = 0, firstFrame = false, contextLost = false;
    let pendingWidth = 0, pendingHeight = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const lowPower = matchMedia('(max-width: 767px)').matches;
    const scene = new THREE.Scene();
    const lightBackground = new THREE.Color('#f3eff5'), darkBackground = new THREE.Color('#050507');
    const background = lightBackground.clone();
    scene.background = background;
    scene.fog = new THREE.Fog('#f3eff5', 10, 22);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 40);
    camera.position.set(0, 1.55, CHARACTER.cameraDistance);
    camera.lookAt(0, 1.45, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !lowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight('#ffffff', '#d4c5dc', 2));
    const key = new THREE.DirectionalLight('#fff3e9', 3.1);
    key.position.set(3, 6, 6); key.castShadow = !lowPower;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
    key.shadow.normalBias = .045; key.shadow.bias = -.0002;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#cedcff', 1.8);
    fill.position.set(-4, 3, 5); scene.add(fill);
    const rim = new THREE.DirectionalLight('#ffffff', 2.4);
    rim.position.set(-2, 5, -3); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({color: '#f3eff5', roughness: 1}));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.025;
    floor.receiveShadow = !lowPower; scene.add(floor);
    const turn = new THREE.Group(); scene.add(turn);
    let object: THREE.Group | undefined, mixer: THREE.AnimationMixer | undefined;
    let head: THREE.Bone | undefined, animatedHead: THREE.Quaternion | undefined;
    let gazeX = 0, gazeY = 0, driftTime = 0;
    const textureCache = new Map<string, THREE.CanvasTexture>();
    const stickers = buildStickerField(lowPower ? 24 : 34).map((spec, index) => {
      let texture = textureCache.get(spec.kind);
      if (!texture) {
        texture = new THREE.CanvasTexture(stickerCanvas(spec.kind));
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(spec.kind, texture);
      }
      const material = new THREE.SpriteMaterial({map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false});
      const sprite = new THREE.Sprite(material);
      // Every sticker stays behind the girl; a central opening keeps her silhouette clear.
      const side = index % 2 ? 1 : -1;
      const x = side * (1.3 + ((index * 7) % 11) / 10 * 3.1);
      const y = -.7 + ((index * 13) % 31) / 31 * 5.4;
      const z = -1.2 - (index % 4) * .38;
      const size = .95 + (index % 5) * .14;
      sprite.scale.set(size, size, 1);
      sprite.position.set(x, y, z);
      sprite.visible = false;
      scene.add(sprite);
      return {sprite, material, spec, x, y, z, size};
    });
    const diamonds = createDiamondField(scene, lowPower);
    const pointer = {x: 0, y: 0};
    const gesture = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const disposeObject = (group: THREE.Object3D) => {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      group.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        geometries.add(node.geometry);
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => {
          materials.add(material);
          Object.values(material).forEach(value => {if (value instanceof THREE.Texture) textures.add(value);});
        });
      });
      geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
    };
    const paint = (time: number) => {
      frame = 0;
      if (disposed || document.hidden || contextLost) return;
      // Sticky transforms and browser resizes can invalidate observer visibility.
      // Use the actual card bounds before drawing or suspending the animation.
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= innerHeight || bounds.right <= 0 || bounds.left >= innerWidth) {previous = 0; return;}
      if (pendingWidth > 0 && pendingHeight > 0) {
        renderer.setSize(pendingWidth, pendingHeight, false);
        camera.aspect = pendingWidth / pendingHeight;
        camera.position.z = Math.max(CHARACTER.cameraDistance, 3.7 / Math.max(.5, camera.aspect));
        camera.updateProjectionMatrix();
        pendingWidth = pendingHeight = 0;
      }
      const delta = Math.min(.05, previous ? (time - previous) / 1000 : 0); previous = time;
      if (head && animatedHead) head.quaternion.copy(animatedHead);
      if (!reduced.matches) mixer?.update(delta);
      if (head) {
        animatedHead?.copy(head.quaternion);
        gazeX = THREE.MathUtils.damp(gazeX, reduced.matches ? 0 : pointer.x, 6, delta);
        gazeY = THREE.MathUtils.damp(gazeY, reduced.matches ? 0 : pointer.y, 6, delta);
        euler.set(-gazeY * CHARACTER.headPitch, gazeX * CHARACTER.headYaw, 0);
        head.quaternion.multiply(gesture.setFromEuler(euler));
      }
      const chapter = journey.current;
      // Absolute scroll rotation is reversible and completes exactly one revolution.
      turn.rotation.y = chapter.turn * Math.PI * 2 - .12 * (1 - chapter.expand) + pointer.x * .035 * (1 - chapter.expand);
      background.copy(lightBackground).lerp(darkBackground, chapter.expand);
      (scene.fog as THREE.Fog).color.copy(background);
      floor.material.color.copy(background);
      floor.visible = chapter.expand < .98;
      if (!reduced.matches && chapter.stickers > .01) driftTime += delta;
      const spread = Math.max(.5, Math.min(1.4, camera.aspect / 1.5));
      stickers.forEach(({sprite, material, spec, x, y, z, size}) => {
        sprite.visible = chapter.stickers > .001;
        material.opacity = chapter.stickers;
        const travel = reduced.matches ? 0 : driftTime * (.17 + spec.speed * .2);
        const rise = ((y + .7 + travel) % 5.4) - .7;
        sprite.position.set(x * spread + Math.sin(driftTime * spec.speed + spec.phase) * .11, rise - (1 - chapter.stickers) * 1.8, z);
        material.rotation = spec.rot + (reduced.matches ? 0 : Math.sin(driftTime * .5 + spec.phase) * .1);
        const scale = size * (.75 + chapter.stickers * .25);
        sprite.scale.set(scale, scale, 1);
      });
      diamonds.update(chapter.stickers, driftTime, camera.aspect, reduced.matches);
      renderer.render(scene, camera);
      // Keep the poster until a frame containing the loaded model has been drawn.
      if (object && !firstFrame) {firstFrame = true; setStatus('ready');}
      if (!reduced.matches) frame = requestAnimationFrame(paint);
    };
    const schedule = () => {if (!frame && !document.hidden && !disposed && !contextLost) frame = requestAnimationFrame(paint);};
    new GLTFLoader().load(MODEL, gltf => {
      if (disposed) {disposeObject(gltf.scene); return;}
      object = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3());
      const scale = CHARACTER.height / bounds.getSize(new THREE.Vector3()).y;
      object.scale.setScalar(scale);
      object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      object.traverse(node => {
        if (node instanceof THREE.Mesh) {node.castShadow = !lowPower; node.receiveShadow = false; node.frustumCulled = false;}
        if (node instanceof THREE.Bone && /head(?:_\d+)?$/i.test(node.name)) head = node;
      });
      animatedHead = head?.quaternion.clone(); turn.add(object);
      mixer = new THREE.AnimationMixer(object);
      const clip = gltf.animations.find(value => /walk|walking/i.test(value.name)) ?? gltf.animations.find(value => /idle/i.test(value.name)) ?? gltf.animations[0];
      if (clip) {
        const inPlace = clip.clone();
        inPlace.tracks.forEach(track => {
          if (track instanceof THREE.VectorKeyframeTrack && /(hips|root|armature)[^/]*\.position$/i.test(track.name)) {
            for (let i = 0; i < track.values.length; i += 3) {track.values[i] = track.values[0]; track.values[i + 2] = track.values[2];}
          }
        });
        mixer.clipAction(inPlace).setEffectiveTimeScale(CHARACTER.walkSpeed).setLoop(THREE.LoopRepeat, Infinity).play();
        mixer.update(0);
      }
      schedule();
    }, event => {if (!disposed && event.total) setLoaded(Math.round(event.loaded / event.total * 100));}, () => {if (!disposed) setStatus('failed');});
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (width > 0 && height > 0) {pendingWidth = width; pendingHeight = height; schedule();}
    };
    const dimensions = new ResizeObserver(resize); dimensions.observe(element); resize();
    const observer = new IntersectionObserver(() => {previous = 0; schedule();}, {rootMargin: '100px'});
    observer.observe(element);
    const loseContext = (event: Event) => {
      event.preventDefault(); contextLost = true; firstFrame = false;
      cancelAnimationFrame(frame); frame = 0; setStatus('loading');
    };
    const restoreContext = () => {contextLost = false; previous = 0; resize();};
    renderer.domElement.addEventListener('webglcontextlost', loseContext);
    renderer.domElement.addEventListener('webglcontextrestored', restoreContext);
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
      pointer.y = THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height * 2, -1, 1); schedule();
    };
    const leave = () => {pointer.x = pointer.y = 0; schedule();};
    const visibility = () => {previous = 0; if (document.hidden) {cancelAnimationFrame(frame); frame = 0;} else schedule();};
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', schedule);
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', resize);
    return () => {
      disposed = true; cancelAnimationFrame(frame); dimensions.disconnect(); observer.disconnect();
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', schedule);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('webglcontextlost', loseContext);
      renderer.domElement.removeEventListener('webglcontextrestored', restoreContext);
      mixer?.stopAllAction(); if (object) {mixer?.uncacheRoot(object); disposeObject(object);}
      diamonds.dispose();
      stickers.forEach(({material}) => material.dispose()); textureCache.forEach(texture => texture.dispose());
      floor.geometry.dispose(); floor.material.dispose(); key.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [journey]);

  return <div ref={host} className={`character-stage ${status === 'ready' ? 'is-ready' : ''}`} role="img" aria-label="An animated girl, in her original purple outfit, walking, turning once as you scroll, with colorful stickers and glowing diamonds floating behind her">
    {status !== 'ready' && <div className="character-loading character-loading-note" role="status">{status === 'failed' ? 'The character preview could not load.' : <><span className="character-spinner" />Bringing her to life{loaded ? ` · ${loaded}%` : '…'}</>}</div>}
  </div>;
}
