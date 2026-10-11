import { useEffect, useRef, useState } from 'react';

const VERTEX = `precision mediump float;
attribute vec2 aUv; varying vec2 vUv;
void main(){
  // Keep the image rigid. CSS applies a real perspective projection to the whole card.
  vUv=aUv;
  gl_Position=vec4(aUv*2.0-1.0,0.0,1.0);
}`;
const FRAGMENT = `precision mediump float;
varying vec2 vUv; uniform sampler2D uImage; uniform vec4 uCrop;
uniform vec2 uSize; uniform vec2 uCover; uniform float uProgress; uniform float uHover;
void main(){
  vec2 q=abs((vUv-0.5)*uSize)-(uSize*0.5-22.0);
  float d=length(max(q,0.0))+min(max(q.x,q.y),0.0)-22.0;
  vec2 uv=(vUv-0.5)*uCover/(1.12+uHover*0.035)+0.5;
  uv.y+=(uProgress-0.5)*0.055;
  vec3 color=texture2D(uImage,uCrop.xy+uv*uCrop.zw).rgb;
  gl_FragColor=vec4(color,1.0-smoothstep(-1.0,1.0,d));
}`;

/** Static image texture with subtle parallax. The parent plane handles 3D perspective. */
export function WarpedImage({ cropTop, cropHeight }: { cropTop: number; cropHeight: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const surface=canvas.current, card=surface?.closest<HTMLElement>('.work-card');
    const source=card?.querySelector('img'), box=surface?.parentElement;
    if(!surface||!card||!source||!box) return;
    const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if(!gl) return;
    const shaders:WebGLShader[]=[];
    let program:WebGLProgram|null=null, vertex:WebGLBuffer|null=null, indices:WebGLBuffer|null=null, texture:WebGLTexture|null=null;
    let frame=0, visible=false, loaded=false, failed=false, initialized=false, progress=.5, hover=0, targetHover=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const dispose=()=>{cancelAnimationFrame(frame); shaders.forEach(s=>gl.deleteShader(s)); gl.deleteBuffer(vertex);gl.deleteBuffer(indices);gl.deleteTexture(texture);gl.deleteProgram(program);};
    try {
      const compile=(kind:number,code:string)=>{const s=gl.createShader(kind);if(!s)throw Error('Shader unavailable');shaders.push(s);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader failed');return s;};
      program=gl.createProgram();if(!program)throw Error('Program unavailable');
      gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Link failed');gl.useProgram(program);
      const columns=1, rows=1, vertices:number[]=[], triangles:number[]=[];
      for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)vertices.push(x/columns,y/rows);
      for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1;triangles.push(a,b,c,b,c+1,c);}
      vertex=gl.createBuffer();indices=gl.createBuffer();texture=gl.createTexture();
      gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(triangles),gl.STATIC_DRAW);
      const uv=gl.getAttribLocation(program,'aUv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      const loc=(name:string)=>gl.getUniformLocation(program!,name);
      const uniforms={size:loc('uSize'),cover:loc('uCover'),progress:loc('uProgress'),hover:loc('uHover')};
      gl.uniform1i(loc('uImage'),0);gl.uniform4f(loc('uCrop'),0,1-(cropTop+cropHeight)/1912,1,cropHeight/1912);
      const render=()=>{
        frame=0;if(!visible||!loaded||failed||document.hidden)return;
        hover+=(targetHover-hover)*.14;
        const w=box.clientWidth,h=box.clientHeight,aspect=w/h,imageAspect=2940/cropHeight;
        gl.uniform2f(uniforms.size,w,h);gl.uniform2f(uniforms.cover,Math.min(1,aspect/imageAspect),Math.min(1,imageAspect/aspect));
        gl.uniform1f(uniforms.progress,reduced.matches ? .5 : progress);
        gl.uniform1f(uniforms.hover,reduced.matches?0:hover);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,triangles.length,gl.UNSIGNED_SHORT,0);
        if(!initialized){initialized=true;surface.dataset.renderer='webgl';setReady(true);}
        if(Math.abs(hover-targetHover)>.001)frame=requestAnimationFrame(render);
      };
      const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
      const resize=()=>{const dpr=Math.min(devicePixelRatio,1.5);surface.width=Math.round(box.clientWidth*dpr);surface.height=Math.round(box.clientHeight*dpr);gl.viewport(0,0,surface.width,surface.height);schedule();};
      const upload=()=>{if(loaded||!source.naturalWidth)return;try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);loaded=true;schedule();}catch{failed=true;setReady(false);}};
      const motion=(event:Event)=>{progress=(event as CustomEvent<{progress:number}>).detail.progress;schedule();};
      const enter=()=>{targetHover=1;schedule();};const leave=()=>{targetHover=0;schedule();};
      const loss=(event:Event)=>{event.preventDefault();failed=true;setReady(false);cancelAnimationFrame(frame);};
      const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){upload();schedule();}});observer.observe(card);
      const dimensions=new ResizeObserver(resize);dimensions.observe(box);
      const visibility=()=>{if(!document.hidden)schedule();};
      card.addEventListener('work-motion',motion);card.addEventListener('pointerenter',enter);card.addEventListener('pointerleave',leave);
      source.addEventListener('load',upload);surface.addEventListener('webglcontextlost',loss);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',schedule);
      resize();
      return()=>{observer.disconnect();dimensions.disconnect();card.removeEventListener('work-motion',motion);card.removeEventListener('pointerenter',enter);card.removeEventListener('pointerleave',leave);source.removeEventListener('load',upload);surface.removeEventListener('webglcontextlost',loss);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',schedule);dispose();};
    }catch{dispose();}
  },[cropTop,cropHeight]);
  return <canvas ref={canvas} className={`work-surface ${ready?'is-ready':''}`} aria-hidden="true" />;
}
