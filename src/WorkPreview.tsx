import { useLayoutEffect, useRef, type CSSProperties } from 'react';

type Props = {
  work: { title: string; category: string; alt: string; artist: string };
  src: string;
  style: CSSProperties;
  origin: HTMLElement | null;
  onClose: () => void;
};

/** Shared-image transition: the selected card becomes the project cover and returns on close. */
export function WorkPreview({ work, src, style, origin, onClose }: Props) {
  const dialog=useRef<HTMLDialogElement>(null), figure=useRef<HTMLDivElement>(null);
  const animation=useRef<Animation|null>(null), closing=useRef(false);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  useLayoutEffect(()=>{
    const element=dialog.current, cover=figure.current;if(!element||!cover)return;
    const start=origin?.getBoundingClientRect();
    const overflow=document.body.style.overflow;
    element.showModal();document.body.style.overflow='hidden';
    const end=cover.getBoundingClientRect();
    if(start&&!reduced){
      animation.current=cover.animate([
        {transform:`translate(${start.left-end.left}px,${start.top-end.top}px) scale(${start.width/end.width},${start.height/end.height})`},
        {transform:'translate(0,0) scale(1)'},
      ],{duration:850,easing:'cubic-bezier(.76,0,.24,1)',fill:'both'});
      element.animate([{backgroundColor:'rgba(244,243,246,0)'},{backgroundColor:'#f4f3f6'}],{duration:700,fill:'both'});
    }
    return()=>{animation.current?.cancel();element.close();document.body.style.overflow=overflow;origin?.closest<HTMLButtonElement>('button')?.focus({preventScroll:true});};
  },[src,origin,reduced]);
  const close=async()=>{
    if(closing.current)return;closing.current=true;
    const cover=figure.current, element=dialog.current, end=origin?.getBoundingClientRect();
    if(cover&&element&&end&&!reduced){
      // Freeze an interrupted opening at its visible transform before reversing it.
      const transform=getComputedStyle(cover).transform;
      animation.current?.cancel();const start=cover.getBoundingClientRect();
      animation.current=cover.animate([
        {transform},
        {transform:`translate(${end.left-start.left}px,${end.top-start.top}px) scale(${end.width/start.width},${end.height/start.height})`},
      ],{duration:650,easing:'cubic-bezier(.76,0,.24,1)',fill:'both'});
      element.classList.add('is-closing');
      element.animate([{backgroundColor:'#f4f3f6'},{backgroundColor:'rgba(244,243,246,0)'}],{duration:650,fill:'both'});
      await animation.current.finished.catch(()=>{});
    }
    onClose();
  };
  return <dialog ref={dialog} className="work-dialog" aria-labelledby="project-preview-title" onCancel={event=>{event.preventDefault();void close();}}>
    <div className="project-preview-header"><span>BLENDER / SELECTED MOMENTS</span><button type="button" onClick={()=>void close()} aria-label="Back to selected moments">← BACK TO WORK</button></div>
    <div ref={figure} className="project-preview-cover" style={style}><div className="work-artwork"><img src={src} alt={work.alt} width="2940" height="1912" /></div></div>
    <div className="project-preview-caption"><div><p>{work.category}</p><h2 id="project-preview-title">{work.title}</h2></div><p className="project-preview-credit">ARTWORK CREDIT<br /><span>{work.artist}</span></p></div>
  </dialog>;
}
