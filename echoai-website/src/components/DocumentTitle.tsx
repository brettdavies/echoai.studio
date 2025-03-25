import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DocumentTitle: React.FC = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Update the document title whenever language changes
    document.title = t('common.siteTitle');
  }, [t, i18n.language]);

  // This component doesn't render anything
  return null;
};

export default DocumentTitle; 