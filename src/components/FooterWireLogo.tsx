import {useCallback, useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {gsap} from 'gsap';
import {makeWordWires, wirePath, WIRE_HEIGHT, WIRE_WIDTH} from './wireGeometry';

type Props = {active: boolean; reduced: boolean; pulse: MutableRefObject<number>; onPluck: (index: number) => void};
type StringState = {amp: number; speed: number; phase: number; cycles: number};

export function FooterWireLogo({active, reduced, pulse, onPluck}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const wires = useMemo(() => makeWordWires('BLENDER'), []);
  const states = useMemo(() => wires.map((_, i): StringState => ({amp: 0, speed: 0, phase: 0, cycles: 1.5 + (i % 4) * .3})), [wires]);
  const moving = useRef(new Set<number>());
  const keyIndex = useRef(0);
  const redraw = useCallback((_time: number, delta: number) => {
    moving.current.forEach(index => {
      const state = states[index];
      state.phase += state.speed * Math.min(delta / 1000, .05);
      paths.current[index]?.setAttribute('d', wirePath(wires[index], state.amp, state.phase, state.cycles));
      if (state.amp < .02) {
        paths.current[index]?.setAttribute('d', wirePath(wires[index]));
        moving.current.delete(index);
      }
    });
    if (!moving.current.size) gsap.ticker.remove(redraw);
  }, [states, wires]);
  const pluck = useCallback((index: number) => {
    if (!active || !states[index]) return;
    onPluck(index);
    pulse.current = Math.min(1, pulse.current + .5);
    if (svg.current) svg.current.dataset.plucks = String(Number(svg.current.dataset.plucks || 0) + 1);
    if (reduced) return;
    const state = states[index];
    gsap.killTweensOf(state);
    state.amp = 8 + index % 4; state.speed = 24;
    moving.current.add(index);
    gsap.ticker.add(redraw);
    gsap.to(state, {amp: 0, speed: 0, duration: .9, ease: 'expo.out', onComplete: () => {
      paths.current[index]?.setAttribute('d', wirePath(wires[index]));
      moving.current.delete(index);
      if (!moving.current.size) gsap.ticker.remove(redraw);
    }});
  }, [active, reduced, states, wires, redraw, onPluck, pulse]);

  useEffect(() => {
    if (!active || reduced) {
      gsap.ticker.remove(redraw);
      states.forEach((state, i) => {gsap.killTweensOf(state); state.amp = 0; paths.current[i]?.setAttribute('d', wirePath(wires[i]));});
      moving.current.clear();
    }
    return () => {gsap.ticker.remove(redraw); states.forEach(state => gsap.killTweensOf(state));};
  }, [active, reduced, redraw, states, wires]);

  return <div className="footer-wire-wrap">
    <svg ref={svg} className="footer-wire-logo" viewBox={`0 0 ${WIRE_WIDTH} ${WIRE_HEIGHT}`} role="button" tabIndex={active ? 0 : -1}
      aria-label="Pluck the Blender wire logo. Hover or tap a line, or press Enter to play a note."
      onKeyDown={event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); pluck(keyIndex.current++ % wires.length);}}}>
      <g className="footer-wire-visible" aria-hidden="true">{wires.map((wire, index) => <path key={index} ref={path => {paths.current[index] = path;}} d={wirePath(wire)} />)}</g>
      <g className="footer-wire-hit" aria-hidden="true">{wires.map((wire, index) => <path key={index} d={wirePath(wire)}
        onPointerEnter={event => {if (event.pointerType === 'mouse') pluck(index);}}
        onPointerDown={event => {event.preventDefault(); pluck(index);}} />)}</g>
    </svg>
  </div>;
}
