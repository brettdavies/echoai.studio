import React, { useState, useEffect } from 'react';
import ProcessingSteps from './ProcessingSteps';

const ResponsiveDiagram: React.FC = () => {
  const [orientation, setOrientation] = useState<'LR' | 'TD'>('LR');
  
  useEffect(() => {
    // Function to handle resize and update orientation
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setOrientation('TD'); // Top-Down for mobile
      } else {
        setOrientation('LR'); // Left-Right for desktop
      }
    };
    
    // Set initial orientation
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return <ProcessingSteps orientation={orientation} />;
};

export default ResponsiveDiagram; 