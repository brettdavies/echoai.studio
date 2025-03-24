# Application Logging System

This module provides a configurable logging system that can be used throughout the application for consistent, categorized logging.

## Key Features

- Configurable log levels
- Category-based filtering
- Specialized loggers for different components
- Thread-safe singleton instances
- Consistent formatting across the application
- In-memory log storage with retrieval capabilities

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

## Retrieving Logs

You can retrieve logs for analysis:

```typescript
import { logger, LogCategory } from '../utils';

// Get all logs
const allLogs = logger.getLogs();

// Get logs for a specific category
const performanceLogs = logger.getLogsByCategory(LogCategory.PERFORMANCE);

// Clear all logs
logger.clearLogs();
```

## Creating a Custom Logger

You can extend the base Logger class to create custom loggers:

```typescript
import { Logger, LogLevel, LogCategory } from '../utils';

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
    this.log(level, LogCategory.APP, message, data);
  }
}

export const myLogger = MyCustomLogger.getInstance();
```

## Environment-Based Configuration

The logger automatically adjusts its default log level based on the environment:

- Production: `LogLevel.ERROR`
- Test: `LogLevel.WARN`
- Development: `LogLevel.DEBUG`

## Integration with React Components

For React components, you can configure logging through props:

```tsx
import { LogLevel } from '../utils';

<AudioProcessor
  // ... other props
  loggerConfig={{
    level: LogLevel.DEBUG,
    enableWasm: true,
    enableResampler: true,
    enableWorklet: true,
    enableProcessor: true
  }}
/>
```
