import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

interface AudioVisualizerProps {
  showCanvas: boolean;
  className?: string;
}

/**
 * Component for visualizing audio frequencies
 */
const AudioVisualizer = forwardRef<HTMLCanvasElement, AudioVisualizerProps>(({
  showCanvas,
  className = '',
}, ref) => {
  const { t } = useTranslation();

  return (
    <div className="mb-4 bg-black/30 rounded-md overflow-hidden">
      <canvas 
        ref={ref}
        width={600} 
        height={80}
        className={`w-full h-20 ${showCanvas ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
      {!showCanvas && (
        <div className="w-full h-20 flex items-center justify-center">
          <div className="animate-pulse text-white/50 text-xs">
            {t('audioPlayer.loading')}
          </div>
        </div>
      )}
    </div>
  );
});

AudioVisualizer.displayName = 'AudioVisualizer';

export default AudioVisualizer; 