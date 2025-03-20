import React from 'react';
import { Button } from '../components/ui/button';

const BestResultsSection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          The best results happen when<br />AI + human judgment come together
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Our platform enhances human capabilities rather than replacing them, creating a powerful synergy that delivers superior outcomes.
        </p>
        <Button size="lg" className="rounded-full">
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default BestResultsSection; 