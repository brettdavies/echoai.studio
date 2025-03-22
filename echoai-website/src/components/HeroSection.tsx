import { Button } from "../components/ui/button";
import CountdownTimer from "./CountdownTimer";
import { useTranslation } from 'react-i18next';

const HeroSection = () => {
  const { t } = useTranslation();
  
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
      </div>
    </section>
  );
};

export default HeroSection; 