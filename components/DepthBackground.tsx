'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
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
  const { size } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture:     { value: colorMap },
        uDepth:       { value: depthMap },
        uMouse:       { value: new THREE.Vector2(0, 0) },
        uScroll:      { value: 0 },
        uStrength:    { value: 0.028 },
        uResolution:  { value: new THREE.Vector2(1, 1) },
        uImageAspect: { value: 1.7768 }, // 1672 / 941 — updated once texture loads
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
        uniform vec2 uResolution;
        uniform float uImageAspect;

        varying vec2 vUv;

        void main() {
          // Cover-style: scale < 1 so we zoom into the image center, no edge clamping
          float viewAspect = uResolution.x / uResolution.y;
          vec2 scale = vec2(1.0);
          if (viewAspect > uImageAspect) {
            // viewport wider than image — fill width, crop height
            scale.y = uImageAspect / viewAspect;
          } else {
            // viewport narrower than image (portrait) — fill height, crop width
            scale.x = viewAspect / uImageAspect;
          }
          vec2 coveredUv = (vUv - 0.5) * scale + 0.5;

          float depth = texture2D(uDepth, coveredUv).r;
          vec2 parallax   = uMouse * (depth - 0.5) * uStrength;
          vec2 scrollShift = vec2(0.0, uScroll * 0.018 * (depth - 0.5));

          vec2 uv = coveredUv + parallax + scrollShift;
          gl_FragColor = texture2D(uTexture, uv);
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

    // Exact aspect from loaded texture
    if (colorMap.image?.width && colorMap.image?.height) {
      material.uniforms.uImageAspect.value = colorMap.image.width / colorMap.image.height;
    }

    // Desktop: mouse parallax
    const onMouseMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    // Mobile: touch drag parallax
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      target.current.x = (t.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = -(t.clientY / window.innerHeight - 0.5) * 2;
    };

    // Mobile: gyroscope parallax (Android + iOS <13 automatic; iOS 13+ needs permission)
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        target.current.x = Math.max(-1, Math.min(1, e.gamma / 30));
        target.current.y = Math.max(-1, Math.min(1, (e.beta - 30) / 30));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation);

    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: self => { target.current.scroll = self.progress; },
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('deviceorientation', onOrientation);
      trigger.kill();
    };
  }, [colorMap, depthMap, material]);

  useFrame(() => {
    current.current.x      += (target.current.x      - current.current.x)      * 0.06;
    current.current.y      += (target.current.y      - current.current.y)      * 0.06;
    current.current.scroll += (target.current.scroll - current.current.scroll) * 0.06;

    material.uniforms.uMouse.value.set(current.current.x, current.current.y);
    material.uniforms.uScroll.value = current.current.scroll;
    material.uniforms.uResolution.value.set(size.width, size.height);
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

      {/* Left-to-right readability gradient (desktop) */}
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.56) 38%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0) 100%)',
        }}
      />
      {/* Centre vignette for mobile (portrait) */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.72) 100%)',
        }}
      />
      {/* Global veil */}
      <div className="pointer-events-none absolute inset-0 bg-black/15" />
      {/* Bottom vignette */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
      />
    </div>
  );
}
