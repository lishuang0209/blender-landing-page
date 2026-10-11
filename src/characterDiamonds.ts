import * as THREE from 'three';

// A shared, low-poly brilliant cut: table, crown, girdle and pavilion.
function diamondGeometry() {
  const points: THREE.Vector3[] = [];
  const sides = 8;
  for (const [radius, y] of [[.32, .35], [.61, 0], [.60, -.07]]) {
    for (let i = 0; i < sides; i++) {
      const a = i / sides * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
  }
  const top = points.push(new THREE.Vector3(0, .35, 0)) - 1;
  const tip = points.push(new THREE.Vector3(0, -.83, 0)) - 1;
  const positions: number[] = [];
  const triangle = (a: number, b: number, c: number) => [a,b,c].forEach(index => positions.push(...points[index].toArray()));
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    triangle(top, next, i);
    for (let ring = 0; ring < 2; ring++) {
      const a = ring * sides + i, b = ring * sides + next;
      const c = (ring + 1) * sides + i, d = (ring + 1) * sides + next;
      triangle(a, b, c); triangle(b, d, c);
    }
    triangle(i + 16, next + 16, tip);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(128,128,0,128,128,128);
  glow.addColorStop(0,'rgba(255,255,255,1)');
  glow.addColorStop(.035,'rgba(240,251,255,.95)');
  glow.addColorStop(.10,'rgba(184,222,255,.32)');
  glow.addColorStop(.35,'rgba(138,182,255,.07)');
  glow.addColorStop(1,'rgba(120,160,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,256,256);
  ctx.globalCompositeOperation = 'lighter';
  for (const rotation of [0,Math.PI / 2,Math.PI / 4,-Math.PI / 4]) {
    ctx.save(); ctx.translate(128,128); ctx.rotate(rotation);
    const ray = ctx.createLinearGradient(-120,0,120,0);
    ray.addColorStop(0,'rgba(210,233,255,0)'); ray.addColorStop(.49,'rgba(230,245,255,.38)'); ray.addColorStop(.5,'rgba(255,255,255,.75)'); ray.addColorStop(.51,'rgba(230,245,255,.38)'); ray.addColorStop(1,'rgba(210,233,255,0)');
    ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(-120,0); ctx.lineTo(0,-2.5); ctx.lineTo(120,0); ctx.lineTo(0,2.5); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function createDiamondField(scene: THREE.Scene, lowPower: boolean) {
  const geometry = diamondGeometry(), texture = glowTexture();
  const material = new THREE.ShaderMaterial({
    uniforms: {uReveal: {value: 0}}, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vWorld; varying vec3 vNormal;
      void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `uniform float uReveal; varying vec3 vWorld; varying vec3 vNormal;
      void main(){
        vec3 n=normalize(vNormal), view=normalize(cameraPosition-vWorld);if(!gl_FrontFacing)n=-n;
        vec3 reflection=reflect(-view,n);
        float edge=pow(1.-abs(dot(n,view)),2.6);
        vec3 spectrum=.5+.5*cos(6.28318*(reflection.x*.32+reflection.y*.27+reflection.z*.18+vec3(0.,.31,.62)));
        vec3 color=mix(vec3(.055,.13,.22),spectrum*.58,edge*.8+.24);
        float blue=pow(max(0.,dot(reflection,normalize(vec3(-.4,.8,1.)))),7.);
        float white=pow(max(0.,dot(reflection,normalize(vec3(.6,.65,1.)))),20.);
        float purple=pow(max(0.,dot(reflection,normalize(vec3(-.8,-.2,1.)))),12.);
        color+=vec3(.20,.79,1.)*blue*1.9+vec3(.64,.28,1.)*purple*.9+vec3(1.)*white*3.3;
        color+=vec3(.15,.4,.7)*edge;
        gl_FragColor=vec4(color,uReveal);
      }`,
  });
  const diamonds = Array.from({length: lowPower ? 16 : 28}, (_, i) => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry,material);
    const size = .25 + (i % 5) * .055; mesh.scale.setScalar(size);
    group.add(mesh);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:i%3===0?'#c5a7ff':'#b6efff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,opacity:0}));
    glow.position.set(size * .2, size * .2, size * .35); glow.scale.setScalar(size * 5); group.add(glow);
    group.visible = false; scene.add(group);
    const x = (i % 2 ? 1 : -1) * (1.05 + ((i * 11) % 19) / 19 * 3.7);
    const y = -.6 + ((i * 17) % 29) / 29 * 5.2, z = -2.8 - (i % 5) * .34;
    return {group, mesh, glow, size, x, y, z, phase: i * 1.71, speed: .16 + (i % 5) * .026};
  });
  return {
    update(reveal: number, time: number, aspect: number, reduced: boolean) {
      material.uniforms.uReveal.value = reveal;
      const spread = Math.max(.5, Math.min(1.4, aspect / 1.5));
      diamonds.forEach(({group,mesh,glow,x,y,z,phase,speed}) => {
        group.visible = reveal > .001;
        group.position.set(x * spread + Math.sin(time*.3 + phase)*.13, ((y + .6 + time*speed) % 5.2) - .6 - (1-reveal)*1.1,z);
        mesh.rotation.set(.4 + Math.sin(time*.24+phase)*.7, phase + time*.2, -.3 + Math.cos(time*.21+phase)*.5);
        const twinkle = reduced ? .3 : .18 + Math.pow(Math.max(0,Math.sin(time*.9+phase)),12)*.65;
        glow.material.opacity = reveal * twinkle;
      });
    },
    dispose() {diamonds.forEach(({group,glow})=>{scene.remove(group); glow.material.dispose();}); geometry.dispose(); material.dispose(); texture.dispose();},
  };
}
