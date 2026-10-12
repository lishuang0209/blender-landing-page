import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import type {CharacterJourney} from './CharacterStage';

const CharacterStage = lazy(() => import('./CharacterStage').then(module => ({default: module.CharacterStage})));
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (value: number, start: number, end: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
// A single route spans the heading and tablet; a rounded ribbon travels along it.
const RIBBON_ROUTE = 'M 1530 65 C 1200 185 1080 -40 700 100 C 330 230 190 385 365 480 C 595 610 1015 610 1020 400 C 1025 175 1190 165 1215 335 C 1240 540 1190 850 1550 980';

function Ribbon({name}: {name: string}) {
  return <svg className="experience-ribbon" viewBox="0 0 1440 1100" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={name} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#18b8d5" /><stop offset=".5" stopColor="#59e4ea" /><stop offset="1" stopColor="#85fff4" /></linearGradient></defs>
    <path pathLength="1" d={RIBBON_ROUTE} fill="none" stroke={`url(#${name})`} strokeWidth="34" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export function CharacterExperience() {
  const root = useRef<HTMLElement>(null), journey = useRef<HTMLDivElement>(null);
  const sceneState = useRef<CharacterJourney>({expand: 0, turn: 0, stickers: 0});
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = root.current, track = journey.current;
    if (!element || !track) return;
    const heading = element.querySelector<HTMLElement>('.experience-heading');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0, displayed: number | undefined, ribbonTravel: number | undefined;
    let headingHeight = 0;
    const measureRibbon = () => {
      headingHeight = heading?.getBoundingClientRect().height ?? 0;
      element.style.setProperty('--experience-heading-height', `${headingHeight}px`);
      element.style.setProperty('--experience-ribbon-height', `${headingHeight + window.innerHeight}px`);
      schedule();
    };
    const paint = (time: number) => {
      frame = 0;
      const elapsed = Math.min(50, Math.max(1, previous ? time - previous : 16)); previous = time;
      const height = window.innerHeight, width = document.documentElement.clientWidth;
      const bounds = track.getBoundingClientRect();
      // Prepare the model while the preceding gallery is still visible.
      if (bounds.top < height * 3 && bounds.bottom > 0) setNear(true);
      const target = clamp(-bounds.top / Math.max(1, bounds.height - height));
      displayed = displayed === undefined || reduced.matches ? target : mix(displayed, target, 1 - Math.exp(-elapsed / 95));
      const progress = displayed;
      // Scroll chapters: expand, hold the headline, turn once, then let the stickers rise.
      const expand = phase(progress, .035, .32);
      const turn = phase(progress, .46, .73);
      const stickers = phase(progress, .71, .83);
      sceneState.current = {expand, turn: reduced.matches ? 0 : turn, stickers};
      const mobile = width < 768;
      const cardWidth = mobile ? width * .87 : width * .46;
      const cardHeight = mobile ? Math.min(height * .49, cardWidth / .85) : Math.min(height * .68, cardWidth / 1.3 + 48);
      const cardLeft = mobile ? width * .065 : width * .052;
      const cardTop = mobile ? height * .10 : (height - cardHeight) * .47;
      const set = (key: string, value: string | number) => element.style.setProperty(key, String(value));
      set('--experience-card-left', `${mix(cardLeft, 0, expand)}px`);
      set('--experience-card-top', `${mix(cardTop, 0, expand)}px`);
      set('--experience-card-width', `${mix(cardWidth, width, expand)}px`);
      set('--experience-card-height', `${mix(cardHeight, height, expand)}px`);
      set('--experience-screen-bg', `rgb(${Math.round(mix(243,5,expand))} ${Math.round(mix(239,5,expand))} ${Math.round(mix(245,7,expand))})`);
      set('--experience-card-padding', `${mix(mobile ? 14 : 22, 0, expand)}px`);
      set('--experience-card-radius', `${mix(mobile ? 25 : 38, 0, expand)}px`);
      set('--experience-screen-radius', `${mix(mobile ? 13 : 20, 0, expand)}px`);
      set('--experience-card-border', `${mix(2, 0, expand)}px`);
      set('--experience-card-ry', `${reduced.matches ? 0 : mix(-9, 0, expand)}deg`);
      set('--experience-card-rz', `${reduced.matches ? 0 : mix(-2, 0, expand)}deg`);
      set('--experience-intro-opacity', 1 - phase(progress, .04, .19));
      set('--experience-frame-opacity', 1 - phase(progress, .13, .28));
      set('--experience-headline-opacity', phase(progress, .26, .37) * (1 - phase(progress, .48, .62)));
      set('--experience-headline-y', `${mix(36, 0, phase(progress, .26, .37)) - phase(progress, .48, .62) * 35}px`);
      set('--experience-sticker-opacity', stickers);
      element.dataset.chapter = progress < .32 ? 'expand' : progress < .46 ? 'headline' : progress < .73 ? 'turn' : 'stickers';
      const rootBounds = element.getBoundingClientRect();
      // Scroll advances both ends along the route, rather than making the curve sway.
      // The 72%-long segment first enters from the right, then travels down the loop.
      const travelTarget = clamp((height - rootBounds.top) / (headingHeight + height * 1.26)) * 1.12;
      ribbonTravel = ribbonTravel === undefined || reduced.matches ? travelTarget : mix(ribbonTravel, travelTarget, 1 - Math.exp(-elapsed / 110));
      set('--experience-ribbon-offset', .72 - ribbonTravel);
      if (Math.abs(target - progress) > .0001 || Math.abs(travelTarget - ribbonTravel) > .0001) schedule();
    };
    function schedule() {if (!frame && !document.hidden) frame = requestAnimationFrame(paint);}
    const enter = new IntersectionObserver(entries => {if (entries[0].isIntersecting) {setNear(true); schedule();}}, {rootMargin: '1800px'});
    enter.observe(track);
    // Native sticky positioning keeps the route stationary after pinning, including
    // compositor scrolling between animation frames. Only its rounded ends advance.
    const resize = new ResizeObserver(measureRibbon);
    if (heading) resize.observe(heading);
    measureRibbon();
    window.addEventListener('scroll', schedule, {passive: true}); window.addEventListener('resize', measureRibbon);
    document.addEventListener('visibilitychange', schedule); reduced.addEventListener('change', schedule); schedule();
    return () => {
      cancelAnimationFrame(frame); enter.disconnect(); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measureRibbon);
      document.removeEventListener('visibilitychange', schedule); reduced.removeEventListener('change', schedule);
    };
  }, []);

  return <section id="character-experience" ref={root} className="character-experience" aria-labelledby="experience-title">
    <div className="experience-ribbon-anchor" aria-hidden="true"><Ribbon name="experience-cyan" /></div>
    <div className="experience-heading">
      <div className="section-label"><span>BLENDER</span>IDEAS INTO EXPERIENCES</div>
      <h2 id="experience-title">Ideas take shape.<br />Then come to life.</h2>
    </div>
    <div ref={journey} className="experience-journey">
      <div className="experience-sticky">
        <div className="experience-copy">
          <span className="experience-copy-label">A LITTLE CHARACTER. A WHOLE LOT OF LIFE.</span>
          <p>A shape becomes a personality. A few keyframes become a story. In Blender, the smallest gesture can bring an entire world to life.</p>
          <p>Model, texture, rig, and animate — all in one creative space. Give your characters a rhythm, an expression, and a world of their own.</p>
          <div className="experience-detail"><span>ORIGINAL MATERIALS</span><span>REAL-TIME 3D</span><span>MADE TO MOVE</span></div>
        </div>
        <div className="experience-tablet">
          <span className="tablet-camera" aria-hidden="true" />
          <div className="tablet-screen">
            <img className="character-poster" src={`${import.meta.env.BASE_URL}images/character-poster.png`} alt="" aria-hidden="true" decoding="async" />
            {near && <Suspense fallback={<div className="character-loading character-loading-note"><span className="character-spinner" />Bringing her to life…</div>}><CharacterStage journey={sceneState} /></Suspense>}
            <span className="tablet-screen-label">BLENDER / CHARACTER STUDY</span>
            <span className="tablet-live"><span aria-hidden="true" />WALK CYCLE</span>
          </div>
        </div>
        <div className="experience-headline" aria-hidden="true"><span>STEP INTO A NEW WORLD</span><span>AND LET YOUR</span><span>IMAGINATION RUN WILD</span></div>
      </div>
    </div>
  </section>;
}
