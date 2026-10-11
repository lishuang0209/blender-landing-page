import { useEffect, useRef, type ReactNode } from 'react';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Scroll transforms are scoped to this page and rendered once per animation frame. */
export function ScrollMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const reveals = element.querySelectorAll<HTMLElement>('[data-reveal]');
    const words = element.querySelectorAll<HTMLElement>('.story-word');
    const story = element.querySelector<HTMLElement>('.story-intro');
    const reel = element.querySelector<HTMLElement>('.reel-journey');
    const reelFrame = element.querySelector<HTMLElement>('.reel-sticky');
    const ribbon = element.querySelector<SVGPathElement>('.reel-ribbon-path');
    // Matching cubic control points let the ribbon bend continuously without swapping paths.
    const ribbonStart = [-160,130, 220,150,610,370,675,900, 735,1360,5,1020,140,660, 340,280,880,320,1280,800];
    const ribbonEnd = [340,-160, 260,30,600,230,415,600, 225,950,-150,660,110,420, 320,215,780,320,1130,705];
    const reelControls = element.querySelector<HTMLElement>('.reel-controls');
    let frame = 0;
    let displayedReel: number | undefined;
    let previousPaint = 0;
    const paint = (time = performance.now()) => {
      const elapsed = Math.min(64, Math.max(1, time - (previousPaint || time - 16)));
      previousPaint = time;
      let settling = false;
      frame = 0;
      const height = window.innerHeight;
      const storyRect = story?.getBoundingClientRect();
      const storyProgress = reduced.matches ? 1 : clamp((height * .85 - (storyRect?.top ?? 0)) / (height * .6));
      words.forEach((word, index) => {
        word.style.opacity = String(.18 + .82 * clamp((storyProgress - index / words.length * .65) / .35));
      });
      if (reel && reelFrame) {
        const rect = reel.getBoundingClientRect();
        const bounds = reelFrame.getBoundingClientRect();
        // Adjustable: expansion uses 80% of pinned travel, then holds a framed large card.
        const travel = Math.max(1, rect.height - bounds.height);
        const target = reduced.matches ? 1 : clamp(-rect.top / travel / .8);
        // Adjustable: 95ms damping makes quick wheel input visibly animate, not jump.
        if (displayedReel === undefined || reduced.matches) displayedReel = target;
        else displayedReel += (target - displayedReel) * (1 - Math.exp(-elapsed / 95));
        const reelSettling = Math.abs(target - displayedReel) > .0002;
        settling = settling || reelSettling;
        if (!reelSettling) displayedReel = target;
        const raw = displayedReel;
        const progress = raw * raw * (3 - 2 * raw); // Continuous, reversible smoothstep.
        // Adjustable: start as a left-aligned 16:9 card (~45% of the content width).
        const gutter = Math.max(30, Math.min(96, bounds.width * .052));
        const startWidth = Math.min((bounds.width - gutter * 2) * .45, bounds.height * .43 * 16 / 9);
        const startHeight = startWidth * 9 / 16;
        const startTop = Math.min(bounds.height * .48, bounds.height * .92 - startHeight);
        // Adjustable final framing: 4.4% side margins, 16% top and 6% bottom space.
        const endGutter = Math.max(30, Math.min(96, bounds.width * .044));
        const endTop = bounds.height * .16;
        const endHeight = bounds.height * .78;
        const tilt = Math.sin(progress * Math.PI); // Tilt only during expansion; finish flat.
        const mix = (from: number, to: number) => from + (to - from) * progress;
        // Ribbon draws as the section enters; scroll then bends and sweeps it behind the card.
        // Adjustable: morph completes after 55% of the expansion travel.
        const entry = clamp(1 - rect.top / Math.max(1, height * .9));
        const bend = reduced.matches ? 1 : clamp(raw / .55);
        const smoothBend = bend * bend * (3 - 2 * bend);
        if (ribbon && !reduced.matches) {
          const points = ribbonStart.map((value, index) => (value + (ribbonEnd[index] - value) * smoothBend).toFixed(2));
          ribbon.setAttribute('d', `M ${points.slice(0,2).join(' ')} C ${points.slice(2,8).join(' ')} C ${points.slice(8,14).join(' ')} C ${points.slice(14,20).join(' ')}`);
        }
        reel.style.setProperty('--ribbon-draw', String(reduced.matches ? 1 : .15 + entry * .85));
        reel.style.setProperty('--ribbon-turn', `${-5 + smoothBend * 14}deg`);
        reel.style.setProperty('--ribbon-shift', `${(1 - entry) * 90 - smoothBend * 45}px`);
        reel.style.setProperty('--ribbon-opacity', String(1 - clamp((progress - .35) / .5)));
        reel.style.setProperty('--reel-progress', String(progress));
        reel.style.setProperty('--reel-left', `${mix(gutter, endGutter)}px`);
        reel.style.setProperty('--reel-top', `${mix(startTop, endTop)}px`);
        reel.style.setProperty('--reel-width', `${mix(startWidth, bounds.width - endGutter * 2)}px`);
        reel.style.setProperty('--reel-height', `${mix(startHeight, endHeight)}px`);
        reel.style.setProperty('--card-tilt-y', `${tilt * -14}deg`);
        reel.style.setProperty('--card-tilt-z', `${tilt * -3.5}deg`);
        reel.style.setProperty('--card-skew', `${tilt * -2}deg`);
        reel.dispatchEvent(new CustomEvent('reel-motion', { detail: { progress } }));
        reel.style.setProperty('--card-radius', `${mix(24, 20)}px`);
        reel.style.setProperty('--frame-gutter', `${endGutter}px`);
        reel.style.setProperty('--frame-top', `${endTop}px`);
        reel.style.setProperty('--frame-bottom', `${bounds.height * .06}px`);
        reel.style.setProperty('--intro-opacity', String(1 - clamp(progress / .35)));
        reel.style.setProperty('--surface-overlay', String(clamp((progress - .86) / .14)));
        reel.style.setProperty('--reel-overlay', String(clamp((progress - .38) / .28)));
        // Invisible controls/content must not capture pointer or keyboard focus.
        if (story) story.inert = !reduced.matches && progress > .35;
        if (reelControls) reelControls.inert = !reduced.matches && progress < .9;
      }
      if (settling) frame = requestAnimationFrame(paint);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    element.classList.add('motion-ready');
    reveals.forEach(node => {
      if (reduced.matches) node.classList.add('is-revealed');
      else observer.observe(node);
    });
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule); element.classList.remove('motion-ready');
    };
  }, []);
  return <div ref={root}>{children}</div>;
}
