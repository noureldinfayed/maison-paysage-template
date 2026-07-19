'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 680;
const CONNECTION_RADIUS = 120;
const MAX_CONNECTIONS = 3;
const MOUSE_FORCE = 220;     // radius of influence (px)
const MOUSE_STRENGTH = 0.55; // how hard particles flee the cursor
const DRIFT_SPEED = 0.0004;

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ── scene / camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);

    let W = 0, H = 0;

    function resize() {
      W = cvs.clientWidth;
      H = cvs.clientHeight;
      renderer.setSize(W, H, false);
      camera.right = W;
      camera.bottom = H;
      camera.updateProjectionMatrix();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas!);

    // Capture canvas as non-null for closures
    const cvs = canvas;

    // ── particles ─────────────────────────────────────────────────────────────
    // Each particle: [x, y, vx, vy, size, opacity, hue-offset]
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      ox: number; oy: number; // origin (home position)
      size: number;
      opacity: number;
      phase: number; // for breathing
    };

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Math.random() * W || Math.random() * 1400;
      const y = Math.random() * H || Math.random() * 900;
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        ox: x, oy: y,
        size: Math.random() < 0.12 ? Math.random() * 2.4 + 1.8 : Math.random() * 1.2 + 0.4,
        opacity: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ── THREE geometry: points ────────────────────────────────────────────────
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);
    const opacities = new Float32Array(PARTICLE_COUNT);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

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
          // warm gold tint
          gl_FragColor = vec4(0.94, 0.80, 0.44, a);
        }
      `,
    });

    const points = new THREE.Points(geom, pointMat);
    scene.add(points);

    // ── THREE geometry: lines ────────────────────────────────────────────────
    // Pre-allocate a large line segments buffer and update each frame
    const MAX_LINES = PARTICLE_COUNT * MAX_CONNECTIONS;
    const linePositions = new Float32Array(MAX_LINES * 6); // 2 verts × 3
    const lineAlphas    = new Float32Array(MAX_LINES * 2);

    const lineGeom = new THREE.BufferGeometry();
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

    const lines = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(lines);

    // ── mouse tracking ────────────────────────────────────────────────────────
    let mx = -9999, my = -9999;
    let scrollFrac = 0;

    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onTouchMove = (e: TouchEvent) => {
      mx = e.touches[0].clientX;
      my = e.touches[0].clientY;
    };
    const onScroll = () => {
      scrollFrac = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── animation loop ────────────────────────────────────────────────────────
    let rafId = 0;
    let t = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      t++;

      const posAttr  = geom.attributes.position as THREE.BufferAttribute;
      const sizeAttr = geom.attributes.aSize    as THREE.BufferAttribute;
      const opAttr   = geom.attributes.aOpacity as THREE.BufferAttribute;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];

        // breathing opacity
        const breath = 0.5 + 0.5 * Math.sin(t * DRIFT_SPEED * 300 + p.phase);
        p.opacity = (0.12 + breath * 0.38);

        // gentle drift
        p.x += p.vx;
        p.y += p.vy;

        // soft boundary wrap
        if (p.x < -50) p.x = W + 50;
        if (p.x > W + 50) p.x = -50;
        if (p.y < -50) p.y = H + 50;
        if (p.y > H + 50) p.y = -50;

        // mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_FORCE && dist > 0.1) {
          const force = (1 - dist / MOUSE_FORCE) * MOUSE_STRENGTH;
          p.vx += (dx / dist) * force * 2.2;
          p.vy += (dy / dist) * force * 2.2;
        }

        // dampen velocity
        p.vx *= 0.96;
        p.vy *= 0.96;
        // base drift
        p.vx += (Math.random() - 0.5) * 0.012;
        p.vy += (Math.random() - 0.5) * 0.012;
        // clamp
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 2.8) { p.vx = (p.vx / speed) * 2.8; p.vy = (p.vy / speed) * 2.8; }

        // scroll parallax: faster particles drift down more
        const scrollOffset = scrollFrac * -180 * (p.size / 2.5);
        const displayY = p.y + scrollOffset;

        posAttr.setXYZ(i, p.x, displayY, 0);
        sizeAttr.setX(i, p.size * (0.8 + breath * 0.4));
        opAttr.setX(i, p.opacity);
      }

      posAttr.needsUpdate  = true;
      sizeAttr.needsUpdate = true;
      opAttr.needsUpdate   = true;

      // lines: connect nearby particles
      const lpAttr = lineGeom.attributes.position as THREE.BufferAttribute;
      const laAttr = lineGeom.attributes.aAlpha   as THREE.BufferAttribute;
      let lineIdx = 0;

      for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_LINES - MAX_CONNECTIONS; i++) {
        const p = particles[i];
        let connected = 0;
        for (let j = i + 1; j < PARTICLE_COUNT && connected < MAX_CONNECTIONS; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
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

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('scroll', onScroll);
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
