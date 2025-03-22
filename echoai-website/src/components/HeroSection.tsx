import { Button } from "../components/ui/button";
import CountdownTimer from "./CountdownTimer";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Lazily load the DashAudioPlayer component
const DashAudioPlayer = lazy(() => import('./DashAudioPlayer'));

// Sample transcript text for demonstration
const loremIpsumText = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Vestibulum nec felis orci. Cras vel dapibus magna.",
  "Donec consectetur risus nec dui faucibus, at dictum eros consequat.",
  "Integer finibus arcu ut augue tincidunt, et venenatis mi euismod.",
  "Nullam volutpat tortor a sapien pellentesque, quis ultrices nulla facilisis.",
  "Vivamus consectetur augue a magna malesuada, vitae faucibus libero tristique.",
  "Proin eleifend ex sit amet risus faucibus, nec sagittis dui ornare.",
  "Etiam porta vehicula elit, sit amet iaculis lectus sollicitudin vel.",
  "Phasellus faucibus velit vitae arcu congue, in tincidunt mi accumsan.",
  "Mauris at gravida sapien, nec placerat nunc."
];

const HeroSection = () => {
  const { t } = useTranslation();
  const [isBrowser, setIsBrowser] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  
  // BBC World Service stream URL
  const bbcStreamUrl = 'https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd';
  
  // Check if we're in a browser environment after mount
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Handle playback started event from DashAudioPlayer
  const handlePlaybackStarted = () => {
    setPlaybackStarted(true);
    setIsPlaying(true);
  };
  
  // Handle playback state changes
  const handlePlaybackStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };
  
  // Manage the scrolling transcript effect
  useEffect(() => {
    if (isPlaying) {
      // Start scrolling text effect when playing
      scrollIntervalRef.current = window.setInterval(() => {
        setCurrentTextIndex(prevIndex => (prevIndex + 1) % loremIpsumText.length);
        
        // Scroll to the bottom of the transcript container
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      }, 3000); // Change text every 3 seconds
    } else {
      // Stop scrolling when paused
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
    
    // Clean up on unmount
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isPlaying]);
  
  return (
    <section className="pt-32 pb-16 md:pb-24 bg-black text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          {t('heroSection.title')}
        </h1>
        <p className="text-white/70 max-w-2xl mx-auto mb-8 text-lg">
          {t('heroSection.description')}
        </p>
        
        {/* Countdown Timer with Waveform Visualization */}
        <CountdownTimer />
        
        {/* Audio Player Component */}
        {isBrowser && (
          <div className="mt-8 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">{t('audioPlayer.streaming')}</h3>
              <Volume2 size={18} className="text-gray-400" aria-label="Volume 80%" />
            </div>
            
            <div className="relative">
              {/* Position instruction text over the player but not over the controls */}
              <div 
                className={`absolute top-0 left-0 right-0 bottom-24 z-10 flex items-center justify-center transition-opacity duration-700 ease-in-out bg-black/70 rounded-t-md ${
                  playbackStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <p className="text-white/90 text-sm px-1">
                  Click play to start the audio stream. Volume is set to 80% by default.
                </p>
              </div>
              
              <Suspense fallback={
                <div className="w-full h-32 bg-black/40 rounded-lg p-4 flex items-center justify-center">
                  <p className="text-white/70">Loading audio player...</p>
                </div>
              }>
                <DashAudioPlayer 
                  url={bbcStreamUrl} 
                  onPlaybackStarted={handlePlaybackStarted}
                  onPlaybackStateChange={handlePlaybackStateChange}
                />
              </Suspense>
            </div>
            
            {/* Transcription Box */}
            <div className="mt-4 bg-black/20 border border-purple-800/50 rounded-md p-3 text-left">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300">Live Transcription</h4>
              </div>
              
              <div 
                ref={transcriptRef}
                className="h-24 overflow-hidden relative text-sm"
              >
                <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10"></div>
                
                <div className="space-y-2">
                  {/* Show previous lines with reduced opacity */}
                  {isPlaying && loremIpsumText.slice(0, currentTextIndex).slice(-3).map((text, index) => (
                    <p key={`prev-${index}`} className="text-white/50 transition-all duration-500">
                      {text}
                    </p>
                  ))}
                  
                  {/* Current line with full opacity and highlight */}
                  {isPlaying && (
                    <p 
                      className="text-white font-medium border-l-2 border-purple-500 pl-2 transition-all duration-500 animate-pulse"
                    >
                      {loremIpsumText[currentTextIndex]}
                    </p>
                  )}
                  
                  {/* Placeholder when not playing */}
                  {!isPlaying && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-white/40 italic">Transcription will appear here when audio is playing...</p>
                    </div>
                  )}
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection; 