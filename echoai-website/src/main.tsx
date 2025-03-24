import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import WebSocketTestPage from './pages/WebSocketTestPage'
import './lib/i18n' // Import i18n configuration
import { LogComponent, logger } from './utils/Logger'
import { appLogger } from './utils/LoggerFactory'
import { isDevelopmentMode } from './utils/environment'
// Disable RubberBand logs by default - users can enable via UI if needed
logger.disableComponents(LogComponent.RESAMPLER)

// Initialize debug utilities in development mode
if (isDevelopmentMode()) {
  import('./utils') // This will automatically initialize WebSocket debugging
    .then(() => appLogger.info('Debug utilities initialized'))
    .catch(error => appLogger.error('Failed to initialize debug utilities:', error));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {isDevelopmentMode() && <Route path="/websockettest" element={<WebSocketTestPage />} />}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
