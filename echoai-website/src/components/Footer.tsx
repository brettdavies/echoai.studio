import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black border-t border-gray-800 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <a href="#" className="text-white font-semibold text-lg">{t('footer.brandName')}</a>
          </div>
          
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {t('footer.brandName')}. {t('footer.allRightsReserved')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 