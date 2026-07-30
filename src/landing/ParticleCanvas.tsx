import React, { useEffect, useRef } from 'react';

export const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawGrid();
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Draw light coordinate grid dots
      const gridSize = 40;
      ctx.fillStyle = '#e5e7eb';
      for (let x = gridSize; x < width; x += gridSize) {
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw subtle grid lines on top-right hero area
      const heroRightStart = width * 0.5;
      ctx.strokeStyle = 'rgba(229, 231, 235, 0.6)';
      ctx.lineWidth = 1;

      for (let x = heroRightStart; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height * 0.7);
        ctx.stroke();
      }

      for (let y = 60; y < height * 0.7; y += 60) {
        ctx.beginPath();
        ctx.moveTo(heroRightStart, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Red Accent Target Axis Line
      const targetX = heroRightStart + 240;
      const targetY = 140;

      ctx.strokeStyle = 'rgba(240, 74, 36, 0.4)';
      ctx.lineWidth = 1;

      // Vertical red axis line
      ctx.beginPath();
      ctx.moveTo(targetX, 0);
      ctx.lineTo(targetX, height * 0.7);
      ctx.stroke();

      // Horizontal red axis line
      ctx.beginPath();
      ctx.moveTo(heroRightStart - 100, targetY);
      ctx.lineTo(width, targetY);
      ctx.stroke();

      // Orange square node at target intersection
      ctx.fillStyle = '#f04a24';
      ctx.fillRect(targetX - 5, targetY - 5, 10, 10);
    };

    window.addEventListener('resize', resize);
    resize();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
