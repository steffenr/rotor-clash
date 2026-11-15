/**
 * Victory confetti: two cannons fire from the bottom corners, then a short rain
 * falls from the top. Pure canvas, no dependencies, time-based physics so it looks
 * the same at 60 and 120 Hz. Skipped entirely when the user prefers reduced motion.
 */

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 0 | 1 | 2; // rect, disc, ribbon
  rot: number;
  spin: number;
  wobble: number;
  wobbleSpeed: number;
  born: number;
}

const COLORS = ['#F15A24', '#FF8A5C', '#1E7898', '#2E96BC', '#4EAE80', '#E5A100', '#FFFDF7', '#E8E2D0'];
const MAX_MS = 6500;

let running = false;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makePiece(x: number, y: number, vx: number, vy: number, born: number): Piece {
  return {
    x,
    y,
    vx,
    vy,
    size: rand(6, 12),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
    rot: rand(0, Math.PI * 2),
    spin: rand(-0.35, 0.35),
    wobble: rand(0, Math.PI * 2),
    wobbleSpeed: rand(0.08, 0.25),
    born,
  };
}

export function launchConfetti(): void {
  if (typeof document === 'undefined' || prefersReducedMotion() || running) return;
  running = true;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    running = false;
    return;
  }
  ctx.scale(dpr, dpr);

  // Scale launch speed with the viewport so phones and desktops both reach mid-screen.
  const power = Math.max(0.75, Math.min(1.4, height / 800)) * 17;
  const pieces: Piece[] = [];
  const start = performance.now();

  // Cannons: left fires up-and-right, right fires up-and-left, in three staggered bursts.
  for (let burst = 0; burst < 3; burst++) {
    const t = burst * 260;
    for (let i = 0; i < 38; i++) {
      const fromLeft = i % 2 === 0;
      const angle = rand(-1.25, -0.75); // radians, mostly upward
      const speed = rand(0.6, 1.25) * power;
      const dir = fromLeft ? 1 : -1;
      pieces.push(
        makePiece(
          fromLeft ? -10 : width + 10,
          height + 10,
          Math.cos(angle) * speed * dir * 0.9 + (fromLeft ? 1 : -1) * 2,
          Math.sin(angle) * speed,
          t
        )
      );
    }
  }
  // Rain from the top once the cannons have peaked.
  for (let i = 0; i < 60; i++) {
    pieces.push(makePiece(rand(0, width), rand(-height * 0.35, -20), rand(-1.2, 1.2), rand(1, 3.2), 900 + rand(0, 1100)));
  }

  let last = start;

  function frame(now: number) {
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;
    const elapsed = now - start;
    ctx!.clearRect(0, 0, width, height);

    let alive = 0;
    for (const p of pieces) {
      if (elapsed < p.born) {
        alive++;
        continue;
      }
      p.vy += 0.42 * dt; // gravity
      p.vx *= Math.pow(0.992, dt); // air drag
      p.vy *= Math.pow(0.992, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.wobble += p.wobbleSpeed * dt;

      if (p.y < height + 30 && p.x > -60 && p.x < width + 60) alive++;
      else continue;

      const fade = Math.min(1, Math.max(0, (MAX_MS - elapsed) / 900));
      ctx!.save();
      ctx!.globalAlpha = fade;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      // Flutter: squash the piece along one axis so it looks like it tumbles in 3D.
      ctx!.scale(1, Math.cos(p.wobble));
      ctx!.fillStyle = p.color;
      if (p.shape === 0) {
        ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else if (p.shape === 1) {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.fillRect(-p.size * 0.9, -1.5, p.size * 1.8, 3);
      }
      ctx!.restore();
    }

    if (alive > 0 && elapsed < MAX_MS) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      running = false;
    }
  }

  requestAnimationFrame(frame);
}
