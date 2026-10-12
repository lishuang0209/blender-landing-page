import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cropStyle, IMAGES, type Work } from './workData';

type Props = { works: Work[]; onSelect: (work: Work, origin: HTMLElement) => void };

/** Two-sided artwork gallery. Flip, light and shadow timing live in index.css. */
export function WorkCarousel({ works, onSelect }: Props) {
  // Desktop layout: exactly two rows of three cards; keep all source assets.
  const displayedWorks = works.slice(0, 6);
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [entered, setEntered] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const cards = host.current?.querySelectorAll<HTMLElement>('[data-flip-entry]');
    if (!cards) return;
    const observer = new IntersectionObserver(entries => {
      const revealed = entries.filter(entry => entry.isIntersecting);
      if (!revealed.length) return;
      setEntered(previous => {
        const next = new Set(previous);
        revealed.forEach(entry => next.add(Number((entry.target as HTMLElement).dataset.flipEntry)));
        return next;
      });
      revealed.forEach(entry => observer.unobserve(entry.target));
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [works]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      // The image dialog owns Escape while it is open.
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) setActive(null);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  return <div ref={host} className="work-carousel flip-gallery">
    <div className="flip-gallery-grid">
      {displayedWorks.map((work, index) => {
        const open = active === index;
        return <div key={work.poster} data-flip-entry={index}
          className={`art-flip-entry${entered.has(index) ? ' is-visible' : ''}`}
          style={{ '--entry-delay': `${index % 3 * 100}ms` } as CSSProperties}>
          <button type="button"
            className={`art-flip-card${open ? ' is-flipped' : ''}${active !== null && !open ? ' is-yielding' : ''}`}
            aria-label={open ? `View artwork: ${work.title}` : `Flip card: ${work.title}`}
            aria-expanded={open}
            onMouseEnter={() => {
              if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) setActive(index);
            }}
            onMouseLeave={event => {
              if (document.activeElement !== event.currentTarget) setActive(current => current === index ? null : current);
            }}
            onFocus={event => {
              if (event.currentTarget.matches(':focus-visible')) setActive(index);
            }}
            onBlur={event => {
              if (!event.currentTarget.matches(':hover')) setActive(current => current === index ? null : current);
            }}
            onClick={event => {
              if (open) onSelect(work, event.currentTarget);
              else setActive(index);
            }}>
            <span className="art-flip-shadow" aria-hidden="true" />
            <span className="art-flip-inner">
              <span className="art-flip-edge" aria-hidden="true" />
              <span className="art-flip-front" aria-hidden={open}>
                <span className="work-artwork" style={cropStyle(work, 0.76)}>
                  <img src={`${IMAGES}${work.poster}`} alt="" loading="lazy" decoding="async" width="2048" height="1332" />
                </span>
                <span className="art-flip-shade" />
                <span className="art-flip-light" />
                <span className="art-flip-top"><span>{String(index + 1).padStart(2, '0')}</span><span>BLENDER / ARTWORK</span></span>
                <span className="art-flip-identity"><strong>{work.title}</strong><span>{work.category}</span></span>
                <span className="art-flip-cue">↻</span>
              </span>
              <span className="art-flip-back" aria-hidden={!open}>
                <span className="art-flip-light" />
                <span className="art-flip-top"><span>SELECTED MOMENT {String(index + 1).padStart(2, '0')}</span><span>✳</span></span>
                <span className="art-flip-details"><span className="art-flip-category">{work.category}</span><strong>{work.title}.</strong><span className="art-flip-description">{work.alt}.</span></span>
                <span className="art-flip-footer"><span>ARTWORK CREDIT<br /><strong>{work.artist}</strong></span><span className="art-flip-view">VIEW ARTWORK <span>↗</span></span></span>
              </span>
            </span>
          </button>
        </div>;
      })}
    </div>
    <p className="flip-gallery-note">Different worlds. One creative canvas.</p>
  </div>;
}
