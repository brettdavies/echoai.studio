import React from 'react';
import { useTranslation } from 'react-i18next';

const MetricsSection = () => {
  const { t } = useTranslation();
  
  const metrics = [
    {
      value: t('metrics.metric1.value'),
      label: t('metrics.metric1.label')
    },
    {
      value: t('metrics.metric2.value'),
      label: t('metrics.metric2.label')
    },
    {
      value: t('metrics.metric3.value'),
      label: t('metrics.metric3.label')
    },
    {
      value: t('metrics.metric4.value'),
      label: t('metrics.metric4.label')
    }
  ];

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('metrics.title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('metrics.description')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-5xl font-bold text-white mb-2">{metric.value}</div>
              <div className="text-gray-400">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Wave background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-r from-purple-900 via-pink-800 to-orange-800 opacity-30 transform skew-y-6"></div>
    </section>
  );
};

export default MetricsSection; 