import {useEffect, type RefObject} from 'react';
import Lenis from 'lenis';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Scope smoothing to the footer transition; earlier page interactions stay native. */
export function useLenis(footer: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const surface = footer.current;
    if (!surface || reduced) return;
    const lenis = new Lenis({
      autoRaf: false,
      eventsTarget: surface,
      lerp: .12,
      syncTouch: false,
      virtualScroll: () => !surface.inert,
    });
    const tick = (seconds: number) => lenis.raf(seconds * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    return () => {gsap.ticker.remove(tick); lenis.destroy();};
  }, [footer, reduced]);
}
