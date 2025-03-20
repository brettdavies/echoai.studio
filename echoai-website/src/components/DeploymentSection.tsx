import React from 'react';

const deploymentSteps = [
  {
    title: "Setup",
    features: [
      "Quick installation via NPM or CDN",
      "Simple API key authentication",
      "Comprehensive documentation"
    ]
  },
  {
    title: "API",
    features: [
      "RESTful and WebSocket APIs",
      "Streaming and batch processing",
      "Cross-platform SDKs available"
    ]
  },
  {
    title: "Integration",
    features: [
      "Pre-built integrations with popular platforms",
      "Custom webhook support",
      "Open-source plugins and extensions"
    ]
  }
];

const DeploymentSection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Lightning fast deployment and results
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Get up and running in minutes, not weeks. Our platform is designed for seamless integration and immediate value.
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