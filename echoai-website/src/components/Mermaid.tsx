import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't attempt to render if chart is empty
    if (!chart || chart.trim() === '') {
      return;
    }

    // Reset the container first
    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#6d28d9',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#8b5cf6',
        lineColor: '#a78bfa',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#18181b'
      }
    });
    
    const renderChart = async () => {
      if (mermaidRef.current) {
        try {
          // Create a unique ID for this rendering
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          // Adding a small delay to ensure i18n translations are fully loaded
          const { svg } = await mermaid.render(id, chart);
          mermaidRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Error rendering mermaid chart:', error);
          // Only show error in development, not in production
          if (process.env.NODE_ENV === 'development') {
            mermaidRef.current.innerHTML = `<div class="text-red-500">Error rendering diagram</div>`;
          } else {
            // In production, fail silently and try again on next render cycle
            mermaidRef.current.innerHTML = '';
          }
        }
      }
    };

    // Add a small delay to ensure i18n is fully loaded
    const timer = setTimeout(() => {
      renderChart();
    }, 10);

    return () => clearTimeout(timer);
  }, [chart]);

  return <div className="mermaid-diagram w-full h-full" ref={mermaidRef}></div>;
};

export default Mermaid; 