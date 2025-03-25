import React from 'react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const BestResultsSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {t('bestResults.title')}
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          {t('bestResults.description')}
        </p>
        {/* <Button size="lg" className="rounded-full">
          {t('common.getStarted')}
        </Button> */}
      </div>
    </section>
  );
};

export default BestResultsSection; 