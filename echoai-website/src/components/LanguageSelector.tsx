import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Language options sorted alphabetically with flag emojis
const languageOptions = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) setIsOpen(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);
  
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent immediate close due to document click
    setIsOpen(!isOpen);
  };

  const changeLanguage = (code: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent document click handler from firing
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const getCurrentLanguage = () => {
    const currentLang = languageOptions.find(lang => lang.code === i18n.language);
    return currentLang || languageOptions.find(lang => lang.code === 'en') || languageOptions[0];
  };

  return (
    <div className="relative z-50">
      <button
        onClick={toggleDropdown}
        className="flex items-center px-3 py-2 text-white bg-gray-800/50 rounded-md hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-base mr-1.5">{getCurrentLanguage().flag}</span>
        <span className="text-sm font-medium">{getCurrentLanguage().code.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-xl">
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={(e) => changeLanguage(lang.code, e)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center ${
                i18n.language === lang.code ? 'bg-gray-700' : ''
              }`}
            >
              <span className="text-lg mr-3">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector; 