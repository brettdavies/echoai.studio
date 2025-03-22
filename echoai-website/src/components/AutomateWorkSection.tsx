import React from 'react';
import { useTranslation } from 'react-i18next';

const AutomateWorkSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-24 relative bg-black overflow-hidden">
      {/* Light trails background effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-blue-900/40 mix-blend-overlay"></div>
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"
              style={{
                left: 0,
                right: 0,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.7,
                height: `${1 + Math.random() * 2}px`,
                transform: `rotate(${Math.random() * 5}deg)`,
              }}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight">
          {t('automateWork.title')}
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 mx-auto mb-6"></div>
      </div>
    </section>
  );
};

export default AutomateWorkSection; 