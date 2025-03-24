# Application Logging System

This module provides a configurable logging system that can be used throughout the application for consistent, categorized logging.

## Key Features

- Configurable log levels
- Category-based filtering
- Component-based filtering
- Specialized loggers for different components
- Thread-safe singleton instances
- Consistent formatting across the application
- In-memory log storage with retrieval capabilities
- Persistent configuration through localStorage
- Development UI for controlling logging settings

## Basic Usage

```typescript
import { logger, LogLevel, LogCategory } from '../utils';

// Set global log level
logger.setLogLevel(LogLevel.DEBUG);

// Log messages with different severity levels
logger.error(LogCategory.APP, 'Application startup failed', error);
logger.warn(LogCategory.API, 'API rate limit approaching', { currentUsage });
logger.info(LogCategory.UI, 'User navigated to dashboard');
logger.debug(LogCategory.STATE, 'State updated', { prevState, newState });
logger.trace(LogCategory.PERFORMANCE, 'Function execution time', { time: '5ms' });
```

## Log Levels

The logging system supports the following log levels (in order of verbosity):

- `LogLevel.NONE` - No logging
- `LogLevel.ERROR` - Only errors
- `LogLevel.WARN` - Warnings and errors
- `LogLevel.INFO` - Information, warnings, and errors (default)
- `LogLevel.DEBUG` - Debug messages, information, warnings, and errors
- `LogLevel.TRACE` - All messages, including trace-level debugging

## Log Categories

Log messages are categorized to allow filtering:

### General Categories

- `LogCategory.APP` - General application events
- `LogCategory.API` - API interactions
- `LogCategory.UI` - User interface events
- `LogCategory.STATE` - State management
- `LogCategory.ERROR` - Error events
- `LogCategory.PERFORMANCE` - Performance metrics
- `LogCategory.NAVIGATION` - Navigation/routing events

### Networking Categories

- `LogCategory.NETWORK` - General network events
- `LogCategory.WS` - WebSocket events
- `LogCategory.HTTP` - HTTP requests/responses

### Audio Processing Categories

- `LogCategory.AUDIO` - General audio processing
- `LogCategory.WASM` - WebAssembly module events
- `LogCategory.PROCESSOR` - Audio processor events
- `LogCategory.RESAMPLER` - Audio resampling events
- `LogCategory.WORKLET` - AudioWorklet events

### Storage Categories

- `LogCategory.STORAGE` - Storage events
- `LogCategory.CACHE` - Cache operations

## Component-Level Logging

The logging system allows for fine-grained control over which components generate logs:

```typescript
import { logger, LogComponent } from '../utils';

// Disable logging for specific components
logger.disableComponents(LogComponent.RUBBER_BAND, LogComponent.WEBSOCKET);

// Enable logging for specific components
logger.enableComponents(LogComponent.RUBBER_BAND);

// Check if a component's logging is enabled
const isEnabled = logger.isComponentEnabled(LogComponent.RUBBER_BAND);
```

### Available Components

- `LogComponent.RUBBER_BAND` - RubberBand audio processing
- `LogComponent.AUDIO_WORKLET` - Audio worklet processing
- `LogComponent.AUDIO_PROCESSOR` - General audio processing
- `LogComponent.WEBSOCKET` - WebSocket communications
- `LogComponent.HTTP_CLIENT` - HTTP client operations
- `LogComponent.UI_CONTROLS` - UI control interactions

### Component-Specific Loggers

For frequently used components, specialized loggers are available:

```typescript
import RubberBandLogger from '../components/audio/RubberBandLogger';

// Log messages
RubberBandLogger.info('Processing audio chunk');
RubberBandLogger.debug('Detailed processing info', { chunkSize, options });

// Control logging for this component
RubberBandLogger.disable(); // Turn off all RubberBand logs
RubberBandLogger.enable();  // Turn on RubberBand logs
const isEnabled = RubberBandLogger.isEnabled();
```

## Specialized Loggers

### Audio Logger

For audio processing components, use the specialized audio logger:

```typescript
import { audioLogger, LogLevel } from '../utils';

// Configure with specific settings
audioLogger.configure({
  level: LogLevel.DEBUG,
  enableWasm: true,
  enableResampler: true,
  enableWorklet: false,  // Disable worklet logs
  enableProcessor: true
});

// Log messages specific to audio processing
audioLogger.logProcessor(LogLevel.INFO, 'Audio processor initialized');
audioLogger.logWorklet(LogLevel.DEBUG, 'Processing audio chunk', { size: 4096 });
audioLogger.logWasm(LogLevel.INFO, 'WASM module loaded successfully');
audioLogger.logResampler(LogLevel.DEBUG, 'Resampling audio', { 
  inputSampleRate: 48000, 
  outputSampleRate: 16000 
});
```

## Category Filtering

You can enable or disable specific log categories:

```typescript
import { logger, LogCategory } from '../utils';

// Enable specific categories
logger.enableCategories(LogCategory.PERFORMANCE, LogCategory.WASM);

// Disable specific categories
logger.disableCategories(LogCategory.UI, LogCategory.HTTP);
```

## Logging Configuration

The logging system supports persistent configuration through localStorage:

```typescript
import { logger, LoggingConfig, DEFAULT_LOGGING_CONFIG } from '../utils';

// Apply a custom configuration
const config: LoggingConfig = {
  components: {
    rubber_band: false,  // Disable RubberBand logs
    websocket: true      // Enable WebSocket logs
  }
};
logger.applyLoggingConfig(config);

// Reset to default configuration
logger.resetLoggingConfig();
```

## Development UI Controls

During development, you can use the LoggingControl component to adjust logging settings via a UI:

```tsx
import LoggingControl from '../components/debug/LoggingControl';

// Add to your app's development layout
const DevLayout = () => (
  <>
    <MainApp />
    {process.env.NODE_ENV !== 'production' && <LoggingControl />}
  </>
);
```

The LoggingControl component provides:
- Toggle switches for each component's logging
- Radio buttons to set the global log level 
- Quick actions for common tasks
- Persistent settings through browser refresh

## Retrieving Logs

You can retrieve logs for analysis:

```typescript
import { logger, LogCategory, LogComponent } from '../utils';

// Get all logs
const allLogs = logger.getLogs();

// Get logs for a specific category
const performanceLogs = logger.getLogsByCategory(LogCategory.PERFORMANCE);

// Get logs for a specific component
const rubberBandLogs = logger.getLogsByComponent(LogComponent.RUBBER_BAND);

// Clear all logs
logger.clearLogs();
```

## Creating a Custom Logger

You can extend the base Logger class to create custom loggers:

```typescript
import { Logger, LogLevel, LogCategory, LogComponent } from '../utils';

class MyCustomLogger extends Logger {
  private static instance: MyCustomLogger;
  
  public static getInstance(): MyCustomLogger {
    if (!MyCustomLogger.instance) {
      MyCustomLogger.instance = new MyCustomLogger();
      MyCustomLogger.instance.setServiceId('MyService');
    }
    return MyCustomLogger.instance;
  }
  
  constructor() {
    super();
    // Custom configuration
  }
  
  // Custom logging methods
  public logCustomEvent(level: LogLevel, message: string, data?: any): void {
    // Optionally specify a component for fine-grained control
    this.log(level, LogCategory.APP, message, data, LogComponent.MISC);
  }
}

export const myLogger = MyCustomLogger.getInstance();
```

## Creating a Component Logger

For a new component, you can create a specialized logger:

```typescript
import { 
  LogCategory, 
  LogComponent,
  ComponentLogger 
} from '../utils';

// Define a new component if needed
enum CustomComponent {
  MY_FEATURE = 'my_feature'
}

// Create a component logger
const myFeatureLogger = new ComponentLogger(CustomComponent.MY_FEATURE);

// Use it throughout your feature
myFeatureLogger.info(LogCategory.APP, 'Feature initialized');
myFeatureLogger.debug(LogCategory.PERFORMANCE, 'Processing time', { duration: '5ms' });
```

## Environment-Based Configuration

The logger automatically adjusts its default log level based on the environment:

- Production: `LogLevel.ERROR`
- Test: `LogLevel.WARN`
- Development: `LogLevel.DEBUG`
