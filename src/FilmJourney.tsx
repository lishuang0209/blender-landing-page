import {useEffect, useRef} from 'react';
import {FilmFooter} from './components/FilmFooter';
import './filmJourney.css';

const FILMS = [
  ['spring', 'Spring'], ['sintel', 'Sintel'], ['charge', 'Charge'],
  ['wing-it', 'Wing It!'], ['sprite-fright', 'Sprite Fright'], ['agent-327', 'Agent 327'],
  ['cosmos-laundromat', 'Cosmos Laundromat'], ['big-buck-bunny', 'Big Buck Bunny'], ['hero', 'Hero'],
  ['caminandes-llamigos', 'Caminandes: Llamigos'], ['singularity', 'Singularity'], ['coffee-run', 'Coffee Run'],
];
const FINAL_FILM_COUNT = 6;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const phase = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** One reversible scroll sequence: typography, a film arc, a film wall, then shutters. */
export function FilmJourney() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = root.current, viewport = stage.current;
    if (!section || !viewport) return;
    const cards = [...section.querySelectorAll<HTMLElement>('.film-motion-card')];
    const footnote = section.querySelector<HTMLElement>('.film-motion-footnote');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previousTime = 0, displayed: number | undefined;
    const paint = (time: number) => {
      frame = 0;
      const elapsed = Math.min(64, Math.max(1, time - (previousTime || time - 16)));
      previousTime = time;
      const rect = section.getBoundingClientRect();
      const width = viewport.clientWidth, height = viewport.clientHeight;
      const target = clamp(-rect.top / Math.max(1, rect.height - height));
      displayed = displayed === undefined || reduced.matches ? target : mix(displayed, target, 1 - Math.exp(-elapsed / 100));
      const settling = Math.abs(displayed - target) > .0001;
      if (!settling) displayed = target;
      const p = displayed;
      const entry = phase((height * .85 - rect.top) / height, 0, .65);
      const textOut = phase(p, .47, .58);
      const textTravel = phase(p, .18, .49);
      const shutters = phase(p, .79, .94);
      const set = (name: string, value: string | number) => section.style.setProperty(name, String(value));
      set('--film-text-opacity', 1 - textOut);
      set('--film-first-x', `${textTravel * width * .62}px`);
      set('--film-second-x', `${-textTravel * width * .65}px`);
      set('--film-first-y', `${(1 - entry) * 110 - textOut * 110}%`);
      set('--film-second-y', `${(1 - phase(entry, .18, 1)) * 110 + textOut * 110}%`);
      const noteOpacity = entry * (1 - phase(p, .77, .83));
      set('--film-note-opacity', noteOpacity);
      set('--film-center-opacity', entry * (1 - textOut));
      set('--film-shutters', shutters);
      if (footnote) footnote.inert = !reduced.matches && (noteOpacity < .05 || rect.bottom <= 0 || rect.top >= height);
      section.dataset.chapter = p < .15 ? 'words' : p < .56 ? 'arc' : p < .79 ? 'wall' : 'shutters';

      if (reduced.matches) cards.forEach((card, i) => {
        card.style.visibility = i < FINAL_FILM_COUNT ? 'visible' : 'hidden';
        card.setAttribute('aria-hidden', String(i >= FINAL_FILM_COUNT));
      });
      else cards.forEach((card, i) => {
        const selected = i < FINAL_FILM_COUNT;
        const mobile = width < 768;
        const reveal = phase(p, .12 + i * .003, .24 + i * .003);
        const opacity = reveal * (selected ? 1 : 1 - phase(p, .48, .57));
        const lift = phase(p, .12, .29);
        const departure = phase(p, .43, .56);
        // The full collection travels as one ribbon; only six covers settle into the final grid.
        const angle = (i - 2) * Math.PI * 2 / cards.length - phase(p, .23, .49) * Math.PI * 1.85;
        const radius = width * (mobile ? .48 : .40);
        const scale = 1 - departure * .32;
        const ringX = mix(-width * .12, width * .5, lift) + departure * width * .20 + Math.sin(angle) * radius * scale;
        const ringY = mix(height * 1.28, height * .48, lift) - departure * height * .98 + (Math.sin(angle) * height * .13 + Math.cos(angle) * height * .065) * scale;
        const ringZ = Math.cos(angle) * Math.min(width * .22, 320) * scale;
        const columns = mobile ? 2 : 3;
        const gridWidth = width * (mobile ? .90 : .66);
        const gap = mobile ? 8 : 12;
        const wallWidth = (gridWidth - (columns - 1) * gap) / columns;
        const rowHeight = wallWidth * 9 / 16;
        const wallX = (width - gridWidth) / 2 + wallWidth / 2 + (i % columns) * (wallWidth + gap);
        const wallY = height * (mobile ? .24 : .22) + rowHeight / 2 + Math.floor(i / columns) * (rowHeight + gap);
        const cardUnfold = selected ? phase(p, .54 + i * .007, .65 + i * .007) : 0;
        const cardWidth = mix(width * (mobile ? .36 : .16) * scale, wallWidth, cardUnfold);
        const x = mix(ringX, wallX, cardUnfold);
        const y = mix(ringY, wallY, cardUnfold);
        const z = mix(ringZ, 0, cardUnfold);
        const rotateY = mix(Math.sin(angle) * 52, 0, cardUnfold);
        const rotateZ = mix(12 - departure * 24, 0, cardUnfold);
        card.style.zIndex = String(Math.round(z + 1000));
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardWidth * 9 / 16}px`;
        card.style.opacity = String(opacity);
        card.style.visibility = opacity < .001 ? 'hidden' : 'visible';
        card.setAttribute('aria-hidden', String(opacity < .001));
        card.style.transform = `translate3d(${x}px,${y}px,${z}px) translate(-50%,-50%) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
      });
      if (settling) schedule();
    };
    function schedule() {if (!frame && !document.hidden) frame = requestAnimationFrame(paint);}
    schedule();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, []);

  return <section id="films-in-motion" ref={root} className="film-journey" aria-labelledby="film-journey-title">
    <div className="film-motion-stage" ref={stage}>
      <div className="film-motion-topline"><span>BLENDER / OPEN MOVIES</span><span>12 STORIES. ONE CREATIVE WORLD.</span></div>
      <svg className="film-motion-orbits" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path d="M 400 100 Q 800 150 1080 -30 M 510 250 Q 930 190 1190 70" /></svg>
      <h2 className="film-motion-title" id="film-journey-title"><span className="film-word-first"><span>BLENDER</span></span><span className="film-word-second"><span>MOVIES</span></span></h2>
      <p className="film-motion-center">FROM THE FIRST IDEA<br />TO THE FINAL FRAME.</p>
      <div className="film-motion-cards" aria-label="A collection of Blender film covers">{FILMS.map(([file, title], index) => <figure key={file} className={`film-motion-card${index >= FINAL_FILM_COUNT ? ' is-transient' : ''}`}><img src={`${import.meta.env.BASE_URL}blender-films-covers/${file}.webp`} alt={`${title} — Blender film cover`} loading="eager" decoding="async" width="1280" height="720" /><figcaption>{title}</figcaption></figure>)}</div>
      <div className="film-motion-footnote"><p>Characters, worlds, and stories.<br />A glimpse of what imagination<br />can become with Blender.</p><a href="https://studio.blender.org/films/" target="_blank" rel="noreferrer">EXPLORE OPEN MOVIES <span aria-hidden="true">↗</span></a></div>
      <div className="film-motion-shutters" aria-hidden="true"><span /><span /><span /></div>
      <FilmFooter />
    </div>
  </section>;
}
