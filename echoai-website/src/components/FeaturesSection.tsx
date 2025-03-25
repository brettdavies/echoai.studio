import React from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Target } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  points: string[];
}

const FeaturesSection = () => {
  const { t } = useTranslation();
  
  const features: Feature[] = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('features.fasterThanAnyone.title'),
      points: t('features.fasterThanAnyone.points', { returnObjects: true }) as string[]
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: t('features.industryLeading.title'),
      points: t('features.industryLeading.points', { returnObjects: true }) as string[]
    }
  ];

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          {t('features.title')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-gray-900 rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-900/30">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium text-white">{feature.title}</h3>
              </div>
              
              <div className="space-y-4">
                {feature.points.map((point: string, pointIndex: number) => (
                  <p key={pointIndex} className="text-gray-300">{point}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 