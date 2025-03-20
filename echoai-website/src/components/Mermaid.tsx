import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          const { svg } = await mermaid.render(id, chart);
          mermaidRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Error rendering mermaid chart:', error);
          mermaidRef.current.innerHTML = `<div class="text-red-500">Error rendering diagram</div>`;
        }
      }
    };

    renderChart();
  }, [chart]);

  return <div className="mermaid-diagram w-full h-full" ref={mermaidRef}></div>;
};

export default Mermaid; 