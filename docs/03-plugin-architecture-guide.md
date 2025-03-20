
# 03. Plugin Architecture Guide

## Table of Contents

- [Plugin Architecture Guide](#plugin-architecture-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Plugin System Overview](#1-plugin-system-overview)
    - [1.1 Design Philosophy](#11-design-philosophy)
    - [1.2 Architecture Components](#12-architecture-components)
    - [1.3 Plugin Lifecycle](#13-plugin-lifecycle)
  - [2. Plugin Interface](#2-plugin-interface)
    - [2.1 The Plugin Trait](#21-the-plugin-trait)
    - [2.2 Plugin Context](#22-plugin-context)
    - [2.3 Plugin Entry](#23-plugin-entry)
    - [2.4 Plugin Processing Status](#24-plugin-processing-status)
  - [3. Plugin Development Process](#3-plugin-development-process)
    - [3.1 Using the Template System](#31-using-the-template-system)
    - [3.2 Plugin Manifest](#32-plugin-manifest)
    - [3.3 Directory Structure](#33-directory-structure)
    - [3.4 Building and Activating Plugins](#34-building-and-activating-plugins)
  - [4. Message Processing Patterns](#4-message-processing-patterns)
    - [4.1 Topic-Based Routing](#41-topic-based-routing)
    - [4.2 Transformations and State Transitions](#42-transformations-and-state-transitions)
    - [4.3 Error Handling](#43-error-handling)
    - [4.4 Telemetry Integration](#44-telemetry-integration)
  - [5. Advanced Plugin Concepts](#5-advanced-plugin-concepts)
    - [5.1 Plugin Versioning](#51-plugin-versioning)
    - [5.2 Transition Strategies](#52-transition-strategies)
    - [5.3 Thread Safety](#53-thread-safety)
    - [5.4 Worker Pool Optimization](#54-worker-pool-optimization)
  - [6. Plugin Testing Strategies](#6-plugin-testing-strategies)
    - [6.1 Unit Testing](#61-unit-testing)
    - [6.2 Integration Testing](#62-integration-testing)
    - [6.3 Performance Testing](#63-performance-testing)
    - [6.4 Test Utilities](#64-test-utilities)
  - [7. Best Practices](#7-best-practices)
    - [7.1 Code Organization](#71-code-organization)
    - [7.2 Error Handling Patterns](#72-error-handling-patterns)
    - [7.3 Performance Optimization](#73-performance-optimization)
    - [7.4 Documentation](#74-documentation)

## 1. Plugin System Overview

### 1.1 Design Philosophy

Echo Core's plugin system is designed around the following key principles:

- **Isolation**: Plugins operate independently with their own worker pools and state
- **Dynamic Loading**: Plugins can be loaded, unloaded, and updated without restarting the core
- **Thread Safety**: All plugin interactions are thread-safe by design
- **Message-Based Communication**: Plugins communicate exclusively through the message bus
- **Typed Transformations**: State transitions are represented as type transformations

This architecture enables a modular, maintainable, and extensible system where components can evolve independently.

### 1.2 Architecture Components

The plugin system consists of several key components:

- **Plugin Trait**: The core interface that all plugins must implement
- **Plugin Registry**: Manages plugin discovery, loading, and lifecycle
- **Plugin Context**: Provides plugins with access to core services
- **Worker Pool**: Handles concurrent message processing for each plugin
- **Message Bus**: Facilitates communication between plugins
- **Template System**: Simplifies plugin development with common patterns

These components work together to provide a robust foundation for plugin-based processing.

### 1.3 Plugin Lifecycle

Plugins in Echo Core follow a well-defined lifecycle:

1. **Discovery**: The plugin registry finds plugin libraries in the enabled directory
2. **Loading**: The plugin's dynamic library is loaded and the entry point is called
3. **Initialization**: The plugin's `init()` method is called to set up resources
4. **Processing**: Messages are processed by the plugin's `process_message()` method
5. **Deactivation**: The plugin can be temporarily deactivated without unloading
6. **Reactivation**: A deactivated plugin can be reactivated to resume processing
7. **Version Transition**: A plugin can be updated to a new version with various strategies
8. **Shutdown**: The plugin's `shutdown()` method is called for clean resource release
9. **Unloading**: The plugin's dynamic library is unloaded from memory

The registry provides comprehensive management of this lifecycle with proper error handling and telemetry.

## 2. Plugin Interface

### 2.1 The Plugin Trait

All plugins must implement the `Plugin` trait, which defines the core interface:

```rust
pub trait Plugin: Send + Sync {
    // Get the plugin name
    fn name(&self) -> &str;
    
    // Initialize the plugin
    async fn init(&self) -> Result<(), PluginError>;
    
    // Process a message from a topic
    async fn process_message(&self, topic: &str, message: &BaseMessage) -> Result<ProcessingStatus, PluginError>;
    
    // Shut down the plugin
    async fn shutdown(&self) -> Result<(), PluginError>;
    
    // Health check (with default implementation)
    async fn health_check(&self) -> bool {
        true
    }
    
    // Optional methods with default implementations
    async fn metrics(&self) -> serde_json::Value { ... }
    async fn pause(&self) -> Result<(), PluginError> { ... }
    async fn resume(&self) -> Result<(), PluginError> { ... }
    async fn reset(&self) -> Result<(), PluginError> { ... }
}
```

The `Send + Sync` traits ensure that plugins are thread-safe, allowing concurrent processing across multiple worker threads.

### 2.2 Plugin Context

Each plugin receives a `PluginContext` that provides access to essential services:

```rust
pub struct PluginContext {
    // Access to the message transport for pub/sub operations
    pub transport: Arc<dyn MessageTransport>,
    
    // Configuration access for plugin settings
    pub config: Arc<ConfigManager>,
    
    // Telemetry context for traces, metrics, and spans
    pub telemetry: Arc<TelemetryContext>,
    
    // Plugin metadata
    pub plugin_name: String,
    pub plugin_version: String,
}
```

The context includes helper methods for common operations:

```rust
impl PluginContext {
    // Create a new message
    pub fn message_builder(&self) -> MessageBuilder { ... }
    
    // Get the plugin's standard topic
    pub fn topic(&self) -> String { ... }
    
    // Get a subcategory topic
    pub fn topic_subcategory(&self, subcategory: &str) -> String { ... }
    
    // Create a span for telemetry
    pub fn create_span(&self, name: &str, attributes: HashMap<String, String>) -> impl Span { ... }
    
    // Record metrics
    pub fn record_counter(&self, name: &str, value: u64, attributes: HashMap<String, String>) { ... }
    pub fn record_gauge(&self, name: &str, value: f64, attributes: HashMap<String, String>) { ... }
    pub fn record_histogram(&self, name: &str, value: f64, attributes: HashMap<String, String>) { ... }
}
```

### 2.3 Plugin Entry

The `PluginEntry` struct in the registry represents a loaded plugin:

```rust
pub struct PluginEntry {
    // Plugin instance
    pub instance: Arc<dyn Plugin>,
    
    // Plugin metadata
    pub name: String,
    pub version: String,
    pub description: String,
    
    // Status information
    pub status: PluginStatus,
    pub last_status_change: DateTime<Utc>,
    
    // Performance metrics
    pub metrics: PluginMetrics,
    
    // Resource usage
    pub resources: PluginResources,
    
    // Worker pool
    pub worker_pool: Arc<WorkerPool>,
}
```

This structure maintains comprehensive information about each plugin, including its status, performance metrics, and resource usage.

### 2.4 Plugin Processing Status

When processing messages, plugins return a `ProcessingStatus` to indicate the result:

```rust
pub enum ProcessingStatus {
    // Successfully processed
    Acknowledged,
    
    // Temporary failure, retry after duration
    RetryLater(Duration),
    
    // Permanent failure with reason
    Failed(String),
    
    // Forward to another topic
    Forward(String, BaseMessage),
}
```

This allows plugins to express various outcomes of message processing, including successful handling, temporary failures that should be retried, permanent failures, and forwarding to another topic.

## 3. Plugin Development Process

### 3.1 Using the Template System

The template system simplifies plugin development with reusable patterns:

```rust
// Define a plugin using the BasePlugin template
pub struct MyPlugin {
    // Internal state for the plugin
    state: Arc<RwLock<MyPluginState>>,
    
    // Core fields from BasePlugin
    name: String,
    context: Arc<PluginContext>,
}

// Implement processor for business logic
impl PluginProcessor for MyPlugin {
    async fn process(&self, topic: &str, message: &BaseMessage) -> Result<ProcessingStatus, PluginError> {
        // Business logic here
        match topic {
            "transcript.raw" => self.process_transcript(message).await,
            _ => Ok(ProcessingStatus::Acknowledged),
        }
    }
}

// The Plugin trait is automatically implemented by the template
```

The template system handles common boilerplate like worker pool management, error handling, and telemetry, allowing you to focus on business logic.

### 3.2 Plugin Manifest

Each plugin requires a manifest file that describes its configuration:

```json
{
  "name": "my_plugin",
  "version": "1.0.0",
  "description": "Example plugin for Echo Core",
  "entry_point": "create_plugin",
  "subscriptions": [
    "transcript.raw"
  ],
  "config": {
    "option1": "default_value",
    "option2": 123
  }
}
```

The manifest defines:

- Basic metadata (name, version, description)
- Entry point function name
- Topic subscriptions
- Default configuration values

### 3.3 Directory Structure

Plugins follow a standardized directory structure:

```plaintext
/plugins/
  /workshop/               # Plugin source code
    /my_plugin/
      /src/
        lib.rs            # Plugin implementation
        processor.rs      # Business logic
      Cargo.toml          # Plugin dependencies
      manifest.json       # Plugin manifest
  
  /libraries/             # Built plugin libraries
    /development/         # Development builds
      libmy_plugin.so     # Linux plugin library
      my_plugin.dll       # Windows plugin library
      libmy_plugin.dylib  # macOS plugin library
    /production/          # Production builds
  
  /enabled/               # Active plugin symlinks
    my_plugin -> ../libraries/development/libmy_plugin.so
```

### 3.4 Building and Activating Plugins

The system includes utility scripts for plugin management:

1. **Building**:

   ```bash
   ./scripts/build_plugin.sh my_plugin
   ```

   Compiles the plugin and places the library in the appropriate directory.

2. **Activating**:

   ```bash
   ./scripts/activate_plugin.sh my_plugin development
   ```

   Creates a symlink to enable the plugin.

3. **Deactivating**:

   ```bash
   ./scripts/deactivate_plugin.sh my_plugin
   ```

   Removes the symlink to disable the plugin.

## 4. Message Processing Patterns

### 4.1 Topic-Based Routing

Plugins process messages based on topics using pattern matching:

```rust
async fn process_message(&self, topic: &str, message: &BaseMessage) -> Result<ProcessingStatus, PluginError> {
    match topic {
        "transcript.raw" => self.process_transcript(message).await,
        s if s.starts_with("system.") => self.process_system_message(message).await,
        _ => Ok(ProcessingStatus::Acknowledged),
    }
}
```

This allows for flexible message handling based on topic hierarchies.

### 4.2 Transformations and State Transitions

Echo Core encourages representing state transitions as type transformations:

```rust
// Draft transcription state
pub struct DraftTranscription {
    content: String,
    // ...
}

impl DraftTranscription {
    // Transform to a reviewed state
    pub fn review(self) -> ReviewedTranscription {
        ReviewedTranscription {
            content: self.content,
            // ...
        }
    }
}

// Reviewed transcription state
pub struct ReviewedTranscription {
    content: String,
    // ...
}

impl ReviewedTranscription {
    // Transform to a published state
    pub fn publish(self) -> PublishedTranscription {
        PublishedTranscription {
            content: self.content,
            // ...
        }
    }
}
```

This pattern leverages Rust's type system to ensure correct state transitions.

### 4.3 Error Handling

Plugins should implement robust error handling:

```rust
async fn process_transcript(&self, message: &BaseMessage) -> Result<ProcessingStatus, PluginError> {
    // Extract data from message
    let data = message.data.as_object()
        .ok_or_else(|| PluginError::InvalidData("Expected object data".to_string()))?;
    
    // Process with proper error handling
    let text = data.get("text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| PluginError::InvalidData("Missing text field".to_string()))?;
    
    // Handle transient errors
    match self.api_client.process(text).await {
        Ok(result) => {
            // Success handling
            Ok(ProcessingStatus::Acknowledged)
        }
        Err(ApiError::RateLimited) => {
            // Temporary failure, retry after backoff
            Ok(ProcessingStatus::RetryLater(Duration::from_secs(5)))
        }
        Err(err) => {
            // Permanent failure
            Err(PluginError::ProcessingError(format!("API error: {}", err)))
        }
    }
}
```

### 4.4 Telemetry Integration

Plugins should integrate with the telemetry system:

```rust
async fn process_transcript(&self, message: &BaseMessage) -> Result<ProcessingStatus, PluginError> {
    // Create a span for this operation
    let span = self.context.create_span("process_transcript", HashMap::from([
        ("message_id".to_string(), message.id.to_string()),
    ]));
    let _guard = span.enter();
    
    // Record processing metrics
    self.context.record_counter("transcripts_processed", 1, HashMap::new());
    
    // Process with timing
    let start = std::time::Instant::now();
    let result = self.do_process_transcript(message).await;
    let duration = start.elapsed();
    
    // Record processing time
    self.context.record_histogram("transcript_processing_time", duration.as_secs_f64(), HashMap::new());
    
    result
}
```

## 5. Advanced Plugin Concepts

### 5.1 Plugin Versioning

The system supports versioned plugins through the registry:

```rust
// Load a new version of a plugin
registry.load_new_version("my_plugin", "/path/to/new/library").await?;

// Transition to the new version with a specific strategy
registry.transition_plugin("my_plugin", "/path/to/new/library", TransitionStrategy::Graceful).await?;
```

Version transitions are managed with proper state handling and resource cleanup.

### 5.2 Transition Strategies

Several strategies are available for plugin transitions:

- **Immediate**: Shutdown the old plugin and start the new one immediately
- **Graceful**: Allow the old plugin to finish processing current messages before transition
- **Gradual**: Route a percentage of messages to the new version, gradually increasing
- **Blue-Green**: Run both versions side by side until verification completes

These strategies allow for flexible plugin updates based on requirements.

### 5.3 Thread Safety

All plugins must be thread-safe by implementing `Send + Sync`:

```rust
pub struct MyPlugin {
    // Thread-safe state using Arc and RwLock
    state: Arc<RwLock<MyPluginState>>,
    
    // Immutable shared resources
    context: Arc<PluginContext>,
    client: Arc<ApiClient>,
}
```

This ensures that plugins can process messages concurrently from multiple worker threads.

### 5.4 Worker Pool Optimization

The worker pool can be optimized for specific plugin needs:

```rust
// Configure worker pool parameters
let worker_pool = WorkerPool::new(WorkerPoolConfig {
    min_workers: 2,
    max_workers: 8,
    queue_size: 100,
    adaptive_scaling: true,
    scaling_threshold: 0.7,
    shutdown_timeout: Duration::from_secs(5),
});
```

Parameters like thread count, queue size, and scaling thresholds can be adjusted based on workload characteristics.

## 6. Plugin Testing Strategies

### 6.1 Unit Testing

Unit tests focus on isolated plugin components:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_process_transcript() {
        // Create a mock context
        let context = create_mock_context();
        
        // Create a plugin instance
        let plugin = MyPlugin::new("test_plugin", context);
        
        // Create a test message
        let message = create_test_message("transcript.raw", json!({
            "text": "Hello world"
        }));
        
        // Test processing
        let result = plugin.process_message("transcript.raw", &message).await.unwrap();
        
        // Verify result
        assert!(matches!(result, ProcessingStatus::Acknowledged));
    }
}
```

### 6.2 Integration Testing

Integration tests verify plugin interaction with the system:

```rust
#[tokio::test]
async fn test_plugin_integration() {
    // Create a real transport
    let transport = LocalTransport::new(LocalTransportConfig::default());
    
    // Create a real context
    let context = PluginContext::new(
        "test_plugin",
        "1.0.0",
        Arc::new(transport),
        Arc::new(ConfigManager::new()),
        Arc::new(TelemetryContext::new()),
    );
    
    // Create and initialize plugin
    let plugin = MyPlugin::new("test_plugin", Arc::new(context));
    plugin.init().await.unwrap();
    
    // Subscribe to output topic
    let mut output_stream = transport.subscribe("plugin.test_plugin.result").await.unwrap();
    
    // Publish test message
    transport.publish("transcript.raw", &create_test_message("transcript.raw", json!({
        "text": "Hello world"
    }))).await.unwrap();
    
    // Verify plugin produces expected output
    let (topic, message) = output_stream.next().await.unwrap().unwrap();
    assert_eq!(topic, "plugin.test_plugin.result");
    assert_eq!(message.data.get("processed_text").unwrap().as_str().unwrap(), "HELLO WORLD");
    
    // Shutdown plugin
    plugin.shutdown().await.unwrap();
}
```

### 6.3 Performance Testing

Performance tests evaluate plugin efficiency:

```rust
#[tokio::test]
async fn test_plugin_performance() {
    // Create plugin instance
    let plugin = setup_test_plugin().await;
    
    // Create test message
    let message = create_test_message("transcript.raw", json!({
        "text": "Hello world"
    }));
    
    // Measure processing time
    let start = std::time::Instant::now();
    
    for _ in 0..1000 {
        plugin.process_message("transcript.raw", &message).await.unwrap();
    }
    
    let duration = start.elapsed();
    let messages_per_second = 1000.0 / duration.as_secs_f64();
    
    // Verify performance meets requirements
    assert!(messages_per_second > 500.0, "Performance too low: {:.2} msg/s", messages_per_second);
}
```

### 6.4 Test Utilities

The framework provides testing utilities to simplify plugin testing:

```rust
// Create a mock context for testing
pub fn create_mock_context() -> Arc<PluginContext> {
    // Create mock transport
    let transport = Arc::new(MockTransport::new());
    
    // Create mock config
    let config = Arc::new(ConfigManager::new());
    config.set_value("test.setting", json!("test_value"));
    
    // Create mock telemetry
    let telemetry = Arc::new(TelemetryContext::new());
    
    // Create context
    Arc::new(PluginContext::new(
        "test_plugin",
        "1.0.0",
        transport,
        config,
        telemetry,
    ))
}

// Create a test message
pub fn create_test_message(topic: &str, data: serde_json::Value) -> BaseMessage {
    BaseMessage {
        id: Uuid::new_v4(),
        timestamp: Utc::now(),
        source: "test".to_string(),
        version: "1.0".to_string(),
        data,
        schema: None,
        trace_context: None,
    }
}
```

## 7. Best Practices

### 7.1 Code Organization

Organize plugin code for clarity and maintainability:

```plaintext
my_plugin/
  src/
    lib.rs          # Plugin entry point and trait implementation
    processor.rs    # Business logic for message processing
    models.rs       # Data models and type transformations
    client.rs       # External API clients and services
    utils.rs        # Helper functions and utilities
    config.rs       # Configuration structures and validation
    error.rs        # Error types and handling
    tests/          # Test modules
      mod.rs
      processor_tests.rs
      integration_tests.rs
  Cargo.toml
  manifest.json
```

### 7.2 Error Handling Patterns

Implement comprehensive error handling:

1. **Custom Error Types**:

   ```rust
   #[derive(Debug, thiserror::Error)]
   pub enum MyPluginError {
       #[error("Configuration error: {0}")]
       ConfigError(String),
       
       #[error("API error: {0}")]
       ApiError(#[from] ApiClientError),
       
       #[error("Processing error: {0}")]
       ProcessingError(String),
   }
   
   impl From<MyPluginError> for PluginError {
       fn from(err: MyPluginError) -> Self {
           PluginError::ProcessingError(format!("{}", err))
       }
   }
   ```

2. **Fallible Operations**:

   ```rust
   fn process_data(&self, data: &Value) -> Result<String, MyPluginError> {
       let text = data.get("text")
           .and_then(|v| v.as_str())
           .ok_or_else(|| MyPluginError::ProcessingError("Missing text field".to_string()))?;
       
       // Process text
       Ok(text.to_uppercase())
   }
   ```

3. **Retryable vs. Fatal Errors**:

   ```rust
   match api_client.call().await {
       Ok(result) => Ok(ProcessingStatus::Acknowledged),
       Err(ApiClientError::RateLimited) => {
           // Retryable error
           Ok(ProcessingStatus::RetryLater(Duration::from_secs(5)))
       },
       Err(err) => {
           // Fatal error
           Err(MyPluginError::ApiError(err).into())
       }
   }
   ```

### 7.3 Performance Optimization

Optimize plugins for performance:

1. **Minimize Allocations**:

   ```rust
   // Reuse buffers where possible
   let mut buffer = self.get_buffer_from_pool();
   process_into_buffer(&mut buffer, data);
   // Return buffer to pool when done
   self.return_buffer_to_pool(buffer);
   ```

2. **Concurrency Control**:

   ```rust
   // Fine-grained locking
   {
       let state = self.state.read().await;
       // Read-only operations
   }
   // Lock dropped here
   
   // Minimize write lock duration
   {
       let mut state = self.state.write().await;
       // Quick mutation only
   }
   ```

3. **Batch Processing**:

   ```rust
   // Process multiple items in one operation
   async fn process_batch(&self, items: Vec<Item>) -> Result<Vec<Result<Item, Error>>, Error> {
       // Single API call for batch
       self.api_client.process_batch(&items).await
   }
   ```

### 7.4 Documentation

Document plugins thoroughly:

1. **Public API Documentation**:

   ```rust
   /// TranscriptProcessor plugin
   ///
   /// Processes raw transcripts and formats them for downstream use.
   ///
   /// # Features
   ///
   /// - Language detection
   /// - Formatting standardization
   /// - Confidence scoring
   ///
   /// # Configuration
   ///
   /// - `min_confidence`: Minimum confidence threshold (default: 0.7)
   /// - `language`: Target language code (default: "en-US")
   pub struct TranscriptProcessor {
       // ...
   }
   ```

2. **Usage Examples**:

   ```rust
   /// # Examples
   ///
   /// ```
   /// let processor = TranscriptProcessor::new(config);
   /// let result = processor.process_transcript("Hello world", 0.95);
   /// assert_eq!(result.text, "Hello world");
   /// assert_eq!(result.language, "en-US");
   /// ```
   ```

3. **Implementation Notes**:

   ```rust
   // IMPLEMENTATION NOTE:
   // This algorithm uses a two-pass approach:
   // 1. First pass collects statistics
   // 2. Second pass applies transformations
   // This is more efficient than a single pass because...
   ```

4. **Maintainability**:

   ```rust
   // TODO: Replace with more efficient algorithm when available
   // FIXME: Currently doesn't handle certain edge cases
   // NOTE: Performance optimized for short transcripts
   ```
