import React from 'react';
import { useTranslation } from 'react-i18next';

const DeploymentSection = () => {
  const { t } = useTranslation();
  
  const deploymentSteps = [
    {
      title: t('deployment.steps.step1.title'),
      features: t('deployment.steps.step1.features', { returnObjects: true })
    },
    {
      title: t('deployment.steps.step2.title'),
      features: t('deployment.steps.step2.features', { returnObjects: true })
    },
    {
      title: t('deployment.steps.step3.title'),
      features: t('deployment.steps.step3.features', { returnObjects: true })
    }
  ];

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('deployment.title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('deployment.description')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {deploymentSteps.map((step, index) => (
            <div key={index} className="border border-gray-800 rounded-lg p-8">
              <div className="text-lg font-semibold text-white mb-6">{step.title}</div>
              <ul className="space-y-4">
                {step.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeploymentSection; 