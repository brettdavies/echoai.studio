import { Button } from "../components/ui/button";
import CountdownTimer from "./CountdownTimer";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Lazily load the DashAudioPlayer component
const DashAudioPlayer = lazy(() => import('./DashAudioPlayer'));

const HeroSection = () => {
  const { t } = useTranslation();
  const [isBrowser, setIsBrowser] = useState(false);
  
  // BBC World Service stream URL
  const bbcStreamUrl = 'https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd';
  
  // Check if we're in a browser environment after mount
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  
  return (
    <section className="pt-32 pb-16 md:pb-24 bg-black text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          {t('heroSection.title')}
        </h1>
        <p className="text-white/70 max-w-2xl mx-auto mb-8 text-lg">
          {t('heroSection.description')}
        </p>
        <Button size="lg" className="rounded-full">
          {t('common.getStarted')}
        </Button>
        
        {/* Countdown Timer with Waveform Visualization */}
        <CountdownTimer />
        
        {/* Audio Player Component */}
        {isBrowser && (
          <div className="mt-8 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-xl font-semibold">{t('audioPlayer.streaming')}</h3>
              <Volume2 size={18} className="text-gray-400" aria-label="Volume 80%" />
            </div>
            <p className="text-white/60 text-sm mb-4">Audio stream starts automatically with volume muted. Use the volume slider to adjust.</p>
            
            <p className="text-white/60 text-sm mb-4">Click play to start the audio stream. Volume is set to 80% by default.</p>
            <Suspense fallback={
              <div className="w-full h-32 bg-black/40 rounded-lg p-4 flex items-center justify-center">
                <p className="text-white/70">Loading audio player...</p>
              </div>
            }>
              <DashAudioPlayer url={bbcStreamUrl} />
            </Suspense>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection; 