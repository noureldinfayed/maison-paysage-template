'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function DepthPlane() {
  const target = useRef({ x: 0, y: 0, scroll: 0 });
  const current = useRef({ x: 0, y: 0, scroll: 0 });

  const colorMap = useLoader(THREE.TextureLoader, '/terrace/main.png');
  const depthMap = useLoader(THREE.TextureLoader, '/terrace/depth.png');

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: colorMap },
        uDepth: { value: depthMap },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uScroll: { value: 0 },
        uStrength: { value: 0.028 },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uDepth;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform float uStrength;

        varying vec2 vUv;

        void main() {
          float depth = texture2D(uDepth, vUv).r;

          vec2 parallax = uMouse * (depth - 0.5) * uStrength;
          vec2 scrollShift = vec2(0.0, uScroll * 0.018 * (depth - 0.5));

          vec2 uv = vUv + parallax + scrollShift;

          vec4 color = texture2D(uTexture, uv);
          gl_FragColor = color;
        }
      `,
      transparent: false,
    });
  }, [colorMap, depthMap]);

  useEffect(() => {
    colorMap.minFilter = THREE.LinearFilter;
    colorMap.magFilter = THREE.LinearFilter;
    colorMap.wrapS = THREE.ClampToEdgeWrapping;
    colorMap.wrapT = THREE.ClampToEdgeWrapping;

    depthMap.minFilter = THREE.LinearFilter;
    depthMap.magFilter = THREE.LinearFilter;
    depthMap.wrapS = THREE.ClampToEdgeWrapping;
    depthMap.wrapT = THREE.ClampToEdgeWrapping;

    const onMouseMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', onMouseMove);

    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => {
        target.current.scroll = self.progress;
      },
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      trigger.kill();
    };
  }, [colorMap, depthMap]);

  useFrame(() => {
    current.current.x += (target.current.x - current.current.x) * 0.06;
    current.current.y += (target.current.y - current.current.y) * 0.06;
    current.current.scroll += (target.current.scroll - current.current.scroll) * 0.06;

    material.uniforms.uMouse.value.set(current.current.x, current.current.y);
    material.uniforms.uScroll.value = current.current.scroll;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default function DepthBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-black">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0, 1], fov: 75 }}
      >
        <DepthPlane />
      </Canvas>

      {/* Left-to-right readability gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.56) 38%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* Global veil — keeps mid-tones readable without killing the image */}
      <div className="pointer-events-none absolute inset-0 bg-black/12" />
      {/* Bottom vignette */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
      />
    </div>
  );
}
