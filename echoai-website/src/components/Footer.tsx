import React from 'react';

const footerLinks = [
  {
    title: "Platform",
    links: ["Features", "Pricing", "API", "Documentation", "Integrations"]
  },
  {
    title: "Resources",
    links: ["Blog", "Tutorials", "Examples", "Community", "Status"]
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Press", "Legal"]
  },
  {
    title: "Social",
    links: ["Twitter", "LinkedIn", "GitHub", "YouTube", "Discord"]
  }
];

const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {footerLinks.map((column, columnIndex) => (
            <div key={columnIndex}>
              <h5 className="text-white font-medium mb-4">{column.title}</h5>
              <ul className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <a href="#" className="text-white font-semibold text-lg">echoAI</a>
          </div>
          
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} echoAI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 