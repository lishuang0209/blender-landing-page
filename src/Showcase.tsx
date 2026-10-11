import { useEffect, useRef, useState } from 'react';
import { ScrollMotion } from './ScrollMotion';
import { WarpedVideo } from './WarpedVideo';
import { WorkPreview } from './WorkPreview';
import { WorkCarousel } from './WorkCarousel';
import { CurvedCarousel } from './CurvedCarousel';
import { CharacterExperience } from './CharacterExperience';
import { FilmJourney } from './FilmJourney';
import { WORK, IMAGES, cropStyle, type Work } from './workData';

const MEDIA = `${import.meta.env.BASE_URL}media/`;
// The upper flip grid uses the first six artworks; keep this collection distinct.
const CURVED_WORK = WORK.slice(6);
const REEL = `${MEDIA}blender-showcase.mp4`;
const STORY = 'A single idea can become an entire world. Model it. Give it motion. Find the light. Blender brings every part of your creative process together.';
export function Showcase() {
  const preview = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const active = useRef(false);
  const [selection, setSelection] = useState<{ fraction: number; title: string; work?: Work } | null>(null);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(false);
  const cursor = useRef<HTMLSpanElement>(null);
  const workOrigin = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const video = preview.current;
    const section = stage.current;
    if (!video || !section) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (active.current && !document.hidden && !selection && !reduced.matches) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(entries => { active.current = entries[0].isIntersecting; sync(); }, { threshold: .12 });
    observer.observe(section);
    video.addEventListener('loadeddata', sync);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    return () => { observer.disconnect(); video.pause(); video.removeEventListener('loadeddata', sync); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); };
  }, [selection]);

  useEffect(() => {
    const element = dialog.current;
    if (!selection || selection.work || !element) return;
    setError(false);
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { player.current?.pause(); element.close(); document.body.style.overflow = overflow; };
  }, [selection]);

  const open = (fraction = 0, title = 'Blender Showcase Reel') => setSelection({ fraction, title });
  return <ScrollMotion>
    <section id="learn" ref={stage} className="reel-journey" aria-label="Blender introduction and expanding showcase video">
      <div id="reel" className="reel-sticky">
        <svg className="reel-ribbon" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="ribbon-cyan" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#18b8d5" /><stop offset=".5" stopColor="#59e4ea" /><stop offset="1" stopColor="#85fff4" /></linearGradient></defs>
          <path className="reel-ribbon-path" pathLength="1" d="M -160 130 C 220 150 610 370 675 900 C 735 1360 5 1020 140 660 C 340 280 880 320 1280 800" fill="none" stroke="url(#ribbon-cyan)" strokeWidth="34" strokeLinecap="round" />
        </svg>
        <div className="story-intro" aria-labelledby="story-title">
          <div className="story-heading">
            <div className="section-label"><span>01</span>BIG IDEAS, BROUGHT TO LIFE</div>
            <h2 id="story-title" className="story-title">Create without<br />limits.</h2>
          </div>
          <div className="story-description">
            <p className="scroll-story" aria-label={STORY}>{STORY.split(' ').map((word, index) => <span key={index} className="story-word" aria-hidden="true">{word} </span>)}</p>
          </div>
        </div>
        <span className="reel-scroll-hint" aria-hidden="true">SCROLL TO EXPAND <span>↓</span></span>
        <div className="reel-registration is-top" aria-hidden="true">{Array.from({length: 5}, (_, index) => <span key={index}>+</span>)}</div>
        <div className="reel-registration is-bottom" aria-hidden="true">{Array.from({length: 5}, (_, index) => <span key={index}>+</span>)}</div>
        <div className="reel-window">
          <video ref={preview} src={REEL} poster={`${MEDIA}reel-0.jpg`} muted={muted} playsInline loop preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setError(true)} />
          <WarpedVideo video={preview} />
          <div className="reel-shade" />
          <div className="reel-topline"><span>BLENDER / SHOWCASE REEL</span><span>CREATIVITY IN MOTION</span></div>
          <button className="reel-open" type="button" aria-label="Play Blender showcase reel in a large player" onClick={() => open()}
            onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
            onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); cursor.current?.style.setProperty('--cursor-x', `${event.clientX - box.left}px`); cursor.current?.style.setProperty('--cursor-y', `${event.clientY - box.top}px`); }}>
            <span ref={cursor} className={`reel-play ${hover ? 'is-tracking' : ''}`}><span aria-hidden="true">▶</span>PLAY REEL</span>
          </button>
          <div className="reel-bottom"><p>Made with Blender.<br /><span>Made to move you.</span></p><div className="reel-controls">
            <button type="button" onClick={() => { if (playing) preview.current?.pause(); else preview.current?.play().catch(() => {}); }}>{playing ? 'PAUSE' : 'PLAY'} <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button>
            <button type="button" aria-pressed={!muted} onClick={() => setMuted(value => !value)}>{muted ? 'SOUND OFF' : 'SOUND ON'} <span aria-hidden="true">{muted ? '○' : '◉'}</span></button>
          </div></div>
          {error && <p className="reel-error" role="status">Video unavailable. Please reload to try again.</p>}
        </div>
      </div>
    </section>

    <section id="showcase" className="selected-work" aria-labelledby="work-title">
      <div className="work-heading" data-reveal>
        <div className="story-heading">
          <div className="section-label"><span>02</span>SELECTED MOMENTS</div>
          <h2 id="work-title" className="story-title">Look closer.<br />Imagine further.</h2>
        </div>
        <div className="story-description">
          <p className="scroll-story">Worlds, characters, and unexpected possibilities. A selection of creative moments made with Blender.</p>
        </div>
      </div>
      <WorkCarousel works={WORK} onSelect={(work, origin) => {
        workOrigin.current = origin;
        setSelection({ fraction: 0, title: work.title, work });
      }} />
    </section>

    <section id="immersive-gallery" className="zeyna-showcase" aria-labelledby="zeyna-title">
      <div className="zeyna-heading"><div><span>BLENDER / ANOTHER PERSPECTIVE</span><h2 id="zeyna-title">Explore another dimension.</h2></div><p>New worlds. An endless flow.<br />Find a moment that moves you.</p></div>
      <CurvedCarousel works={CURVED_WORK} onSelect={(work, origin) => {
        workOrigin.current = origin;
        setSelection({ fraction: 0, title: work.title, work });
      }} />
    </section>

    <CharacterExperience />

    <FilmJourney />

    {selection?.work && <WorkPreview work={selection.work} src={`${IMAGES}${selection.work.poster}`} style={cropStyle(selection.work)} origin={workOrigin.current} onClose={()=>setSelection(null)} />}
    <dialog ref={dialog} className="reel-dialog" aria-labelledby="player-title" onCancel={() => setSelection(null)} onClose={() => setSelection(null)}>
      <div className="player-bar"><h2 id="player-title">{selection?.title}</h2><button type="button" onClick={() => setSelection(null)} aria-label="Close preview">CLOSE ×</button></div>
      {selection && !selection.work && <video ref={player} src={REEL} controls playsInline preload="auto" onLoadedMetadata={event => { event.currentTarget.currentTime = event.currentTarget.duration * selection.fraction; event.currentTarget.play().catch(() => {}); }} onError={() => setError(true)} />}
      {error && <p role="status">The video could not load. Please close and try again.</p>}
      <p className="player-credit">{selection?.work ? `ARTWORK CREDIT · ${selection.work.artist}` : 'BLENDER SHOWCASE REEL · USER-PROVIDED VIDEO'}</p>
    </dialog>
  </ScrollMotion>;
}
