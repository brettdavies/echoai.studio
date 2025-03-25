import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Mermaid from './Mermaid';

interface ProcessingStepsProps {
  orientation?: 'LR' | 'TD';
}

const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ orientation = 'LR' }) => {
  const { t, i18n } = useTranslation();
  const [mermaidChart, setMermaidChart] = useState('');
  const [isI18nReady, setIsI18nReady] = useState(false);
  
  // Check if i18n is initialized
  useEffect(() => {
    // Only set the chart when i18n is ready and language is loaded
    if (i18n.isInitialized && i18n.language) {
      setIsI18nReady(true);
    }
  }, [i18n.isInitialized, i18n.language]);
  
  // Generate the Mermaid diagram with translated labels
  useEffect(() => {
    // Only set the chart when i18n is ready
    if (!isI18nReady) return;
    
    const diagram = `
graph ${orientation}
    IS[${t('processingSteps.inputStream')}] --> AS[${t('processingSteps.audioStream')}]
    IS --> VS2[${t('processingSteps.videoStream')}]
    
    AS --> T1[${t('processingSteps.providerA')}]
    AS --> T2[${t('processingSteps.providerB')}]
    AS --> T3[${t('processingSteps.providerC')}]
    
    T1 --> TE[${t('processingSteps.transcriptEnrichment')}]
    T2 --> TE
    T3 --> TE
    
    TE --> TL[${t('processingSteps.translation')}]
    TE --> C[${t('processingSteps.captionProcessing')}]
    TL --> C
    
    VS2 --> FA[${t('processingSteps.frameAnalysis')}]
    FA --> C
    
    C --> PO[${t('processingSteps.productionOutput')}]
    
    linkStyle default stroke-width:2px
    linkStyle 1,3,4,8 stroke-width:2px,stroke-dasharray:10
    
    style IS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style AS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style VS2 fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style T1 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T2 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T3 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TE fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TL fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style C fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style FA fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style PO fill:#dc2626,stroke:#333,color:white,stroke-width:2px
  `;
    
    setMermaidChart(diagram);
  }, [orientation, isI18nReady, i18n.language, t]);

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-center text-slate-300 text-sm font-medium mb-2 w-full">
        {t('processingSteps.title')}
      </h3>
      <div className="w-full">
        {isI18nReady && <Mermaid chart={mermaidChart} />}
      </div>
    </div>
  );
};

export default ProcessingSteps; 