import React from 'react';
import { useTranslation } from 'react-i18next';

const FormattingExampleSection = () => {
  const { t, i18n } = useTranslation();
  const now = new Date();
  
  return (
    <section className="py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">i18next-icu Formatting Examples</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Date Formatting</h3>
              <p className="text-gray-300">
                {t('format.date', { date: now })}
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Currency Formatting</h3>
              <p className="text-gray-300">
                {t('format.currency', { amount: 1234.56 })}
              </p>
            </div>
            
            <div className="bg-gray-700 rounded p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Number Formatting</h3>
              <p className="text-gray-300">
                {t('format.number', { value: 9876.54321 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FormattingExampleSection; 