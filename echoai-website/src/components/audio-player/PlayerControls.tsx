import React from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlayerControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onPlayPause: () => void;
  onVolumeChange: (values: number[]) => void;
  onMuteToggle: () => void;
  enableCapture?: boolean;
  isCapturing?: boolean;
  sourceNode?: MediaElementAudioSourceNode | null;
  audioContext?: AudioContext | null;
}

/**
 * Component for audio player controls (play/pause, volume, mute)
 */
const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isMuted,
  volume,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  enableCapture = false,
  isCapturing = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onPlayPause}
            className="bg-slate-800 hover:bg-slate-700 text-white border-none"
          >
            {isPlaying ? t('audioPlayer.pause') : t('audioPlayer.play')}
          </Button>
          <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded-full">LIVE</span>
          
          {/* Audio Capture Indicator */}
          {enableCapture && (
            <span className={`text-xs ${isCapturing ? 'bg-green-700' : 'bg-gray-700'} text-white px-2 py-0.5 rounded-full flex items-center gap-1`}>
              <Mic className="h-3 w-3" />
              {isCapturing ? t('audioPlayer.capturing') : t('audioPlayer.captureReady')}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMuteToggle}
            className="text-white p-1"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <span className="text-xs text-white/70">{t('audioPlayer.volume')}</span>
          <Slider 
            value={[volume * 100]} 
            max={100}
            step={1}
            onValueChange={onVolumeChange}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerControls; 