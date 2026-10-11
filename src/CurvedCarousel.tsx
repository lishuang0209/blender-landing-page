import {useEffect,useRef,useState} from 'react';
import {cropStyle,IMAGES,type Work} from './workData';

const VERTEX=`precision highp float;
attribute vec2 aUv; varying vec2 vUv;
uniform float uCenter,uWidth,uHeight,uCamera,uMotion,uSpread,uBulge,uRestBulge,uEdgeDepth;
uniform float uWaveSpan,uSideBend,uEnvelope;
uniform vec2 uViewport;
void main(){
  vUv=aUv;
  // All cards sample ONE viewport-space surface. The wave is never restarted at a card edge.
  float x=uCenter+(aUv.x-.5)*uWidth;
  float distance=x/uSpread;
  // Central crest, lower shoulders, then a gentle recovery toward the outer edges.
  float fourth=distance*distance*distance*distance;
  float wave=(1.-.5*fourth)*exp(-.25*fourth);
  float edge=x/(uViewport.x*.5);
  float z=(uRestBulge+uMotion*uBulge)*wave-uRestBulge-uEdgeDepth*edge*edge*uMotion;
  // A shared lateral field expands the crest and pinches the shoulders at mid-height.
  // Its x derivative stays positive, so cards cannot fold or reverse as they travel.
  float waist=sin(3.14159265*aUv.y);
  float lateral=x/uWaveSpan;
  float shoulders=1.-exp(-2.*lateral*lateral);
  float curvedX=x+uSideBend*sin(3.14159265*lateral)*shoulders*waist;
  float y=(aUv.y-.5)*uHeight*(1.+uEnvelope*(wave-1.));
  gl_Position=vec4(curvedX*2.*uCamera/uViewport.x,y*2.*uCamera/uViewport.y,0.,uCamera-z);
}`;
const FRAGMENT=`precision highp float;
varying vec2 vUv; uniform sampler2D uImage;
uniform vec4 uCrop; uniform vec2 uCover,uSize;
uniform float uShade,uReveal,uPixelRatio,uRevealRadius;
uniform vec2 uPointer;
void main(){
  vec2 q=abs((vUv-.5)*uSize)-(uSize*.5-12.);
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-12.;
  vec2 uv=(vUv-.5)*uCover+.5;
  vec3 c=texture2D(uImage,uCrop.xy+uv*uCrop.zw).rgb;
  float gray=dot(c,vec3(.2126,.7152,.0722));
  // Reveal the original texture color ONLY within a soft circle around the pointer.
  // Screen-space distance stays aligned with the pointer on the deformed surface.
  float distanceToPointer=length(gl_FragCoord.xy/uPixelRatio-uPointer)/uRevealRadius;
  float reveal=(1.-smoothstep(.65,1.,distanceToPointer))*uReveal;
  c=mix(vec3(gray),c,reveal);
  gl_FragColor=vec4(c*uShade,1.-smoothstep(-1.,1.,d));
}`;
const wrap=(value:number,count:number)=>((value%count)+count)%count;
// Adjustable: one shared crest/trough profile, side-edge bending, and speed response.
// waveSpan is the distance from the central crest to the side pinch, in viewport widths.
const CURVE={restBulge:0,motionBulge:190,spread:.21,edgeDepth:.018,
  waveSpan:.26,restSideBend:0,motionSideBend:36,restEnvelope:0,motionEnvelope:.085,
  attack:90,release:380};
// Color responds independently of the mesh: hovering never starts deformation.
// The half-color contour covers roughly half of a flat card; the edge stays soft.
const COLOR={enter:100,leave:180,revealAreaFraction:1/2};
type Props={works:Work[];onSelect:(work:Work,origin:HTMLElement)=>void};

export function CurvedCarousel({works,onSelect}:Props){
  // Repeat the smaller lower collection around the track so its loop never has a gap.
  // These are copies of the lower works, not images from the upper grid.
  const renderedWorks=works.length<6?works.concat(works):works;
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const slides=useRef<(HTMLButtonElement|null)[]>([]);
  const controls=useRef({position:0,target:0,velocity:0,drag:false,moved:false,lastInput:0});
  const [active,setActive]=useState(0),[ready,setReady]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const element=host.current,surface=canvas.current;if(!element||!surface)return;
    setReady(false);setFailed(false);
    const state=controls.current,reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    let frame=0,last=performance.now(),visible=false,destroyed=false,lastIndex=-1;
    let displayedMotion=0,bendInput=false;
    let pointerInside=false,hoverX=0,hoverY=0;
    const revealAmounts=renderedWorks.map(()=>0);
    let width=0,height=0,cardWidth=0,cardHeight=0,camera=0,spread=0,bulge=0,edgeDepth=0,waveSpan=0;
    let sideBend=0,envelope=0,revealRadius=176;
    let pointer=0,previousX=0,startX=0,previousTime=0,release=0;
    const shaders:WebGLShader[]=[],textures:(WebGLTexture|null)[]=[],images:HTMLImageElement[]=[];
    let program:WebGLProgram|null=null,vertices:WebGLBuffer|null=null,indices:WebGLBuffer|null=null;
    let indexCount=0,uniforms:Record<string,WebGLUniformLocation|null>={},gpu=false;
    const disposeGpu=()=>{if(!gl)return;textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteBuffer(vertices);gl.deleteBuffer(indices);gl.deleteProgram(program);};
    try{
      if(!gl)throw Error('WebGL unavailable');
      const compile=(type:number,code:string)=>{const s=gl.createShader(type);if(!s)throw Error('Shader unavailable');shaders.push(s);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader compile failed');return s;};
      program=gl.createProgram();if(!program)throw Error('Program unavailable');gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);
      const columns=64,rows=32,v:number[]=[],t:number[]=[];
      for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)v.push(x/columns,y/rows);
      for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1;t.push(a,b,c,b,c+1,c);}
      vertices=gl.createBuffer();indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(t),gl.STATIC_DRAW);indexCount=t.length;
      const uv=gl.getAttribLocation(program,'aUv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
      for(const name of ['Center','Width','Height','Camera','Motion','Spread','Bulge','RestBulge','EdgeDepth','WaveSpan','SideBend','Envelope','Viewport','Crop','Cover','Size','Shade','Reveal','Pointer','PixelRatio','RevealRadius'])uniforms[name]=gl.getUniformLocation(program,`u${name}`);
      gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      let loaded=0;
      works.forEach((work,i)=>{const img=new Image();images.push(img);img.onload=()=>{
        if(destroyed)return;const tex=gl.createTexture();textures[i]=tex;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
        if(gl.getError()!==gl.NO_ERROR){setFailed(true);return;}
        if(++loaded===works.length){gpu=true;setReady(true);schedule();}
      };img.onerror=()=>{if(!destroyed)setFailed(true);};img.src=IMAGES+work.poster;});
    }catch{setFailed(true);}
    // Native hit targets sample the same continuous surface as the vertex shader.
    const project=(center:number,u:number,v:number)=>{
      const x=center+(u-.5)*cardWidth;
      const distance=x/spread,edge=x/(width*.5);
      const fourth=distance**4,wave=(1-.5*fourth)*Math.exp(-.25*fourth);
      const z=(CURVE.restBulge+displayedMotion*bulge)*wave-CURVE.restBulge-edgeDepth*edge*edge*displayedMotion;
      const lateral=x/waveSpan,shoulders=1-Math.exp(-2*lateral*lateral);
      const curvedX=x+sideBend*Math.sin(Math.PI*lateral)*shoulders*Math.sin(Math.PI*v);
      const scale=camera/(camera-z);
      return{x:width/2+curvedX*scale,y:height/2-(v-.5)*cardHeight*(1+envelope*(wave-1))*scale};
    };
    const paint=(time:number)=>{
      frame=0;const dt=Math.min(40,Math.max(1,time-last));last=time;
      if(!state.drag){
        state.target+=state.velocity*dt/16.67;state.velocity*=Math.exp(-dt/180);
        // Free inertial travel first, then gently settle at the nearest project.
        if(Math.abs(state.velocity)<.002 && time-state.lastInput>180)state.target+=(Math.round(state.target)-state.target)*(1-Math.exp(-dt/180));
      }
      const before=state.position;
      state.position=reduced.matches?state.target:state.position+(state.target-state.position)*(1-Math.exp(-dt/85));
      // Speed lifts the shared middle region equally in either sliding direction.
      const speed=(state.position-before)*1000/dt;
      const desiredMotion=reduced.matches||!bendInput?0:Math.tanh(Math.abs(speed)/1.2);
      const response=Math.abs(desiredMotion)>Math.abs(displayedMotion)?CURVE.attack:CURVE.release;
      displayedMotion=reduced.matches?0:displayedMotion+(desiredMotion-displayedMotion)*(1-Math.exp(-dt/response));
      if(Math.abs(displayedMotion)<.001&&Math.abs(desiredMotion)<.001)displayedMotion=0;
      // Flat at rest. Only pointer drag or wheel travel lifts and bends the shared surface.
      sideBend=Math.min(CURVE.restSideBend+displayedMotion*CURVE.motionSideBend,waveSpan*.16);
      envelope=CURVE.restEnvelope+displayedMotion*CURVE.motionEnvelope;
      if(Math.abs(state.target-state.position)<.0001 && Math.abs(state.velocity)<.0001){state.position=state.target;}
      const selected=wrap(Math.round(state.position),works.length);
      if(selected!==lastIndex){lastIndex=selected;setActive(selected);}
      const selectedInstance=wrap(Math.round(state.position),renderedWorks.length);
      const bounds=element.getBoundingClientRect();
      const pointerX=hoverX-bounds.left,pointerY=hoverY-bounds.top;
      let colorSettling=false;
      const order=renderedWorks.map((work,index)=>({work,index,relative:wrap(index-state.position+renderedWorks.length/2,renderedWorks.length)-renderedWorks.length/2})).sort((a,b)=>Math.abs(b.relative)-Math.abs(a.relative));
      if(gl&&gpu){
        gl.viewport(0,0,surface.width,surface.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uniforms.Viewport,width,height);
        gl.uniform1f(uniforms.Camera,camera);gl.uniform1f(uniforms.Width,cardWidth);gl.uniform1f(uniforms.Height,cardHeight);
        gl.uniform1f(uniforms.Motion,displayedMotion);gl.uniform1f(uniforms.Spread,spread);
        gl.uniform1f(uniforms.Bulge,bulge);gl.uniform1f(uniforms.RestBulge,CURVE.restBulge);gl.uniform1f(uniforms.EdgeDepth,edgeDepth);
        gl.uniform1f(uniforms.WaveSpan,waveSpan);gl.uniform1f(uniforms.SideBend,sideBend);gl.uniform1f(uniforms.Envelope,envelope);
        gl.uniform2f(uniforms.Size,cardWidth,cardHeight);
        gl.uniform2f(uniforms.Pointer,pointerX,height-pointerY);
        gl.uniform1f(uniforms.PixelRatio,surface.width/width);
        gl.uniform1f(uniforms.RevealRadius,revealRadius);
      }
      order.forEach(({work,index,relative})=>{
        const center=relative*(cardWidth+32),b=slides.current[index];if(!b)return;
        // Sample every edge, including mid-height waist extrema, for matching native hit areas.
        const samples=Array.from({length:17},(_,n)=>n/16);
        const points=[...samples.map(u=>project(center,u,1)),...samples.map(v=>project(center,1,1-v)),
          ...samples.map(u=>project(center,1-u,0)),...samples.map(v=>project(center,0,v))];
        const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
        const shown=Math.abs(center)<width*.85+cardWidth*.5&&right>0&&left<width;
        // Test the deformed outline, so hover follows the visible image during inertia.
        let inside=false;
        if(shown&&pointerInside&&pointerX>=left&&pointerX<=right&&pointerY>=top&&pointerY<=bottom){
          for(let i=0,j=points.length-1;i<points.length;j=i++){
            const a=points[i],p=points[j];
            if((a.y>pointerY)!==(p.y>pointerY)&&pointerX<(p.x-a.x)*(pointerY-a.y)/(p.y-a.y)+a.x)inside=!inside;
          }
        }
        const colorTarget=inside?1:0;
        const colorResponse=colorTarget>revealAmounts[index]?COLOR.enter:COLOR.leave;
        revealAmounts[index]=reduced.matches?colorTarget:revealAmounts[index]+(colorTarget-revealAmounts[index])*(1-Math.exp(-dt/colorResponse));
        if(Math.abs(colorTarget-revealAmounts[index])<.001)revealAmounts[index]=colorTarget;
        else colorSettling=true;
        const shade=1-Math.min(.42,Math.abs(center)/width*.65);
        const outline=points.map(p=>`${(p.x-left).toFixed(2)}px ${(p.y-top).toFixed(2)}px`).join(',');
        b.style.cssText=`left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px;clip-path:polygon(${outline});z-index:${Math.round(100-Math.abs(center)/width*30)};visibility:${shown?'visible':'hidden'};--artwork-brightness:${shade};--artwork-reveal:${revealAmounts[index]};--reveal-x:${pointerX-left}px;--reveal-y:${pointerY-top}px;--reveal-radius:${revealRadius}px;`;
        b.tabIndex=selectedInstance===index?0:-1;b.setAttribute('aria-current',String(selectedInstance===index));
        if(!shown||!gl||!gpu)return;
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[index%works.length]);gl.uniform1f(uniforms.Center,center);
        gl.uniform1f(uniforms.Shade,shade);
        gl.uniform1f(uniforms.Reveal,revealAmounts[index]);
        const cropWidth=work.cropWidth??2940,aspect=cropWidth/work.cropHeight,boxAspect=cardWidth/cardHeight;
        gl.uniform4f(uniforms.Crop,(work.cropLeft??0)/2940,1-(work.cropTop+work.cropHeight)/1912,cropWidth/2940,work.cropHeight/1912);
        gl.uniform2f(uniforms.Cover,Math.min(1,boxAspect/aspect),Math.min(1,aspect/boxAspect));
        gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
      });
      if(visible&&(colorSettling||state.drag||Math.abs(state.target-state.position)>.0001||Math.abs(state.target-Math.round(state.target))>.001||Math.abs(state.velocity)>.0001||Math.abs(displayedMotion)>.001))schedule();
    };
    function schedule(){if(!frame&&visible&&!document.hidden&&!destroyed)frame=requestAnimationFrame(paint);}
    const resize=()=>{
      width=element.clientWidth;height=element.clientHeight;
      // 3:4 cards and 32px gaps travel across a stationary, shared gallery curve.
      cardHeight=Math.min(420,height*.70);cardWidth=cardHeight*.75;
      revealRadius=Math.sqrt(cardWidth*cardHeight*COLOR.revealAreaFraction/Math.PI)/.825;
      camera=Math.max(1100,width*1.2);spread=width*CURVE.spread;edgeDepth=width*CURVE.edgeDepth;waveSpan=width*CURVE.waveSpan;
      // Keep the closest portion within the stage even at maximum speed.
      bulge=Math.min(CURVE.motionBulge,camera*(1-cardHeight/(height*.96)));
      const dpr=Math.min(devicePixelRatio,1.5);surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);
      // Resizing clears the drawing buffer: repaint even when the carousel is at rest.
      cancelAnimationFrame(frame);frame=0;paint(performance.now());
    };
    const down=(event:PointerEvent)=>{if(event.button!==0)return;pointer=event.pointerId;startX=previousX=event.clientX;previousTime=performance.now();state.drag=true;state.moved=false;state.velocity=0;state.target=state.position;schedule();};
    // Capture only after a drag starts, so an ordinary card click keeps its native target.
    const trackHover=(event:PointerEvent)=>{pointerInside=event.pointerType!=='touch';hoverX=event.clientX;hoverY=event.clientY;schedule();};
    const leave=()=>{pointerInside=false;schedule();};
    const move=(event:PointerEvent)=>{trackHover(event);if(!state.drag||event.pointerId!==pointer)return;const now=performance.now(),dx=event.clientX-previousX;if(!state.moved&&Math.abs(event.clientX-startX)>5){state.moved=true;element.setPointerCapture(pointer);element.classList.add('is-dragging');}if(state.moved){bendInput=true;const delta=-dx/(cardWidth+32);state.target+=delta;state.velocity=delta/Math.max(8,now-previousTime)*16.67;state.lastInput=now;}previousX=event.clientX;previousTime=now;schedule();};
    const up=()=>{if(!state.drag)return;state.drag=false;if(performance.now()-previousTime>90||reduced.matches)state.velocity=0;if(reduced.matches)state.target=Math.round(state.target);release=performance.now();element.classList.remove('is-dragging');if(element.hasPointerCapture(pointer))element.releasePointerCapture(pointer);schedule();};
    const wheel=(event:WheelEvent)=>{if(event.ctrlKey)return;const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?height:1);if(!delta)return;
      // Horizontal gestures loop; vertical wheel releases the page at either end.
      const vertical=!event.shiftKey&&Math.abs(event.deltaY)>=Math.abs(event.deltaX);
      if(vertical){const cycle=Math.floor((state.position+.05)/works.length)*works.length;state.position-=cycle;state.target-=cycle;
        if((state.target<=.05&&delta<0)||(state.target>=works.length-1-.05&&delta>0))return;}
      event.preventDefault();bendInput=true;state.target+=delta/(cardWidth+32)*.85;if(vertical)state.target=Math.max(0,Math.min(works.length-1,state.target));state.velocity=0;state.lastInput=performance.now();schedule();};
    const selectEvent=(event:Event)=>{bendInput=false;const detail=(event as CustomEvent<number>).detail;const current=wrap(state.position,works.length);let delta=detail-current;if(delta>works.length/2)delta-=works.length;if(delta<-works.length/2)delta+=works.length;state.target=state.position+delta;state.velocity=0;state.lastInput=performance.now();schedule();};
    const key=(event:KeyboardEvent)=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();bendInput=false;state.target=Math.round(state.target)+(event.key==='ArrowRight'?1:-1);state.velocity=0;state.lastInput=performance.now();schedule();};
    const clickCapture=(event:MouseEvent)=>{if(state.moved&&performance.now()-release<400){event.preventDefault();event.stopPropagation();}};
    const loss=(event:Event)=>{event.preventDefault();gpu=false;setReady(false);setFailed(true);};
    const visibility=()=>{if(document.hidden){pointerInside=false;cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}};
    document.addEventListener('visibilitychange',visibility);
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=performance.now();schedule();}else{cancelAnimationFrame(frame);frame=0;}});observer.observe(element);
    const dimensions=new ResizeObserver(resize);dimensions.observe(element);resize();
    element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);element.addEventListener('wheel',wheel,{passive:false});element.addEventListener('keydown',key);element.addEventListener('zeyna-select',selectEvent);element.addEventListener('click',clickCapture,true);surface.addEventListener('webglcontextlost',loss);reduced.addEventListener('change',resize);
    element.addEventListener('pointerenter',trackHover);element.addEventListener('pointerleave',leave);
    return()=>{destroyed=true;document.removeEventListener('visibilitychange',visibility);cancelAnimationFrame(frame);observer.disconnect();dimensions.disconnect();images.forEach(i=>{i.onload=null;i.onerror=null;});disposeGpu();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);element.removeEventListener('wheel',wheel);element.removeEventListener('keydown',key);element.removeEventListener('zeyna-select',selectEvent);element.removeEventListener('click',clickCapture,true);surface.removeEventListener('webglcontextlost',loss);reduced.removeEventListener('change',resize);element.removeEventListener('pointerenter',trackHover);element.removeEventListener('pointerleave',leave);};
  },[works]);
  const select=(index:number)=>host.current?.dispatchEvent(new CustomEvent('zeyna-select',{detail:wrap(index,works.length)}));
  return <div className="zeyna-carousel" role="region" aria-label="Blender artwork carousel">
    <div className="zeyna-topline"><span>A COLLECTION IN MOTION / {String(works.length).padStart(2,'0')} ARTWORKS</span><span>DRAG OR SCROLL TO EXPLORE ↔</span></div>
    <div ref={host} className={`zeyna-stage ${ready&&!failed?'is-ready':''}`} tabIndex={0} aria-label="Drag, scroll or use arrow keys to browse artworks">
      <canvas ref={canvas} className="zeyna-canvas" aria-hidden="true" />
      {renderedWorks.map((work,i)=><button key={`${work.poster}-${i}`} ref={node=>{slides.current[i]=node;}} className="zeyna-card" aria-label={`View ${work.title}`} onClick={event=>{if(event.currentTarget.getAttribute('aria-current')!=='true')select(i);else onSelect(work,event.currentTarget);}}>
        <div className="zeyna-fallback" style={cropStyle(work,.75)}><div className="work-artwork"><img src={IMAGES+work.poster} alt={work.alt} width="2048" height="1332" draggable={false}/></div></div>
        <div className="zeyna-fallback zeyna-color-reveal" style={cropStyle(work,.75)} aria-hidden="true"><div className="work-artwork"><img src={IMAGES+work.poster} alt="" width="2048" height="1332" draggable={false}/></div></div>
        <span className="zeyna-open" aria-hidden="true">↗</span>
      </button>)}
    </div>
    <div className="zeyna-bottom">
      <div className="zeyna-project" aria-live="polite"><span>{works[active].category}</span><button onClick={()=>{const slide=slides.current.find(node=>node?.getAttribute('aria-current')==='true');if(slide)onSelect(works[active],slide);}}>{works[active].title}<span aria-hidden="true"> ↗</span></button></div>
      <div className="zeyna-navigation"><button aria-label="Previous artwork" onClick={()=>select(active-1)}>←</button><span>{String(active+1).padStart(2,'0')} / {String(works.length).padStart(2,'0')}</span><button aria-label="Next artwork" onClick={()=>select(active+1)}>→</button></div>
    </div>
    {failed && <p className="zeyna-status" role="status">3D preview unavailable. Browse the artwork images with the arrow controls.</p>}
    <div className="zeyna-index" aria-label="Choose an artwork">{works.map((work,i)=><button key={work.poster} onClick={()=>select(i)} aria-label={`Show ${work.title}`} aria-current={active===i?'true':undefined}>{String(i+1).padStart(2,'0')}</button>)}</div>
  </div>;
}
