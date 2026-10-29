import React, { useEffect, useRef, useState } from 'react';

/**
 * 6 Harmonic Orbital Ambient Glow Canvas
 * Reverse-engineered directly from Echo Music's AmbientGlowBackground.kt:
 * - 6 orbital color blobs orbiting on harmonic frequencies
 * - Color palette extraction from album art (Vibrant, Light/Dark Vibrant, Muted, Light/Dark Muted)
 * - Continuous circular color lerping across harmonic cycles
 * - Hardware-accelerated fluid canvas rendering
 */

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let v = t;
      if (v < 0) v += 1;
      if (v > 1) v -= 1;
      if (v < 1 / 6) return p + (q - p) * 6 * v;
      if (v < 1 / 2) return q;
      if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHsl(r, g, b) {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function generateFallbackPalette(seedStr) {
  let hash = 0;
  const str = seedStr || 'dropify-ambient-seed';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const baseHue = Math.abs(hash % 360) / 360;

  return [
    hslToRgb(baseHue, 0.85, 0.55),                    // Vibrant
    hslToRgb((baseHue + 0.12) % 1.0, 0.90, 0.68),     // Light Vibrant
    hslToRgb((baseHue + 0.88) % 1.0, 0.80, 0.38),     // Dark Vibrant
    hslToRgb((baseHue + 0.50) % 1.0, 0.45, 0.52),     // Muted
    hslToRgb((baseHue + 0.62) % 1.0, 0.40, 0.70),     // Light Muted
    hslToRgb((baseHue + 0.38) % 1.0, 0.50, 0.32)      // Dark Muted
  ];
}

async function extractPaletteFromImage(imageUrl, fallbackSeed) {
  if (!imageUrl || typeof window === 'undefined') {
    return generateFallbackPalette(fallbackSeed);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const fallback = () => resolve(generateFallbackPalette(fallbackSeed));

    img.onload = () => {
      try {
        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!offCtx) return fallback();

        const sampleSize = 64;
        offCanvas.width = sampleSize;
        offCanvas.height = sampleSize;
        offCtx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = offCtx.getImageData(0, 0, sampleSize, sampleSize).data;
        const colorBuckets = {
          vibrant: null,
          lightVibrant: null,
          darkVibrant: null,
          muted: null,
          lightMuted: null,
          darkMuted: null
        };

        let maxScore = {
          vibrant: -1,
          lightVibrant: -1,
          darkVibrant: -1,
          muted: -1,
          lightMuted: -1,
          darkMuted: -1
        };

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];
          if (a < 128) continue;

          const { h, s, l } = rgbToHsl(r, g, b);
          // Skip extreme whites and deep blacks
          if (l < 0.1 || l > 0.92) continue;

          const rgbObj = { r, g, b };

          if (s >= 0.4) {
            // Vibrant territory
            if (l >= 0.35 && l <= 0.65) {
              const score = s * 2 + (1 - Math.abs(l - 0.5));
              if (score > maxScore.vibrant) {
                maxScore.vibrant = score;
                colorBuckets.vibrant = rgbObj;
              }
            } else if (l > 0.65) {
              const score = s * 2 + l;
              if (score > maxScore.lightVibrant) {
                maxScore.lightVibrant = score;
                colorBuckets.lightVibrant = rgbObj;
              }
            } else if (l < 0.35) {
              const score = s * 2 + (1 - l);
              if (score > maxScore.darkVibrant) {
                maxScore.darkVibrant = score;
                colorBuckets.darkVibrant = rgbObj;
              }
            }
          } else {
            // Muted territory
            if (l >= 0.35 && l <= 0.65) {
              const score = (1 - s) + (1 - Math.abs(l - 0.5));
              if (score > maxScore.muted) {
                maxScore.muted = score;
                colorBuckets.muted = rgbObj;
              }
            } else if (l > 0.65) {
              const score = (1 - s) + l;
              if (score > maxScore.lightMuted) {
                maxScore.lightMuted = score;
                colorBuckets.lightMuted = rgbObj;
              }
            } else if (l < 0.35) {
              const score = (1 - s) + (1 - l);
              if (score > maxScore.darkMuted) {
                maxScore.darkMuted = score;
                colorBuckets.darkMuted = rgbObj;
              }
            }
          }
        }

        const fallbackPalette = generateFallbackPalette(fallbackSeed);
        const palette = [
          colorBuckets.vibrant || fallbackPalette[0],
          colorBuckets.lightVibrant || fallbackPalette[1],
          colorBuckets.darkVibrant || fallbackPalette[2],
          colorBuckets.muted || fallbackPalette[3],
          colorBuckets.lightMuted || fallbackPalette[4],
          colorBuckets.darkMuted || fallbackPalette[5]
        ];

        resolve(palette);
      } catch (err) {
        fallback();
      }
    };

    img.onerror = fallback;
    img.src = imageUrl;
  });
}

/**
 * 6 Harmonic Orbital Ambient Glow Component
 */
export default function AmbientGlowCanvas({
  albumArt = '',
  trackSeed = '',
  isPlaying = false,
  audioManager = null,
  className = '',
  style = {}
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Palette State & Smooth Interpolation
  const currentPaletteRef = useRef(generateFallbackPalette(trackSeed));
  const targetPaletteRef = useRef(generateFallbackPalette(trackSeed));
  const lerpProgressRef = useRef(1.0);

  useEffect(() => {
    let isCancelled = false;
    extractPaletteFromImage(albumArt, trackSeed).then((newPalette) => {
      if (!isCancelled && newPalette && newPalette.length === 6) {
        targetPaletteRef.current = newPalette;
        lerpProgressRef.current = 0.0; // Start 1.2s smooth color blend
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [albumArt, trackSeed]);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    const cycleDurationMs = 20000; // 20s harmonic cycle (matching Echo Music's 20000ms tween)
    const audioData = new Uint8Array(32);

    const oscillate = (progress, min, max, phase, speed = 1.0) => {
      const v = Math.sin(2.0 * Math.PI * (progress * speed + phase));
      return min + (max - min) * ((v + 1.0) * 0.5);
    };

    const rotatedColorAt = (index, progress, colors) => {
      const size = colors.length;
      if (size === 0) return { r: 50, g: 50, b: 50 };
      const idx = (index + progress * size) % size;
      const a = Math.floor(idx);
      const b = (a + 1) % size;
      const frac = idx - a;
      const cA = colors[a];
      const cB = colors[b];
      return {
        r: Math.round(cA.r + (cB.r - cA.r) * frac),
        g: Math.round(cA.g + (cB.g - cA.g) * frac),
        b: Math.round(cB.b + (cB.b - cA.b) * frac)
      };
    };

    const render = (time) => {
      animId = requestAnimationFrame(render);

      // Smooth palette crossfade (1.2s ease)
      if (lerpProgressRef.current < 1.0) {
        lerpProgressRef.current = Math.min(1.0, lerpProgressRef.current + 0.02);
        const t = lerpProgressRef.current;
        const cur = currentPaletteRef.current;
        const tgt = targetPaletteRef.current;
        for (let i = 0; i < 6; i++) {
          cur[i] = {
            r: Math.round(cur[i].r + (tgt[i].r - cur[i].r) * t),
            g: Math.round(cur[i].g + (tgt[i].g - cur[i].g) * t),
            b: Math.round(cur[i].b + (tgt[i].b - cur[i].b) * t)
          };
        }
      }

      const colors = currentPaletteRef.current;
      const progress = ((time - startTime) % cycleDurationMs) / cycleDurationMs;

      // Optional subtle audio pulse from bass frequencies
      let audioPulse = 1.0;
      if (isPlaying && audioManager && typeof audioManager.getFrequencyData === 'function') {
        try {
          audioManager.getFrequencyData(audioData);
          const bass = (audioData[0] + audioData[1] + audioData[2]) / (3 * 255);
          audioPulse = 1.0 + bass * 0.15;
        } catch (_) {}
      }

      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;

      // 1. Deep Organic Base Fill (#050505 from Echo Music's AmbientGlowBackground)
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // 2. Compute 6 Harmonic Orbital Coordinates & Radii (Exact Echo Music math)
      const o1x = oscillate(progress, 0.0, 1.0, 0.00, 1.0);
      const o1y = oscillate(progress, 0.0, 0.5, 0.07, 1.0);
      const r1  = oscillate(progress, 0.8, 1.6, 0.12, 1.0) * audioPulse;

      const o2x = oscillate(progress, 1.0, 0.0, 0.20, 1.0);
      const o2y = oscillate(progress, 0.5, 1.0, 0.25, 1.0);
      const r2  = oscillate(progress, 0.7, 1.5, 0.18, 1.0) * audioPulse;

      const o3x = oscillate(progress, 0.2, 0.8, 0.33, 1.0);
      const o3y = oscillate(progress, 0.8, 0.2, 0.36, 1.0);
      const r3  = oscillate(progress, 0.6, 1.4, 0.29, 1.0) * audioPulse;

      const o4x = oscillate(progress, 0.3, 0.7, 0.44, 1.0);
      const o4y = oscillate(progress, 0.2, 0.8, 0.41, 1.0);
      const r4  = oscillate(progress, 0.9, 1.7, 0.47, 1.0) * audioPulse;

      const o5x = oscillate(progress, 0.4, 0.6, 0.55, 1.0);
      const o5y = oscillate(progress, 0.0, 1.0, 0.51, 1.0);
      const r5  = oscillate(progress, 0.7, 1.5, 0.58, 1.0) * audioPulse;

      const o6x = oscillate(progress, 0.0, 1.0, 0.66, 1.0);
      const o6y = oscillate(progress, 0.5, 0.7, 0.62, 1.0);
      const r6  = oscillate(progress, 0.8, 1.8, 0.69, 1.0) * audioPulse;

      const c1 = rotatedColorAt(0, progress, colors);
      const c2 = rotatedColorAt(1, progress, colors);
      const c3 = rotatedColorAt(2, progress, colors);
      const c4 = rotatedColorAt(3, progress, colors);
      const c5 = rotatedColorAt(4, progress, colors);
      const c6 = rotatedColorAt(5, progress, colors);

      const blobs = [
        { c: c1, cx: W * o1x, cy: H * o1y, r: W * r1 * 0.75, a1: 0.85, a2: 0.50 },
        { c: c2, cx: W * o2x, cy: H * o2y, r: W * r2 * 0.75, a1: 0.80, a2: 0.45 },
        { c: c3, cx: W * o3x, cy: H * o3y, r: W * r3 * 0.75, a1: 0.75, a2: 0.40 },
        { c: c4, cx: W * o4x, cy: H * o4y, r: W * r4 * 0.75, a1: 0.70, a2: 0.35 },
        { c: c5, cx: W * o5x, cy: H * o5y, r: W * r5 * 0.75, a1: 0.65, a2: 0.30 },
        { c: c6, cx: W * o6x, cy: H * o6y, r: W * r6 * 0.75, a1: 0.60, a2: 0.25 }
      ];

      // Draw each orbital blob as a fluid radial gradient
      for (const b of blobs) {
        if (b.r <= 0) continue;
        const grad = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r);
        grad.addColorStop(0, `rgba(${b.c.r}, ${b.c.g}, ${b.c.b}, ${b.a1})`);
        grad.addColorStop(0.5, `rgba(${b.c.r}, ${b.c.g}, ${b.c.b}, ${b.a2})`);
        grad.addColorStop(1, 'rgba(5, 5, 5, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, audioManager]);

  // Handle Resize smoothly
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Render at half-res internally with CSS scaling for silky 60fps blur diffusion
        canvasRef.current.width = Math.max(320, Math.floor(rect.width / 2));
        canvasRef.current.height = Math.max(240, Math.floor(rect.height / 2));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`ambient-glow-wrapper ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          filter: 'blur(36px) saturate(1.4)',
          transform: 'scale(1.12)', // Slightly overscale to conceal blurred edges
          transformOrigin: 'center'
        }}
      />
    </div>
  );
}
