import React from 'react';

const securityFeatures = [
  {
    title: "SOC-2 Type II Certified",
    description: "Highest level of data security and compliance",
    image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=500&h=300"
  },
  {
    title: "HIPAA Compliant",
    description: "Fully compliant with healthcare privacy standards",
    image: "https://images.unsplash.com/photo-1597733336794-12d05021d510?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=500&h=300"
  },
  {
    title: "GDPR & CCPA Ready",
    description: "Built with privacy regulations in mind",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=500&h=300"
  },
  {
    title: "End-to-End Encryption",
    description: "Your data is always protected",
    image: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=500&h=300"
  }
];

const EnterpriseSecuritySection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Enterprise-secure
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Protecting your data with industry-leading security standards and compliance certifications.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="h-40 overflow-hidden">
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-white font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EnterpriseSecuritySection; 