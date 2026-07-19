'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const DESKTOP_PARTICLES = 680;
const MOBILE_PARTICLES  = 220;
const CONNECTION_RADIUS = 120;
const MAX_CONNECTIONS   = 3;
const MOUSE_FORCE       = 220;
const MOUSE_STRENGTH    = 0.55;
const DRIFT_SPEED       = 0.0004;

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvsOrNull = canvasRef.current;
    if (!cvsOrNull || !hasWebGL()) return;
    const cvs: HTMLCanvasElement = cvsOrNull;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
                     window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? MOBILE_PARTICLES : DESKTOP_PARTICLES;

    // ── renderer ──────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: cvs,
        alpha: true,
        antialias: false,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
      });
    } catch {
      return; // WebGL context creation failed — degrade silently
    }

    renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1 : 2));
    renderer.setClearColor(0x000000, 0);

    // Handle context loss gracefully
    cvs.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
    });

    // ── scene / camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);

    let W = 0, H = 0;

    function resize() {
      W = cvs.clientWidth;
      H = cvs.clientHeight;
      renderer.setSize(W, H, false);
      camera.right  = W;
      camera.bottom = H;
      camera.updateProjectionMatrix();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    // ── particles ─────────────────────────────────────────────────────────────
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      size: number; opacity: number; phase: number;
    };

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x:  Math.random() * (W || 1400),
        y:  Math.random() * (H || 900),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size:    Math.random() < 0.12 ? Math.random() * 2.4 + 1.8 : Math.random() * 1.2 + 0.4,
        opacity: Math.random() * 0.5 + 0.15,
        phase:   Math.random() * Math.PI * 2,
      });
    }

    // ── THREE geometry: points ────────────────────────────────────────────────
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));
    geom.setAttribute('aSize',    new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT), 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT), 1));

    const pointMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          gl_PointSize = aSize * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.1, d) * vOpacity;
          gl_FragColor = vec4(0.94, 0.80, 0.44, a);
        }
      `,
    });

    scene.add(new THREE.Points(geom, pointMat));

    // ── THREE geometry: lines (desktop only) ─────────────────────────────────
    const MAX_LINES   = PARTICLE_COUNT * MAX_CONNECTIONS;
    const lineGeom    = new THREE.BufferGeometry();
    const linePositions = new Float32Array(MAX_LINES * 6);
    const lineAlphas    = new Float32Array(MAX_LINES * 2);
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeom.setAttribute('aAlpha',   new THREE.BufferAttribute(lineAlphas, 1));

    const lineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(0.83, 0.71, 0.42, vAlpha);
        }
      `,
    });

    if (!isMobile) scene.add(new THREE.LineSegments(lineGeom, lineMat));

    // ── input tracking ────────────────────────────────────────────────────────
    let mx = -9999, my = -9999, scrollFrac = 0;

    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onTouchMove = (e: TouchEvent)  => { mx = e.touches[0].clientX; my = e.touches[0].clientY; };
    const onScroll    = () => { scrollFrac = scrollY / Math.max(1, document.body.scrollHeight - innerHeight); };

    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('touchmove',  onTouchMove, { passive: true });
    window.addEventListener('scroll',     onScroll,    { passive: true });

    // ── animation loop ────────────────────────────────────────────────────────
    let rafId = 0, t = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      t++;

      const posAttr  = geom.attributes.position as THREE.BufferAttribute;
      const sizeAttr = geom.attributes.aSize    as THREE.BufferAttribute;
      const opAttr   = geom.attributes.aOpacity as THREE.BufferAttribute;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        const breath = 0.5 + 0.5 * Math.sin(t * DRIFT_SPEED * 300 + p.phase);
        p.opacity = 0.12 + breath * 0.38;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -50)    p.x = W + 50;
        if (p.x > W + 50) p.x = -50;
        if (p.y < -50)    p.y = H + 50;
        if (p.y > H + 50) p.y = -50;

        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_FORCE && dist > 0.1) {
          const force = (1 - dist / MOUSE_FORCE) * MOUSE_STRENGTH;
          p.vx += (dx / dist) * force * 2.2;
          p.vy += (dy / dist) * force * 2.2;
        }

        p.vx *= 0.96; p.vy *= 0.96;
        p.vx += (Math.random() - 0.5) * 0.012;
        p.vy += (Math.random() - 0.5) * 0.012;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 2.8) { p.vx = p.vx / speed * 2.8; p.vy = p.vy / speed * 2.8; }

        const displayY = p.y + scrollFrac * -180 * (p.size / 2.5);
        posAttr.setXYZ(i, p.x, displayY, 0);
        sizeAttr.setX(i, p.size * (0.8 + breath * 0.4));
        opAttr.setX(i, p.opacity);
      }

      posAttr.needsUpdate  = true;
      sizeAttr.needsUpdate = true;
      opAttr.needsUpdate   = true;

      // lines (desktop only)
      if (!isMobile) {
        const lpAttr = lineGeom.attributes.position as THREE.BufferAttribute;
        const laAttr = lineGeom.attributes.aAlpha   as THREE.BufferAttribute;
        let lineIdx = 0;

        for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_LINES - MAX_CONNECTIONS; i++) {
          const p = particles[i];
          let connected = 0;
          for (let j = i + 1; j < PARTICLE_COUNT && connected < MAX_CONNECTIONS; j++) {
            const q = particles[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < CONNECTION_RADIUS * CONNECTION_RADIUS) {
              const a = (1 - Math.sqrt(d2) / CONNECTION_RADIUS) * 0.18;
              const base = lineIdx * 6;
              lpAttr.array[base]     = p.x; lpAttr.array[base + 1] = p.y; lpAttr.array[base + 2] = 0;
              lpAttr.array[base + 3] = q.x; lpAttr.array[base + 4] = q.y; lpAttr.array[base + 5] = 0;
              laAttr.array[lineIdx * 2]     = a;
              laAttr.array[lineIdx * 2 + 1] = a;
              lineIdx++;
              connected++;
            }
          }
        }

        lineGeom.setDrawRange(0, lineIdx * 2);
        lpAttr.needsUpdate = true;
        laAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('scroll',    onScroll);
      renderer.dispose();
      geom.dispose();
      lineGeom.dispose();
      pointMat.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
    />
  );
}
