# Logging System Testing Guide

This guide provides steps to verify the functionality of the application's enhanced logging system, particularly the ability to control component-level logging.

## Testing the Resampler Logging Control

The Resampler component is configured to have its logging disabled by default in `main.tsx`. You can test that this is working as expected with the following steps:

### Method 1: Via Browser Console

1. Open the application in development mode
2. Open your browser's developer console
3. Run the following command to check if Resampler logging is disabled:

   ```javascript
   import('./utils/Logger.js').then(({ logger, LogComponent }) => {
     const { appLogger } = await import('./utils/LoggerFactory.js');
     appLogger.info(`Resampler logging enabled: ${logger.isComponentEnabled(LogComponent.RESAMPLER)}`);
   });
   ```

4. You should see: `Resampler logging enabled: false`

### Method 2: Via UI Controls

1. Open the application in development mode
2. Look for the "📋 Logging" button in the bottom-right corner
3. Click it to open the logging control panel
4. Verify that the "Resampler" toggle under "Audio Components" is turned off
5. Toggle it on and perform actions that would trigger Resampler logs
6. Toggle it off and verify that the logs stop appearing

### Method 3: Via LocalStorage

1. Open the application in development mode
2. Open your browser's developer console
3. Run the following commands to check the current logging config:

   ```javascript
   JSON.parse(localStorage.getItem('echoai_logging_config'));
   ```

4. Try changing the configuration manually:

   ```javascript
   const config = JSON.parse(localStorage.getItem('echoai_logging_config')) || { components: {} };
   config.components.resampler = true; // Enable
   localStorage.setItem('echoai_logging_config', JSON.stringify(config));
   // Reload the page to apply changes
   ```

5. Verify that Resampler logs now appear after reloading

## Testing Other Logging Features

### Testing Domain Loggers

You can test the domain loggers by adding temporary code like:

```javascript
import { LogCategory, LogComponent } from './utils/Logger';
import { createDomainLogger } from './utils/LoggerFactory';

// Create a logger for a specific domain
const testLogger = createDomainLogger(LogCategory.UI, LogComponent.UI_CONTROLS);

// Log messages
testLogger.info('Test message');
testLogger.debug('Performance test', { time: '5ms' });
```

### Testing Log Levels

You can verify that changing log levels works by:

1. Open the logging control panel
2. Switch to the "Log Levels" tab
3. Change the selected log level (e.g., from DEBUG to INFO)
4. Verify that DEBUG-level logs no longer appear but INFO, WARN, and ERROR still do

## Troubleshooting

If you're encountering issues with the logging system:

1. Check that `localStorage` is accessible (not in private browsing)
2. Clear the logging configuration with:

   ```javascript
   localStorage.removeItem('echoai_logging_config');
   ```

3. Reset all logging settings by clicking "Reset All" in the logging UI
4. Check your browser console for any errors related to the logging system

## Expected Behavior

- Resampler logs should be disabled by default
- The logging UI should reflect the current state of all logging components
- Changes made via the UI should persist between page reloads
- The logging system should respect both component and category filters
- Higher severity logs (ERROR, WARN) should always appear, regardless of component filters
