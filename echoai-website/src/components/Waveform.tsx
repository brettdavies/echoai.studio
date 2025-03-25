import React, { useState, useEffect, useRef } from 'react';

const Waveform: React.FC = () => {
  const [paths, setPaths] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const waveformRef = useRef<HTMLDivElement>(null);

  // Generate waveform points
  const generateWaveformPoints = (width: number, height: number, numPoints: number) => {
    const points = [];
    const centerY = height / 2;
    
    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * width;
      const amplitude = Math.random() * (height / 3);
      const y = centerY + amplitude * Math.sin(i * 0.5);
      points.push({ x, y });
    }
    
    return points;
  };

  // Format SVG path from points
  const createPath = (points: { x: number, y: number }[], width: number, offset: number = 0) => {
    let path = `M ${offset} ${points[0].y} `;
    
    for (let i = 1; i < points.length; i++) {
      path += `L ${points[i].x + offset} ${points[i].y} `;
    }
    
    return path;
  };

  useEffect(() => {
    // Initialize paths on component mount
    if (waveformRef.current) {
      const width = 1000; // Increased width for better coverage
      const height = 80;
      const numPoints = 120; // Increased number of points
      
      // Generate multiple paths for a more complex waveform
      const path1 = createPath(generateWaveformPoints(width, height, numPoints), width, 0);
      const path2 = createPath(generateWaveformPoints(width, height, numPoints), width, width);
      
      setPaths([path1, path2]);
    }
  }, []);

  // Animate waveform with horizontal movement
  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      setOffset(prevOffset => {
        const newOffset = prevOffset - 1;
        return newOffset <= -1000 ? 0 : newOffset;
      });
    }
    
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Number of bars in the bar-style waveform
  const numBars = 180;

  return (
    <div 
      ref={waveformRef} 
      className="w-full h-24 mb-6 overflow-hidden relative"
    >
      {/* Common center line */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-white opacity-20"></div>
      </div>
      
      {/* SVG line-style waveform */}
      <svg className="w-full h-full" preserveAspectRatio="none">
        {/* Waveform paths */}
        {paths.map((path, index) => (
          <path 
            key={index} 
            d={path} 
            fill="none" 
            stroke="url(#waveGradient)" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            transform={`translate(${offset}, 0)`}
          />
        ))}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Bar-style waveform */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-20 flex items-center justify-between">
          {Array.from({ length: numBars }).map((_, index) => {
            const wavePos = (index + offset * 0.1);
            const wave1 = Math.sin(wavePos * 0.2) * 30;
            const wave2 = Math.cos(wavePos * 0.1) * 15;
            const wave3 = Math.sin(wavePos * 0.05 + 1) * 10;
            const height = Math.abs(wave1 + wave2 + wave3);
            
            return (
              <div 
                key={index} 
                className="w-0.5 mx-px bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-400"
                style={{ 
                  height: `${height}%`,
                  transform: `translateY(${(wave1 + wave2) > 0 ? '-50%' : '50%'})`,
                  opacity: 0.7 + (height / 100) * 0.3,
                }}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Waveform; 