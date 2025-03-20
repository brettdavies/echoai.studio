import React from 'react';

const MetricsToolsSection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            The only platform with trusted AI<br />metrics and evaluation tools
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Gain actionable insights with our comprehensive analytics dashboard. Monitor performance, accuracy, and latency in real-time.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Colored bar chart */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Accuracy & Recognition Rates</h3>
            <div className="h-64 flex items-end gap-2">
              {Array.from({ length: 12 }).map((_, index) => {
                const height = 30 + Math.random() * 70;
                const colors = ['bg-purple-500', 'bg-blue-500', 'bg-indigo-500', 'bg-pink-500'];
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end">
                    <div 
                      className={`${colors[index % colors.length]} w-full rounded-t-sm`} 
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-gray-500 text-xs mt-2">{index + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Chart 2: Simple bar chart */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Latency Performance</h3>
            <div className="h-64 flex items-end gap-2">
              {Array.from({ length: 8 }).map((_, index) => {
                const height = 40 + Math.random() * 50;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end">
                    <div 
                      className="bg-gray-400 w-full rounded-t-sm" 
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-gray-500 text-xs mt-2">M{index + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Key metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">WER & Accuracy</h4>
            <div className="text-2xl font-bold text-white mb-1">94.8% Accurate</div>
            <div className="text-gray-500 text-sm">Industry-leading error rates</div>
          </div>
          
          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Avg latency per API call</h4>
            <div className="text-2xl font-bold text-white mb-1">187ms</div>
            <div className="text-gray-500 text-sm">Far below industry average</div>
          </div>
          
          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Streaming audio latency</h4>
            <div className="text-2xl font-bold text-white mb-1">680-750ms</div>
            <div className="text-gray-500 text-sm">Sub-second performance</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetricsToolsSection; 