import {useCallback, useEffect, useRef, useState} from 'react';

type Voice = {oscillators: OscillatorNode[]; envelope: GainNode};
type Engine = {
  context: AudioContext; master: GainNode; input: BiquadFilterNode;
  delay: DelayNode; feedback: GainNode; echoFilter: BiquadFilterNode; wet: GainNode;
  voices: Set<Voice>;
};
const SCALE = [196, 220, 261.626, 293.665, 329.628, 392, 440, 523.251];

export function usePluckAudio() {
  const engine = useRef<Engine | null>(null);
  const enabledRef = useRef(true);
  const mounted = useRef(true);
  const lastNote = useRef(0);
  const unlocking = useRef(false);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');

  const unlock = useCallback(async () => {
    if (!enabledRef.current || !mounted.current) return;
    // The document gesture and a line pluck may arrive in the same event.
    if (unlocking.current) {await engine.current?.context.resume().catch(() => {}); return;}
    unlocking.current = true;
    try {
      if (!engine.current) {
        // Create audio on a real pointer/key gesture; browser autoplay rules still apply.
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = 0;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.ratio.value = 4;
        master.connect(compressor).connect(context.destination);
        const input = context.createBiquadFilter();
        input.type = 'lowpass'; input.frequency.value = 2600;
        input.connect(master);
        const delay = context.createDelay(1);
        delay.delayTime.value = .17;
        const feedback = context.createGain(); feedback.gain.value = .28;
        const echoFilter = context.createBiquadFilter();
        echoFilter.type = 'lowpass'; echoFilter.frequency.value = 1500;
        const wet = context.createGain(); wet.gain.value = .24;
        input.connect(delay);
        delay.connect(echoFilter).connect(feedback).connect(delay);
        echoFilter.connect(wet).connect(master);
        engine.current = {context, master, input, delay, feedback, echoFilter, wet, voices: new Set()};
      }
      const audio = engine.current;
      await audio.context.resume();
      if (!mounted.current || !enabledRef.current) return;
      setError('');
      audio.master.gain.setTargetAtTime(.32, audio.context.currentTime, .03);
    } catch {
      if (mounted.current) setError('Sound unavailable. The visual interaction still works.');
    } finally {
      unlocking.current = false;
    }
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    setEnabled(enabledRef.current);
    const audio = engine.current;
    if (enabledRef.current) void unlock();
    else audio?.master.gain.setTargetAtTime(0, audio.context.currentTime, .02);
  }, [unlock]);

  const playNote = useCallback((index: number) => {
    const audio = engine.current;
    if (!mounted.current || !enabledRef.current || !audio || audio.context.state !== 'running') return;
    const now = audio.context.currentTime;
    if (now - lastNote.current < .035) return;
    lastNote.current = now;
    // Cap polyphony when a fast pointer sweep crosses many strings.
    if (audio.voices.size >= 8) {
      const oldest = audio.voices.values().next().value as Voice | undefined;
      if (oldest) {
        oldest.envelope.gain.setTargetAtTime(0, now, .01);
        oldest.oscillators.forEach(oscillator => oscillator.stop(now + .05));
        audio.voices.delete(oldest);
      }
    }
    const envelope = audio.context.createGain();
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(.13, now + .009);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
    envelope.connect(audio.input);
    const oscillators = [-6, 0, 7].map((detune, harmonic) => {
      const oscillator = audio.context.createOscillator();
      const gain = audio.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = SCALE[index % SCALE.length] * (harmonic === 2 ? 2 : 1);
      oscillator.detune.value = detune;
      gain.gain.value = [.5, .35, .15][harmonic];
      oscillator.connect(gain).connect(envelope);
      oscillator.start(now); oscillator.stop(now + 1.15);
      oscillator.onended = () => {oscillator.disconnect(); gain.disconnect();};
      return oscillator;
    });
    const voice = {oscillators, envelope};
    audio.voices.add(voice);
    oscillators[2].addEventListener('ended', () => {audio.voices.delete(voice); envelope.disconnect();}, {once: true});
  }, []);

  const pluck = useCallback((index: number) => {
    if (!enabledRef.current) return;
    if (engine.current?.context.state === 'running') playNote(index);
    else if (navigator.userActivation?.isActive) {
      void unlock().then(() => playNote(index));
    }
  }, [playNote, unlock]);

  useEffect(() => {
    mounted.current = true;
    // An early page click unlocks the default-on sound before the footer is reached.
    // Pointer movement/scroll alone is not an audio-unlocking gesture in browsers.
    const onPointer = () => {void unlock();};
    const onKey = (event: KeyboardEvent) => {
      if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) void unlock();
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      mounted.current = false;
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      const audio = engine.current;
      engine.current = null;
      if (audio) {
        audio.voices.forEach(voice => voice.oscillators.forEach(oscillator => {try {oscillator.stop();} catch { /* already ended */ }}));
        void audio.context.close();
      }
    };
  }, [unlock]);
  return {enabled, toggle, pluck, error};
}
