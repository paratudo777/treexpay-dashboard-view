import { useEffect, useRef } from 'react';

const FuturisticBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Particles (reduced count)
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; pulse: number }[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Arc rings (reduced to 5)
    const rings = [
      { cx: 0.2, cy: 0.3, r: 200, startAngle: 0, speed: 0.15, width: 1.5 },
      { cx: 0.8, cy: 0.2, r: 280, startAngle: Math.PI, speed: -0.1, width: 1.8 },
      { cx: 0.5, cy: 0.7, r: 320, startAngle: 0.5, speed: 0.12, width: 1.2 },
      { cx: 0.15, cy: 0.8, r: 180, startAngle: 2, speed: -0.18, width: 1.5 },
      { cx: 0.7, cy: 0.5, r: 250, startAngle: 1, speed: 0.08, width: 1.3 },
    ];

    // Flowing curves (reduced to 3, larger step)
    const curves = [
      { yOffset: 0.25, amplitude: 80, frequency: 0.003, speed: 0.4, width: 1.5 },
      { yOffset: 0.5, amplitude: 60, frequency: 0.002, speed: -0.3, width: 1.2 },
      { yOffset: 0.75, amplitude: 100, frequency: 0.0025, speed: 0.35, width: 1 },
    ];

    const draw = () => {
      const w = W();
      const h = H();
      time += 0.008;

      // Clear - simple fill instead of gradient every frame
      ctx.fillStyle = 'hsl(260, 25%, 4%)';
      ctx.fillRect(0, 0, w, h);

      // No filter/blur - use thicker lines + lower alpha for soft glow look
      ctx.globalCompositeOperation = 'screen';

      // Draw arc rings - NO shadowBlur, NO filter
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        const cx = ring.cx * w;
        const cy = ring.cy * h;
        const angle = ring.startAngle + time * ring.speed;
        const arcLen = Math.PI * 0.8 + Math.sin(time * 0.5) * 0.3;
        const fadeAlpha = 0.12 + Math.sin(time * 0.3 + ring.startAngle) * 0.06;

        // Outer glow (thicker, lower alpha)
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, angle, angle + arcLen);
        ctx.strokeStyle = `hsla(270, 80%, 65%, ${fadeAlpha * 0.3})`;
        ctx.lineWidth = ring.width * 4;
        ctx.stroke();

        // Core line
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, angle, angle + arcLen);
        ctx.strokeStyle = `hsla(270, 80%, 65%, ${fadeAlpha})`;
        ctx.lineWidth = ring.width;
        ctx.stroke();
      }

      // Draw flowing curves - NO shadowBlur, NO filter
      for (let ci = 0; ci < curves.length; ci++) {
        const curve = curves[ci];
        const baseY = curve.yOffset * h;
        const fadeAlpha = 0.08 + Math.sin(time * 0.4 + curve.yOffset * 10) * 0.04;

        // Glow pass
        ctx.beginPath();
        for (let x = 0; x < w; x += 6) {
          const y = baseY +
            Math.sin(x * curve.frequency + time * curve.speed) * curve.amplitude +
            Math.sin(x * curve.frequency * 2.5 + time * curve.speed * 1.5) * curve.amplitude * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(265, 75%, 60%, ${fadeAlpha * 0.3})`;
        ctx.lineWidth = curve.width * 5;
        ctx.stroke();

        // Core line
        ctx.beginPath();
        for (let x = 0; x < w; x += 6) {
          const y = baseY +
            Math.sin(x * curve.frequency + time * curve.speed) * curve.amplitude +
            Math.sin(x * curve.frequency * 2.5 + time * curve.speed * 1.5) * curve.amplitude * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(265, 75%, 60%, ${fadeAlpha})`;
        ctx.lineWidth = curve.width;
        ctx.stroke();
      }

      // Draw particles - NO shadowBlur
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const pAlpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(270, 80%, 75%, ${pAlpha * 0.15})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(270, 80%, 75%, ${pAlpha})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};

export default FuturisticBackground;
