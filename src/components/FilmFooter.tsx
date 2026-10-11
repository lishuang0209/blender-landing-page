import {lazy, Suspense, useLayoutEffect, useRef, useState} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {FooterCTA} from './FooterCTA';
import {FooterWireLogo} from './FooterWireLogo';
import {usePluckAudio} from '../hooks/usePluckAudio';
import {useLenis} from '../hooks/useLenis';
import {useReducedMotion} from '../hooks/useReducedMotion';
import './filmFooter.css';

const FooterFog = lazy(() => import('./FooterFog'));
gsap.registerPlugin(ScrollTrigger);

/** This overlay starts only after the existing movie gallery has settled. */
export function FilmFooter() {
  const root = useRef<HTMLElement>(null);
  const pulse = useRef(0);
  const reduced = useReducedMotion();
  const audio = usePluckAudio();
  const [warmFog,setWarmFog] = useState(false);
  const [fogActive,setFogActive] = useState(false);
  const [wireActive,setWireActive] = useState(false);
  useLenis(root,reduced);

  useLayoutEffect(() => {
    const footer = root.current;
    const section = footer?.closest<HTMLElement>('.film-journey');
    const stage = section?.querySelector<HTMLElement>('.film-motion-stage');
    if (!footer || !section || !stage) return;
    if (reduced) {
      footer.inert = false;
      setWarmFog(true); setFogActive(true); setWireActive(true);
      return;
    }
    let synchronizeViewport = () => {};
    const context = gsap.context(() => {
      const timeline = gsap.timeline({paused: true, defaults: {ease: 'none'}});
      const words = footer.querySelectorAll('.footer-cta-word');
      const metadata = footer.querySelectorAll('.footer-cta-eyebrow, .footer-cta-details, .footer-bottom');
      // Timeline units equal the existing section's normalized percentage.
      // 0–79 leaves the approved heading, helix and six-cover grid untouched.
      timeline.to({hold: 0},{hold: 1,duration: 100},0)
        .set(footer,{autoAlpha: 0},0)
        .set(footer,{autoAlpha: 1},79)
        .fromTo(footer.querySelector('.footer-black-cover'),{opacity: 0},{opacity: 1,duration: 3},89)
        .fromTo(footer.querySelector('.footer-local-header'),{autoAlpha: 0},{autoAlpha: 1,duration: 3},93)
        .fromTo(section.querySelector('.film-motion-topline'),{autoAlpha: 1},{autoAlpha: 0,duration: 4},85)
        .fromTo(words,{autoAlpha: 0,y: 32,filter: 'blur(14px)'},{autoAlpha: 1,y: 0,filter: 'blur(0px)',duration: 3,stagger: .45,ease: 'power2.out'},92)
        .fromTo(metadata,{autoAlpha: 0,y: 16},{autoAlpha: 1,y: 0,duration: 2,stagger: .5},94)
        .fromTo(footer.querySelectorAll('.footer-cta-rule'),{scaleX: 0},{scaleX: 1,duration: 3,stagger: .8},94)
        .fromTo(footer.querySelector('.footer-atmosphere'),{autoAlpha: 0},{autoAlpha: 1,duration: 5},92)
        .fromTo(footer.querySelector('.footer-wire-wrap'),{autoAlpha: 0,y: 28},{autoAlpha: 1,y: 0,duration: 4,ease: 'power2.out'},94);
      const synchronize = () => {
        const time = timeline.time();
        const rect = stage.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        footer.inert = time < 93 || !inView;
        footer.dataset.phase = time < 92 ? 'stripe-wipe' : time < 98 ? 'headline' : 'wire-logo';
        setWarmFog(current => current || time >= 83);
        setFogActive(time >= 92 && inView);
        setWireActive(time >= 97 && inView);
      };
      synchronizeViewport = synchronize;
      timeline.eventCallback('onUpdate',synchronize);
      ScrollTrigger.create({
        trigger: section, start: 'top top',
        end: () => `+=${Math.max(1,section.offsetHeight-stage.offsetHeight)}`,
        animation: timeline, scrub: .35, invalidateOnRefresh: true,
        onUpdate: synchronize, onRefresh: synchronize, onToggle: synchronize,
      });
      synchronize();
    },footer);
    // Progress stays at 100% after the sticky scene exits; also track its bounds.
    window.addEventListener('scroll',synchronizeViewport,{passive: true});
    return () => {window.removeEventListener('scroll',synchronizeViewport); context.revert();};
  }, [reduced]);

  return <footer ref={root} className="film-footer" aria-label="Create with Blender, interactive wire logo and smoke">
    <div className="footer-black-cover" aria-hidden="true" />
    <div className="footer-atmosphere" aria-hidden="true">{warmFog && <Suspense fallback={null}><FooterFog active={fogActive} reduced={reduced} pulse={pulse} /></Suspense>}</div>
    <div className="footer-local-header"><a href="#home" aria-label="Back to Blender home"><img src={`${import.meta.env.BASE_URL}blender-official-icon.svg`} width="32" height="32" alt="" aria-hidden="true" />BLENDER</a><button type="button" className="footer-sound-toggle" aria-pressed={audio.enabled} onClick={audio.toggle} aria-label={audio.enabled ? 'Turn off wire logo sound' : 'Enable wire logo sound'}><span aria-hidden="true">{audio.enabled ? '◖))' : '◖×'}</span> SOUND {audio.enabled ? 'ON' : 'OFF'}</button></div>
    <FooterCTA />
    <FooterWireLogo active={wireActive} reduced={reduced} pulse={pulse} onPluck={audio.pluck} />
    <div className="footer-bottom"><span>FREE. OPEN SOURCE. YOURS TO EXPLORE.</span><button type="button" onClick={audio.toggle} aria-pressed={audio.enabled}>SOUND {audio.enabled ? 'ON' : 'OFF'} <span aria-hidden="true">·</span> HOVER THE LINES</button><a href="#home">BACK TO TOP ↑</a></div>
    {audio.error && <p className="footer-audio-error" role="status">{audio.error}</p>}
  </footer>;
}
