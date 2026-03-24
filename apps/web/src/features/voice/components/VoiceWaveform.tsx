import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  getByteFrequencyData?: () => Uint8Array;
}

export function VoiceWaveform({ state, getByteFrequencyData }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    
    // Config
    const bars = 40;
    const barWidth = Math.max(2, Math.floor(width / bars) - 2);
    const gap = (width - (bars * barWidth)) / bars;

    let phase = 0; // For simulated animation during 'speaking'

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (state === 'idle' || state === 'error' || state === 'thinking') {
        // Draw a flat line
        ctx.fillStyle = state === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 116, 139, 0.2)';
        const centerY = height / 2;
        const lineH = 2;
        for (let i = 0; i < bars; i++) {
          const x = i * (barWidth + gap);
          ctx.fillRect(x, centerY - lineH / 2, barWidth, lineH);
        }
        return;
      }

      ctx.fillStyle = state === 'listening' 
        ? 'rgba(239, 68, 68, 0.8)' // Red for listening
        : 'rgba(56, 189, 248, 0.8)'; // Blue for speaking

      if (state === 'listening' && getByteFrequencyData) {
        // Real mic data
        const dataArray = getByteFrequencyData();
        // Take a subset of the frequency bins (skip the extremely high ones)
        const step = Math.floor((dataArray.length * 0.5) / bars) || 1;
        
        for (let i = 0; i < bars; i++) {
          const value = dataArray[i * step] || 0;
          // Normalize to canvas height
          const percent = value / 255;
          const barHeight = Math.max(2, percent * height * 0.8);
          
          const x = i * (barWidth + gap);
          const y = (height - barHeight) / 2;
          
          // Draw rounded rect
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (state === 'speaking') {
        // Simulated sine wave for TTS playback
        phase += 0.15;
        for (let i = 0; i < bars; i++) {
          // Create some interesting interference patterns
          const wave1 = Math.sin(phase + i * 0.2);
          const wave2 = Math.cos(phase * 0.8 + i * 0.5);
          const wave3 = Math.sin(phase * 1.5 + i * 0.1);
          
          const baseIntensity = (wave1 + wave2 + wave3) / 3;
          // Map [-1, 1] to [0.1, 0.9] of height
          const percent = 0.1 + ((baseIntensity + 1) / 2) * 0.8;
          
          const barHeight = Math.max(2, percent * height);
          const x = i * (barWidth + gap);
          const y = (height - barHeight) / 2;
          
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, getByteFrequencyData]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-12"
      style={{ display: 'block' }}
    />
  );
}
