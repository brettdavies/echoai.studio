import { Button } from "../components/ui/button";
import { useState } from "react";

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-sm py-4 border-b border-gray-800">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <a href="#" className="text-white font-semibold text-lg">echoAI</a>
          
          <div className="hidden md:flex ml-10 space-x-8">
            <a href="#" className="text-white/70 hover:text-white text-sm">Home</a>
          </div>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            className="text-white p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-black/95 backdrop-blur-sm`}>
        <div className="px-4 py-4 space-y-3">
          <a href="#" className="block text-white hover:text-white/70 py-2">Home</a>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 