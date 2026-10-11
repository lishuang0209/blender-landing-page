import { useCallback, useEffect, useRef } from 'react';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_041744_63efcd78-bf7d-4039-99e2-2461e8a61903.mp4';
const SENSITIVITY = 0.8;
/** Bias character toward right inside its slot */
const POS_X = 0.55;
const POS_Y = 0.5;

type Props = {
  className?: string;
};

/** Mouse-scrub character video that preserves the original colors. */
export function MouseScrubVideo({ className = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetTime = useRef(0);
  const seeking = useRef(false);
  const prevX = useRef<number | null>(null);

  const paint = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!video || !canvas || !wrap || video.readyState < 2 || !video.videoWidth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, wrap.clientWidth);
    const cssH = Math.max(1, wrap.clientHeight);
    const tw = Math.max(1, Math.round(cssW * dpr));
    const th = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    const cover = Math.max(tw / video.videoWidth, th / video.videoHeight);
    const dw = video.videoWidth * cover;
    const dh = video.videoHeight * cover;
    ctx.clearRect(0, 0, tw, th);
    ctx.drawImage(video, (tw - dw) * POS_X, (th - dh) * POS_Y, dw, dh);
  }, []);

  const seek = useCallback(() => {
    const element = videoRef.current;
    if (
      !element ||
      seeking.current ||
      element.readyState < 2 ||
      !Number.isFinite(element.duration) ||
      element.duration <= 0
    ) {
      return;
    }
    const target = Math.min(element.duration, Math.max(0, targetTime.current));
    if (Math.abs(element.currentTime - target) < 0.006) {
      paint();
      return;
    }
    seeking.current = true;
    element.currentTime = target;
  }, [paint]);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      const previous = prevX.current;
      prevX.current = event.clientX;
      const element = videoRef.current;
      if (previous === null || !element || !Number.isFinite(element.duration)) return;
      const delta = event.clientX - previous;
      targetTime.current = Math.min(
        element.duration,
        Math.max(0, targetTime.current + (delta / window.innerWidth) * SENSITIVITY * element.duration),
      );
      seek();
    };
    const reset = () => {
      prevX.current = null;
    };
    const onResize = () => paint();
    window.addEventListener('mousemove', move);
    window.addEventListener('blur', reset);
    window.addEventListener('resize', onResize);
    document.addEventListener('mouseleave', reset);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mouseleave', reset);
    };
  }, [seek, paint]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint]);

  return (
    <div ref={wrapRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onLoadedMetadata={() => {
          targetTime.current = 0;
        }}
        onLoadedData={() => {
          seek();
          paint();
        }}
        onSeeked={() => {
          seeking.current = false;
          seek();
          paint();
        }}
      >
        <source src={VIDEO} type="video/mp4" />
      </video>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}
