import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import './lib/i18n' // Import i18n configuration

// Initialize debug utilities in development mode
if (process.env.NODE_ENV === 'development') {
  import('./utils') // This will automatically initialize WebSocket debugging
    .then(() => console.log('Debug utilities initialized'))
    .catch(error => console.error('Failed to initialize debug utilities:', error));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
