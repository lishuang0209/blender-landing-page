import { useEffect, useRef, useState, type RefObject } from 'react';

const VERTEX = `
precision mediump float;
attribute vec2 aUv;
varying vec2 vUv;
uniform float uBend;
void main() {
  vUv = aUv;
  vec2 p = aUv * 2.0 - 1.0;
  // Deform the actual video mesh: narrower waist, unequal edge heights, bowed edges.
  p.x *= 1.0 - uBend * 0.15 * (1.0 - p.y * p.y);
  p.y *= (1.0 + uBend * 0.20 * p.x) / (1.0 + uBend * 0.20);
  p.y -= uBend * 0.16 * sin(aUv.x * 3.14159265);
  p.y *= 1.0 - uBend * 0.09;
  gl_Position = vec4(p, 0.0, 1.0);
}`;
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uVideo;
uniform vec2 uSize;
uniform vec2 uCover;
uniform float uRadius;
uniform float uBend;
void main() {
  // Rounded corners follow the bent surface rather than clipping a rectangle.
  vec2 q = abs((vUv - 0.5) * uSize) - (uSize * 0.5 - uRadius);
  float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float alpha = 1.0 - smoothstep(-1.0, 1.0, distance);
  vec3 color = texture2D(uVideo, (vUv - 0.5) * uCover + 0.5).rgb;
  color *= 1.0 - uBend * 0.09 * sin(vUv.x * 3.14159265);
  gl_FragColor = vec4(color, alpha);
}`;

/** A subdivided WebGL video surface. Native video stays available as the fallback. */
export function WarpedVideo({ video }: { video: RefObject<HTMLVideoElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const surface = canvas.current;
    const source = video.current;
    const card = surface?.parentElement;
    const stage = surface?.closest<HTMLElement>('.reel-journey');
    if (!surface || !source || !card || !stage) return;
    const gl = surface.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) { surface.dataset.renderer = 'native-video: WebGL unavailable'; return; }
    surface.dataset.renderer = 'initializing';
    const shaders: WebGLShader[] = [];
    const compile = (kind: number, code: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader); gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader failed');
      return shader;
    };
    let program: WebGLProgram | null = null;
    let vertex: WebGLBuffer | null = null;
    let indices: WebGLBuffer | null = null;
    let texture: WebGLTexture | null = null;
    let frame = 0;
    let visible = false;
    let failed = false;
    let initialized = false;
    let lastVideoTime = -1;
    let width = card.clientWidth;
    let height = card.clientHeight;
    let progress = Number(getComputedStyle(stage).getPropertyValue('--reel-progress')) || 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const dispose = () => {
      cancelAnimationFrame(frame);
      if (vertex) gl.deleteBuffer(vertex);
      if (indices) gl.deleteBuffer(indices);
      if (texture) gl.deleteTexture(texture);
      if (program) gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
    try {
      program = gl.createProgram();
      if (!program) throw new Error('Program unavailable');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Link failed');
      gl.useProgram(program);
      // Adjustable mesh density: sufficient subdivisions for visibly curved edges.
      const columns = 80, rows = 40;
      const vertices = new Float32Array((columns + 1) * (rows + 1) * 2);
      const triangles = new Uint16Array(columns * rows * 6);
      let v = 0, t = 0;
      for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
        vertices[v++] = x / columns; vertices[v++] = y / rows;
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const a = y * (columns + 1) + x, b = a + 1, c = a + columns + 1, d = c + 1;
        triangles[t++] = a; triangles[t++] = b; triangles[t++] = c;
        triangles[t++] = b; triangles[t++] = d; triangles[t++] = c;
      }
      vertex = gl.createBuffer(); indices = gl.createBuffer(); texture = gl.createTexture();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
      const uv = gl.getAttribLocation(program, 'aUv');
      gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      const bendUniform = gl.getUniformLocation(program, 'uBend');
      const sizeUniform = gl.getUniformLocation(program, 'uSize');
      const coverUniform = gl.getUniformLocation(program, 'uCover');
      const radiusUniform = gl.getUniformLocation(program, 'uRadius');
      gl.uniform1i(gl.getUniformLocation(program, 'uVideo'), 0);
      const resizeBuffer = () => {
        // Keep a fixed viewport-sized buffer while CSS bounds animate: no per-frame reallocations.
        const dpr = Math.min(devicePixelRatio, 1.5);
        surface.width = Math.min(2560, Math.round(innerWidth * dpr));
        surface.height = Math.min(1440, Math.round(innerHeight * dpr));
        gl.viewport(0, 0, surface.width, surface.height);
      };
      resizeBuffer();
      const render = () => {
        frame = 0;
        if (!visible || document.hidden || failed) return;
        if (source.readyState >= 2 && source.videoWidth) {
          try {
            if (source.currentTime !== lastVideoTime || !initialized) {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
              lastVideoTime = source.currentTime;
            }
            // Adjustable bend strength. Both endpoints are flat; the middle is flexible.
            const bend = reduced.matches ? 0 : Math.pow(Math.sin(Math.PI * progress), .8);
            const aspect = width / Math.max(1, height);
            const videoAspect = source.videoWidth / source.videoHeight;
            gl.uniform1f(bendUniform, bend);
            gl.uniform2f(sizeUniform, width, height);
            gl.uniform2f(coverUniform, Math.min(1, aspect / videoAspect), Math.min(1, videoAspect / aspect));
            gl.uniform1f(radiusUniform, 24 - progress * 4);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);
            if (!initialized) { initialized = true; surface.dataset.renderer = 'webgl'; setReady(true); }
          } catch (error) {
            surface.dataset.renderer = `native-video: ${String(error)}`;
            failed = true; setReady(false); // Preserve native playback if video upload is unavailable.
          }
        }
        if (!failed) frame = requestAnimationFrame(render);
      };
      const schedule = () => { if (!frame && visible && !document.hidden && !failed) frame = requestAnimationFrame(render); };
      const motion = (event: Event) => { progress = (event as CustomEvent<{ progress: number }>).detail.progress; schedule(); };
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame = 0; } });
      observer.observe(card);
      const dimensions = new ResizeObserver(entries => { width = entries[0].contentRect.width; height = entries[0].contentRect.height; schedule(); });
      dimensions.observe(card);
      const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
      const contextLost = (event: Event) => { event.preventDefault(); failed = true; setReady(false); cancelAnimationFrame(frame); };
      stage.addEventListener('reel-motion', motion);
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('resize', resizeBuffer);
      surface.addEventListener('webglcontextlost', contextLost);
      return () => {
        observer.disconnect(); dimensions.disconnect();
        stage.removeEventListener('reel-motion', motion);
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('resize', resizeBuffer);
        surface.removeEventListener('webglcontextlost', contextLost);
        dispose();
      };
    } catch (error) {
      surface.dataset.renderer = `native-video: ${String(error)}`;
      dispose(); // Unsupported graphics fall back to the original HTML video.
    }
  }, [video]);
  return <canvas ref={canvas} className={`reel-surface ${ready ? 'is-ready' : ''}`} aria-hidden="true" />;
}
