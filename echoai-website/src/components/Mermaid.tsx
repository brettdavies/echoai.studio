import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { uiLoggers } from '../utils/LoggerFactory';

/**
 * Props for the Mermaid component
 */
interface MermaidProps {
  chart: string;
}

// Initialize mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
});

/**
 * Mermaid component for rendering diagrams
 * 
 * @param chart - The mermaid chart definition as a string
 */
const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  
  // Set up intersection observer to detect when diagram is visible
  useEffect(() => {
    if (!mermaidRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );
    
    observer.observe(mermaidRef.current);
    
    return () => {
      if (mermaidRef.current) {
        observer.unobserve(mermaidRef.current);
      }
    };
  }, []);
  
  // Render chart when it becomes visible
  useEffect(() => {
    if (!chart || !isVisible || hasRendered) return;
    
    // Wait for the DOM to settle before rendering
    const timer = setTimeout(() => {
      renderChart();
      setHasRendered(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [chart, isVisible, hasRendered]);
  
  const renderChart = async () => {
    if (mermaidRef.current) {
      try {
        // Create a unique ID for this rendering
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // Adding a small delay to ensure i18n translations are fully loaded
        const { svg } = await mermaid.render(id, chart);
        mermaidRef.current.innerHTML = svg;
      } catch (error) {
        uiLoggers.general.error('Error rendering mermaid chart:', error);
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

  return <div className="mermaid-diagram w-full h-full" ref={mermaidRef}></div>;
};

export default Mermaid; 