import type { CSSProperties } from 'react';

export type Work = {
  title: string; category: string; poster: string; artist: string; alt: string;
  cropTop: number; cropHeight: number; cropLeft?: number; cropWidth?: number;
};
export const IMAGES = `${import.meta.env.BASE_URL}images/`;
export const WORK: Work[] = [
  {title:'Imagined worlds',category:'ENVIRONMENT • 3D • ANIMATION',poster:'imagined-worlds.webp',artist:'Merlin Perry',alt:'A spacecraft in a vividly colored imaginary landscape',cropTop:355,cropHeight:1260},
  {title:'Energy in motion',category:'ABSTRACT • LIGHTING • MOTION',poster:'kinetic-energy.webp',artist:'Cartesian Caramel',alt:'A glowing red and violet abstract sculpture',cropTop:165,cropHeight:1555},
  {title:'Character stories',category:'CHARACTER • 3D • ANIMATION',poster:'character-stories.webp',artist:'Aiman Samat',alt:'A green cartoon creature holding popcorn',cropTop:165,cropHeight:1555},
  {title:'Digital dreams',category:'ART • FORM • LIGHTING',poster:'digital-dreams.webp',artist:'STUDIO.OJAS',alt:'Flowing luminous blue sculptural forms',cropTop:165,cropHeight:1555},
  {title:'Small wonders',category:'WORLD BUILDING • 3D • LIGHTING',poster:'small-wonders.webp',artist:'charpu_art',alt:'An orange robot discovering a glowing forest',cropTop:255,cropHeight:1465},
  {title:'Human expressions',category:'CHARACTER • DETAIL • RENDERING',poster:'human-expressions.webp',artist:'LAWSON_CROSS',alt:'A detailed digital portrait in warm cinematic light',cropTop:165,cropHeight:1555},
  {title:'Motion playground',category:'CHARACTER • MOVEMENT • ANIMATION',poster:'motion-playground.webp',artist:'Blender showcase contributor',alt:'A stylized performer in a playful architectural scene',cropTop:165,cropHeight:1555},
  {title:'Golden hour',category:'CINEMA • ATMOSPHERE • LIGHTING',poster:'golden-hour.webp',artist:'Blender showcase contributor',alt:'A cinematic character surrounded by golden firelight',cropTop:370,cropHeight:1220},
  {title:'Sculpted spaces',category:'ARCHITECTURE • MODELING • DESIGN',poster:'sculpted-spaces.webp',artist:'TomSift Motion',alt:'A soaring green and purple vaulted architectural space',cropTop:180,cropHeight:1500,cropLeft:1012,cropWidth:915},
  {title:'Drawn to life',category:'ILLUSTRATION • CHARACTER • ART',poster:'drawn-to-life.webp',artist:'Blender showcase contributor',alt:'A luminous hand-drawn fantasy character',cropTop:200,cropHeight:1500,cropLeft:200,cropWidth:1450},
  {title:'Playful expressions',category:'CHARACTER • PERFORMANCE • ANIMATION',poster:'playful-expressions.webp',artist:'Blender showcase contributor',alt:'An expressive cartoon boy playing a game on a blue sofa',cropTop:375,cropHeight:735,cropLeft:60,cropWidth:1050},
  {title:'Crafted characters',category:'SCULPTING • MATERIALS • LIGHTING',poster:'crafted-characters.webp',artist:'Blender showcase contributor',alt:'A stylized portrait with sunglasses and warm amber lighting',cropTop:165,cropHeight:1555,cropLeft:1965,cropWidth:920},
  {title:'Crimson resolve',category:'CHARACTER • COLOR • ANIMATION',poster:'crimson-resolve.webp',artist:'Coupe de Foudre',alt:'A crimson and gold animated warrior framed by a glowing blade',cropTop:165,cropHeight:1555},
  {title:'Electric avenues',category:'MOTION • GRAPHICS • DESIGN',poster:'electric-avenues.webp',artist:'a3zakm11',alt:'A vivid blue city scene with electric yellow graphic accents',cropTop:165,cropHeight:1555,cropLeft:1005,cropWidth:930},
  {title:'Street stories',category:'CHARACTER • WORLD BUILDING • LIGHTING',poster:'street-stories.webp',artist:'Rodrigo Paulicchi',alt:'A playful cartoon police car and blue-uniformed characters in a warm orange street',cropTop:165,cropHeight:1555,cropLeft:620,cropWidth:2100},
  {title:'Color woven',category:'TYPOGRAPHY • MATERIALS • ART',poster:'color-woven.webp',artist:'Blender showcase contributor',alt:'Colorful woven letters in yellow, purple, teal and red on a pale textile background',cropTop:165,cropHeight:1555,cropLeft:800,cropWidth:1850},
];

/** Crop source screenshots without browser chrome; source pixels remain unchanged. */
export function cropStyle(work: Work, aspect=1.54): CSSProperties {
  const scale=Math.max(1,aspect/((work.cropWidth ?? 2940)/work.cropHeight));
  const center=(work.cropLeft ?? 0)+(work.cropWidth ?? 2940)/2;
  return {
    '--image-height':`${1912/work.cropHeight*scale*100}%`,
    '--image-top':`${(-work.cropTop/work.cropHeight*scale-(scale-1)/2)*100}%`,
    '--image-left':`${50-(center-1470)/work.cropHeight*scale/aspect*100}%`,
  } as CSSProperties;
}
