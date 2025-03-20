import React from 'react';
import ResponsiveDiagram from './ResponsiveDiagram';

const WorkflowCanvasSection = () => {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Rethink work with the<br />best AI workflow canvas
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our flexible system enables seamless integration with your existing workflows, making it easy to build custom applications.
          </p>
        </div>
        
        <div className="flex justify-center">
          {/* Demo UI Mockup */}
          <div className="w-full bg-gray-900/80 rounded-lg p-4 md:p-8 relative overflow-x-auto">
            {/* Dots background for canvas effect */}
            <div className="absolute inset-0 grid grid-cols-[repeat(80,1fr)] grid-rows-[repeat(20,1fr)] gap-1 opacity-40">
              {Array.from({ length: 1600 }).map((_, index) => (
                <div key={index} className="w-1 h-1 bg-gray-700 rounded-full"></div>
              ))}
            </div>
            
            {/* Workflow diagram using Mermaid */}
            <div className="relative z-10 flex flex-col items-center py-4">
              <ResponsiveDiagram />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowCanvasSection; 