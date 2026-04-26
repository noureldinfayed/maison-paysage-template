'use client';

import { useEffect, useRef } from 'react';

export default function DepthBackground() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    let mouseX = 0, mouseY = 0, scrollShift = 0;
    let cx = 0, cy = 0;
    let rafId = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    function tick() {
      rafId = 0;
      if (!el) return;
      cx = lerp(cx, mouseX, 0.08);
      cy = lerp(cy, mouseY + scrollShift, 0.08);
      el.style.transform = `translate(${cx.toFixed(2)}px,${cy.toFixed(2)}px)`;
      const converged =
        Math.abs(mouseX - cx) < 0.1 &&
        Math.abs((mouseY + scrollShift) - cy) < 0.1;
      if (!converged) rafId = requestAnimationFrame(tick);
    }

    const schedule = () => { if (!rafId) rafId = requestAnimationFrame(tick); };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / innerWidth  - 0.5) * -68;
      mouseY = (e.clientY / innerHeight - 0.5) * -44;
      schedule();
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      mouseX = (t.clientX / innerWidth  - 0.5) * -68;
      mouseY = (t.clientY / innerHeight - 0.5) * -44;
      schedule();
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        mouseX = Math.max(-1, Math.min(1, e.gamma / 30)) * -68;
        mouseY = Math.max(-1, Math.min(1, (e.beta - 30) / 30)) * -44;
        schedule();
      }
    };

    const onScroll = () => {
      const progress = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
      scrollShift = progress * -100;
      schedule();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Oversized by 6% on each side so edge never shows during parallax pan */}
      <div ref={layerRef} style={{ position: 'absolute', inset: '-13%', willChange: 'transform' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/terrace/main.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 hidden md:block"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.56) 38%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0) 100%)' }} />
      <div className="pointer-events-none absolute inset-0 md:hidden"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.72) 100%)' }} />
      <div className="pointer-events-none absolute inset-0 bg-black/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
    </div>
  );
}
