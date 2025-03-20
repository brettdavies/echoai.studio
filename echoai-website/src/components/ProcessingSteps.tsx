import React from 'react';
import Mermaid from './Mermaid';

interface ProcessingStepsProps {
  orientation?: 'LR' | 'TD';
}

const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ orientation = 'LR' }) => {
  const mermaidDiagram = `
graph ${orientation}
    IS[Input Stream] --> AS[Audio Stream]
    IS --> VS2[Video Stream]
    
    AS --> T1[Provider A]
    AS --> T2[Provider B]
    AS --> T3[Provider C]
    
    T1 --> TE[Transcript Enrichment]
    T2 --> TE
    T3 --> TE
    
    TE --> TL[Translation]
    TE --> C[Caption Processing]
    TL --> C
    
    VS2 --> FA[Frame Analysis]
    
    C --> PO[Production Output]
    FA --> PO
    
    linkStyle default stroke-width:2px
    linkStyle 1,4,8 stroke-width:2px,stroke-dasharray:10
    
    style IS fill:#9b5de5,stroke:#333,color:white,stroke-width:2px
    style AS fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style VS2 fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style T1 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T2 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style T3 fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TE fill:#0057B7,stroke:#333,color:white,stroke-width:2px
    style TL fill:#4B0082,stroke:#333,color:white,stroke-width:2px
    style C fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style FA fill:#2b9348,stroke:#333,color:white,stroke-width:2px
    style PO fill:#d00000,stroke:#333,color:white,stroke-width:2px
  `;

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-center text-slate-300 text-sm font-medium mb-2 w-full">
        Echo Core Processing Pipeline
      </h3>
      <div className="w-full">
        <Mermaid chart={mermaidDiagram} />
      </div>
    </div>
  );
};

export default ProcessingSteps; 