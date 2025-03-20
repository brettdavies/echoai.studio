import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
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