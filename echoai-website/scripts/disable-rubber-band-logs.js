#!/usr/bin/env node

/**
 * Disable RubberBand Logs
 * 
 * A utility script to quickly disable RubberBand logs during development.
 * Run with: node scripts/disable-rubber-band-logs.js
 */

// Since this is a script, we need to handle both ESM and CommonJS
(async () => {
  try {
    // Try to import as ESM
    const { LogComponent, logger } = await import('../src/utils/Logger.js');
    logger.disableComponents(LogComponent.RUBBER_BAND);
    console.log('✅ RubberBand logs disabled successfully');
  } catch (err) {
    try {
      // Fallback to CommonJS
      const { LogComponent, logger } = require('../src/utils/Logger');
      logger.disableComponents(LogComponent.RUBBER_BAND);
      console.log('✅ RubberBand logs disabled successfully');
    } catch (err2) {
      console.error('❌ Failed to disable RubberBand logs:', err2);
      console.log('👉 Alternative: Use the logging UI panel in development mode');
      console.log('👉 Or set in localStorage: echoai_logging_config = {"components":{"rubber_band":false}}');
      process.exit(1);
    }
  }
})(); 