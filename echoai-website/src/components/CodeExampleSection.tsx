import React from 'react';
import { useTranslation } from 'react-i18next';

const CodeExampleSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t('codeExample.title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('codeExample.description')}
          </p>
        </div>

        <div className="max-w-4xl mx-auto border-2 border-orange-500 rounded-lg overflow-hidden bg-black p-1">
          <div className="bg-gray-900 rounded-lg text-left p-6">
            <div className="flex gap-2 pb-4 mb-4 border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <pre className="text-white overflow-x-auto font-mono text-sm">
              <code>
                {t('codeExample.code')}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodeExampleSection; 