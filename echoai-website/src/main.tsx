import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import './lib/i18n' // Import i18n configuration
import { LogComponent, logger } from './utils/Logger'
import { appLogger } from './utils/LoggerFactory'
// Disable RubberBand logs by default - users can enable via UI if needed
logger.disableComponents(LogComponent.RESAMPLER)

// Initialize debug utilities in development mode
if (process.env.NODE_ENV === 'development') {
  import('./utils') // This will automatically initialize WebSocket debugging
    .then(() => appLogger.info('Debug utilities initialized'))
    .catch(error => appLogger.error('Failed to initialize debug utilities:', error));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
