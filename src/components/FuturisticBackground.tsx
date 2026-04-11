import { useEffect, useRef } from 'react';

const FuturisticBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; pulse: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Arc rings config
    const rings = [
      { cx: 0.2, cy: 0.3, r: 200, startAngle: 0, speed: 0.15, width: 1.2 },
      { cx: 0.8, cy: 0.2, r: 280, startAngle: Math.PI, speed: -0.1, width: 1.5 },
      { cx: 0.5, cy: 0.7, r: 320, startAngle: 0.5, speed: 0.12, width: 1 },
      { cx: 0.15, cy: 0.8, r: 180, startAngle: 2, speed: -0.18, width: 1.3 },
      { cx: 0.85, cy: 0.75, r: 250, startAngle: 1, speed: 0.08, width: 1.1 },
      { cx: 0.5, cy: 0.15, r: 350, startAngle: 3, speed: -0.06, width: 0.8 },
      { cx: 0.3, cy: 0.5, r: 150, startAngle: 4, speed: 0.2, width: 1.4 },
      { cx: 0.7, cy: 0.5, r: 220, startAngle: 5, speed: -0.14, width: 1 },
    ];

    // Flowing curves config
    const curves = [
      { yOffset: 0.25, amplitude: 80, frequency: 0.003, speed: 0.4, width: 1.2 },
      { yOffset: 0.5, amplitude: 60, frequency: 0.002, speed: -0.3, width: 1 },
      { yOffset: 0.75, amplitude: 100, frequency: 0.0025, speed: 0.35, width: 0.8 },
      { yOffset: 0.4, amplitude: 50, frequency: 0.004, speed: -0.5, width: 1.5 },
    ];

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      time += 0.008;

      // Clear with dark gradient
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'hsl(260, 30%, 6%)');
      grad.addColorStop(1, 'hsl(260, 25%, 3%)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'screen';

      // Draw arc rings
      rings.forEach((ring) => {
        const cx = ring.cx * w;
        const cy = ring.cy * h;
        const angle = ring.startAngle + time * ring.speed;
        const arcLen = Math.PI * 0.8 + Math.sin(time * 0.5) * 0.3;
        const fadeAlpha = 0.15 + Math.sin(time * 0.3 + ring.startAngle) * 0.08;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, angle, angle + arcLen);
        ctx.strokeStyle = `hsla(270, 80%, 65%, ${fadeAlpha})`;
        ctx.lineWidth = ring.width;
        ctx.shadowColor = 'hsla(270, 90%, 60%, 0.4)';
        ctx.shadowBlur = 20;
        ctx.filter = 'blur(1px)';
        ctx.stroke();
        ctx.restore();

        // Inner glow ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r * 0.85, angle + 0.5, angle + arcLen * 0.6);
        ctx.strokeStyle = `hsla(280, 70%, 55%, ${fadeAlpha * 0.5})`;
        ctx.lineWidth = ring.width * 0.6;
        ctx.shadowColor = 'hsla(280, 80%, 50%, 0.3)';
        ctx.shadowBlur = 15;
        ctx.filter = 'blur(2px)';
        ctx.stroke();
        ctx.restore();
      });

      // Draw flowing curves
      curves.forEach((curve) => {
        ctx.save();
        ctx.beginPath();
        const baseY = curve.yOffset * h;
        for (let x = 0; x < w; x += 2) {
          const y = baseY +
            Math.sin(x * curve.frequency + time * curve.speed) * curve.amplitude +
            Math.sin(x * curve.frequency * 2.5 + time * curve.speed * 1.5) * curve.amplitude * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const fadeAlpha = 0.1 + Math.sin(time * 0.4 + curve.yOffset * 10) * 0.05;
        ctx.strokeStyle = `hsla(265, 75%, 60%, ${fadeAlpha})`;
        ctx.lineWidth = curve.width;
        ctx.shadowColor = 'hsla(265, 85%, 55%, 0.3)';
        ctx.shadowBlur = 12;
        ctx.filter = 'blur(1.5px)';
        ctx.stroke();
        ctx.restore();
      });

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const pAlpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(270, 80%, 75%, ${pAlpha})`;
        ctx.shadowColor = 'hsla(270, 90%, 70%, 0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });

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
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default FuturisticBackground;
