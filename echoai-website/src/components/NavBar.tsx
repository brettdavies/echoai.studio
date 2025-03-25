import { Button } from "../components/ui/button";
import { useState } from "react";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { isDevelopmentMode } from '../utils/environment';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-sm py-4 border-b border-gray-800">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <a href="#" className="text-white font-semibold text-lg">{t('footer.brandName')}</a>
          
          <div className="hidden md:flex ml-10 space-x-8">
            <a href="#" className="text-white/70 hover:text-white text-sm">{t('navigation.home')}</a>
            {isDevelopmentMode() && (
              <Link 
                to="/websockettest" 
                className="text-white/70 hover:text-white text-sm"
              >
                WebSocket Test
              </Link>
            )}
          </div>
        </div>
        
        {/* Language selector and mobile menu button */}
        <div className="flex items-center space-x-4">
          {/* Get Started button - to the left of language selector */}
          {/* <div className="hidden md:block">
            <Button size="sm" className="rounded-full">
              {t('common.getStarted')}
            </Button>
          </div> */}
          
          {/* Language selector - hidden on smaller screens */}
          <div className="hidden md:block">
            <LanguageSelector />
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
      </div>
      
      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-black/95 backdrop-blur-sm`}>
        <div className="px-4 py-4 space-y-3">
          <a href="#" className="block text-white hover:text-white/70 py-2">{t('navigation.home')}</a>
          
          {/* WebSocket test link for mobile */}
          {isDevelopmentMode() && (
            <Link 
              to="/websockettest" 
              className="block text-white hover:text-white/70 py-2"
            >
              WebSocket Test
            </Link>
          )}
          
          {/* Get Started button for mobile */}
          {/* <div className="py-2">
            <Button size="sm" className="rounded-full w-full">
              {t('common.getStarted')}
            </Button>
          </div> */}
          
          {/* Language selector for mobile */}
          <div className="py-2">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 