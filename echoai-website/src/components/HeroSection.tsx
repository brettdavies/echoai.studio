import { Button } from "../components/ui/button";

const HeroSection = () => {
  return (
    <section className="pt-32 pb-16 md:pb-24 bg-black text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          The complete platform for<br />trusted AI support
        </h1>
        <p className="text-white/70 max-w-2xl mx-auto mb-8 text-lg">
          Real-time, low-latency, accurate transcription of live audio that unlocks unlimited applications to engage consumers with multi-modal interactions.
        </p>
        <Button size="lg" className="rounded-full">
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default HeroSection; 