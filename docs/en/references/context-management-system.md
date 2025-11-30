# Context Management System Architecture

## Overview

The Context Management System in Cherry Studio is a sophisticated framework for managing conversation history within the constraints of Large Language Model (LLM) context windows. This document explains the theory, implementation, available strategies, and provides guidance for porting this system to Rust for use in a Tauri application.

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Configuration Hierarchy](#configuration-hierarchy)
4. [Available Strategies](#available-strategies)
5. [Implementation Architecture](#implementation-architecture)
6. [Memory System Integration](#memory-system-integration)
7. [Porting to Rust/Tauri](#porting-to-rusttauri)
8. [References](#references)

---

## Problem Statement

### The Context Window Challenge

LLMs operate within fixed **context windows**—the maximum number of tokens they can process in a single request. When conversations grow long, applications face a critical challenge:

- **GPT-4.1**: ~128K tokens (~450K characters)
- **GPT-5**: ~200K tokens (~700K characters)
- **Claude 3**: ~200K tokens

Beyond these limits, models either:
1. Refuse the request ("Prompt is too long")
2. Silently truncate input, losing critical information
3. Exhibit degraded performance

### The "Lost in the Middle" Phenomenon

Research by Liu et al. (2023) revealed that LLMs exhibit a **U-shaped attention curve**:

```
Performance
    │
  High┤  ██                              ██
      │  ██                              ██
      │  ██                              ██
  Low ┤       ██  ██  ██  ██  ██  ██
      └────────────────────────────────────→
         Start    Middle              End
                Context Position
```

**Key Finding**: Information at the **beginning** and **end** of context receives more attention; information in the **middle** is often "lost."

This phenomenon has significant implications:
- Simply fitting within token limits isn't enough
- **Where** information appears matters as much as **whether** it appears
- Context management strategies must account for attention patterns

> **Reference**: [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) - Liu et al., 2023

---

## Theoretical Foundation

### Cognitive Inspiration: Human Memory Systems

The most advanced context management strategies draw from cognitive science research on human memory:

| Memory Type | Characteristics | AI Analogue |
|-------------|-----------------|-------------|
| **Sensory Memory** | Brief, high-fidelity | Raw input tokens |
| **Short-term (Working) Memory** | Limited capacity (~7 items), actively processed | Recent conversation turns |
| **Long-term Memory** | Unlimited capacity, compressed/encoded | Extracted facts, summaries |

### Information Compression Principles

Effective context management relies on:

1. **Recency Bias**: Recent information is typically more relevant
2. **Salience Extraction**: Important facts transcend recency
3. **Lossy Compression**: Accepting information loss in exchange for capacity
4. **Semantic Preservation**: Maintaining meaning even when removing tokens

### Token Economics

Context management is fundamentally an **optimization problem**:

```
Maximize: Information utility for task completion
Subject to: Token budget constraints
           + Response quality requirements
           + Latency requirements
```

---

## Configuration Hierarchy

Cherry Studio implements a **cascading configuration system** with four levels of specificity:

```
┌─────────────────────────────────────────────────────────────────┐
│                      GLOBAL SETTINGS                             │
│  Default for all conversations across all assistants             │
│  Configured in: Settings → Context Management                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ASSISTANT (AGENT) LEVEL                      │
│  Per-assistant overrides (e.g., coding assistant vs. chat)       │
│  Configured in: Assistant Settings → Context Strategy            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TOPIC (CONVERSATION) LEVEL                    │
│  Per-conversation overrides for specific use cases               │
│  Configured in: Topic Settings → Context Strategy                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER LEVEL (Memory)                         │
│  Cross-conversation persistent memory per user                   │
│  Stored in: Memory service with user-specific scoping            │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration Resolution Algorithm

```typescript
function getEffectiveStrategyConfig(topic?: Topic, assistant?: Assistant): ContextStrategyConfig {
  // Start with defaults
  let config = { ...DEFAULT_CONTEXT_STRATEGY_CONFIG }
  
  // Layer 1: Global settings (lowest priority)
  if (globalSettings.contextStrategy) {
    config = mergeConfigs(config, globalSettings.contextStrategy)
  }
  
  // Layer 2: Assistant settings
  if (assistant?.settings?.contextStrategy) {
    config = mergeConfigs(config, assistant.settings.contextStrategy)
  }
  
  // Layer 3: Topic settings (highest priority)
  if (topic?.contextStrategy) {
    config = mergeConfigs(config, topic.contextStrategy)
  }
  
  return config
}
```

### Use Cases for Each Level

| Level | Use Case Example |
|-------|------------------|
| **Global** | "Use sliding window with max 50 messages for all conversations" |
| **Agent** | "The coding assistant should use truncate_middle to preserve initial specs" |
| **Conversation** | "This specific debug session needs hierarchical memory" |
| **User** | "Remember that John prefers detailed explanations" |

---

## Available Strategies

### 1. None (Disabled)

**Type**: `'none'`

No context management applied. Messages are sent as-is.

**Pros**:
- Zero overhead
- Full fidelity of conversation history

**Cons**:
- May exceed model limits
- Unpredictable behavior on long conversations

**Use When**: Short conversations or testing

---

### 2. Sliding Window

**Type**: `'sliding_window'`

Keeps only the N most recent messages that fit within the token budget.

```
Original: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
                                    └─────────────┘
                                     Kept (within budget)

Result:   [M7, M8, M9, M10]
```

**Configuration Options**:
```typescript
{
  type: 'sliding_window',
  maxMessages?: number  // Hard limit on message count (optional)
}
```

**Pros**:
- Simple and predictable
- No additional LLM calls
- Preserves most recent context perfectly

**Cons**:
- **Total loss** of older information
- May lose important initial instructions

**Algorithm Complexity**: O(n) where n = message count

**Best For**: Casual chat, support conversations, Q&A

> **Research Support**: This approach aligns with findings that LLMs perform best on recent context. See [Context Windows: Expanding Input Size in LLMs](https://www.linkedin.com/pulse/context-windows-expanding-input-size-llms-nikitha-r-yvfef)

---

### 3. Progressive Summarization

**Type**: `'summarize'`

Compresses older messages by generating summaries, preserving key information while reducing tokens.

```
Original: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
          └──────────────────┘  └───────────────┘
           Summarized           Kept verbatim

Result:   [Summary of M1-M6] + [M7, M8, M9, M10]
```

**Configuration Options**:
```typescript
{
  type: 'summarize',
  summarizationModelId?: string,  // Model for generating summaries
  summaryMaxTokens?: number,      // Budget for summary (default: 500)
  summarizeThreshold?: number     // Min messages before summarizing (default: 6)
}
```

**Pros**:
- Preserves important information from older messages
- Maintains conversation continuity
- Enables much longer effective conversations

**Cons**:
- Requires additional LLM calls (cost + latency)
- Some nuance may be lost
- Summary quality varies by model

**Best For**: Long-running projects, ongoing support tickets, collaborative work

> **Research Support**: Summarization is a core technique in RAG systems and long-context agents. See [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)

---

### 4. Hierarchical Memory

**Type**: `'hierarchical'`

Implements a three-tier memory system inspired by human cognition:

```
┌─────────────────────────────────────────────────────────────────┐
│ LONG-TERM MEMORY (Facts)                                        │
│ • User's name is John                                           │
│ • Prefers TypeScript over JavaScript                            │
│ • Working on e-commerce project                                 │
├─────────────────────────────────────────────────────────────────┤
│ MID-TERM MEMORY (Summaries)                                     │
│ [Previous Session Summary]                                      │
│ - Discussed authentication implementation                       │
│ - Decided to use JWT tokens                                     │
│ - User requested dark mode support                              │
├─────────────────────────────────────────────────────────────────┤
│ SHORT-TERM MEMORY (Verbatim)                                    │
│ User: Can you add input validation?                             │
│ Assistant: I'll add Zod validation...                           │
│ User: Also add error messages                                   │
│ Assistant: Here's the updated code...                           │
└─────────────────────────────────────────────────────────────────┘
```

**Configuration Options**:
```typescript
{
  type: 'hierarchical',
  shortTermTurns?: number,       // Recent turns verbatim (default: 5)
  midTermSummaryTokens?: number, // Budget for summaries (default: 2000)
  longTermFactsTokens?: number   // Budget for facts (default: 500)
}
```

**Pros**:
- Best information preservation across long conversations
- Mimics natural human memory patterns
- Balances recency with important historical context
- Extracted facts persist across sessions

**Cons**:
- Most complex to implement
- Requires careful tuning of tier sizes
- May require LLM calls for summarization/extraction

**Best For**: Long-term projects, personalized assistants, ongoing collaborations

> **Research Support**: This approach draws from cognitive architectures and has been validated in production systems like Cursor and mem0. See [A Survey on the Memory Mechanism of Large Language Model Based Agents](https://dl.acm.org/doi/10.1145/3748302)

---

### 5. Truncate Middle

**Type**: `'truncate_middle'`

Preserves the beginning and end of conversations while removing middle content.

```
Original: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10]
          └─────┘                    └───────────┘
          Keep first                   Keep last

Result:   [M1, M2] + [Omission Marker] + [M9, M10]
```

**Configuration Options**:
```typescript
{
  type: 'truncate_middle',
  keepFirstMessages?: number,    // Initial messages to preserve (default: 2)
  keepLastMessages?: number,     // Recent messages to preserve (default: 4)
  showOmissionMarker?: boolean   // Add "[messages omitted]" marker (default: true)
}
```

**Pros**:
- Preserves initial instructions and setup context
- Maintains most recent conversation state
- No additional LLM calls required
- Exploits the "lost in the middle" phenomenon

**Cons**:
- Loses potentially important middle context
- May cause confusion if removed messages were critical
- Not suitable for all conversation types

**Best For**: Task-oriented conversations, coding assistance with initial requirements, support with setup context

> **Research Support**: Directly inspired by the "Lost in the Middle" research showing LLMs naturally underweight middle positions. See [What Works for 'Lost-in-the-Middle' in LLMs?](https://arxiv.org/abs/2511.13900)

---

## Implementation Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    ConversationService                          │
│  - Orchestrates message preparation                             │
│  - Calls context strategy pipeline                              │
│  - Converts to model-specific format                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Context Strategy Module                         │
│  ├── configResolver.ts    - Resolves effective configuration    │
│  ├── index.ts             - Main entry point, strategy factory  │
│  └── strategies/                                                │
│      ├── SlidingWindowStrategy.ts                               │
│      ├── SummarizationStrategy.ts                               │
│      ├── HierarchicalMemoryStrategy.ts                          │
│      └── TruncateMiddleStrategy.ts                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Token Service                                │
│  - Estimates token counts for messages                          │
│  - Calculates available budget                                  │
│  - Manages context limits per model                             │
└─────────────────────────────────────────────────────────────────┘
```

### Strategy Interface

All strategies implement a common interface:

```typescript
interface ContextStrategy {
  readonly name: ContextStrategyType
  readonly description: string
  
  apply(
    messages: Message[],
    config: ContextStrategyConfig,
    context: ContextStrategyContext
  ): Promise<ContextStrategyResult>
}

interface ContextStrategyResult {
  messages: Message[]         // Processed messages
  summary?: string            // Generated summary (if applicable)
  messagesRemoved: number     // Count of removed messages
  tokensSaved: number         // Estimated tokens saved
  wasApplied: boolean         // Whether strategy modified messages
  extractedFacts?: string[]   // Long-term facts (hierarchical only)
}
```

### Processing Pipeline

```typescript
async function applyContextStrategy(
  messages: Message[],
  model: Model,
  options: ContextStrategyOptions
): Promise<ContextStrategyResult> {
  // 1. Resolve effective configuration
  const config = getEffectiveStrategyConfig(topic, assistant)
  
  // 2. Check if strategy is enabled
  if (config.type === 'none') {
    return noOpResult(messages)
  }
  
  // 3. Get strategy instance
  const strategy = getStrategy(config.type)
  
  // 4. Calculate token budget
  const tokenBudget = getAvailableInputBudget(model, maxOutputTokens)
  const currentTokens = estimateConversationTokens(messages, systemPrompt)
  
  // 5. Build execution context
  const context: ContextStrategyContext = {
    model,
    tokenBudget,
    currentTokens,
    systemPrompt,
    topicId: topic?.id,
    existingSummary: topic?.contextMetadata?.conversationSummary,
    existingFacts: topic?.contextMetadata?.longTermFacts
  }
  
  // 6. Apply strategy
  return strategy.apply(messages, config, context)
}
```

---

## Memory System Integration

### Long-Term Memory Service

Beyond per-conversation context management, Cherry Studio includes a **persistent memory system** that operates across conversations:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Memory Processor                            │
│  1. Extract facts from conversation                             │
│  2. Compare with existing memories                              │
│  3. ADD / UPDATE / DELETE operations                            │
│  4. Store with user/agent scoping                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Memory Service (IPC)                        │
│  - Vector-based semantic search                                 │
│  - User-scoped storage                                          │
│  - Agent-scoped filtering                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Main Process Storage                        │
│  - SQLite database                                              │
│  - Vector embeddings for similarity search                      │
│  - Cross-conversation persistence                               │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Scoping

Memories are scoped at multiple levels:

```typescript
interface MemoryItem {
  id: string
  memory: string
  userId: string      // User-level scoping
  agentId?: string    // Optional agent-level scoping
  createdAt: string
  updatedAt: string
}
```

This enables:
- **User memories**: "John prefers TypeScript" (applies to all agents for John)
- **Agent memories**: "When helping with Project X, use strict mode" (specific agent only)
- **Global memories**: Shared across all users (for organizational knowledge)

---

## Porting to Rust/Tauri

### Architectural Considerations

When porting this context management system to a Tauri application, consider these key differences:

#### 1. State Management

**Current (Electron/TypeScript)**:
```typescript
// Redux store in renderer process
const config = useSelector(state => state.settings.contextStrategy)
```

**Tauri (Rust)**:
```rust
// Managed state in Rust backend
use tauri::State;

struct ContextConfig {
    strategy_type: ContextStrategyType,
    max_messages: Option<u32>,
    // ... other fields
}

#[tauri::command]
fn apply_context_strategy(
    messages: Vec<Message>,
    state: State<'_, ContextConfig>,
) -> Result<StrategyResult, String> {
    let config = state.inner();
    // Apply strategy
}
```

> **Reference**: [Tauri State Management](https://v2.tauri.app/develop/calling-rust/)

#### 2. Concurrency Model

**TypeScript**: Single-threaded with async/await
**Rust**: True concurrency with `tokio` or `async-std`

```rust
use tokio::sync::RwLock;

struct ContextManager {
    config: RwLock<ContextConfig>,
    memory_cache: RwLock<HashMap<String, TopicContextMetadata>>,
}

impl ContextManager {
    async fn apply_strategy(&self, messages: Vec<Message>) -> Result<StrategyResult> {
        let config = self.config.read().await;
        // Thread-safe access to configuration
    }
}
```

#### 3. Type System Mapping

```rust
// TypeScript enum → Rust enum
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ContextStrategyType {
    None,
    SlidingWindow,
    Summarize,
    Hierarchical,
    TruncateMiddle,
}

// TypeScript interface → Rust struct
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ContextStrategyConfig {
    #[serde(rename = "type")]
    strategy_type: ContextStrategyType,
    
    // Sliding window options
    max_messages: Option<u32>,
    
    // Summarization options
    summarization_model_id: Option<String>,
    summary_max_tokens: Option<u32>,
    summarize_threshold: Option<u32>,
    
    // Hierarchical options
    short_term_turns: Option<u32>,
    mid_term_summary_tokens: Option<u32>,
    long_term_facts_tokens: Option<u32>,
    
    // Truncate middle options
    keep_first_messages: Option<u32>,
    keep_last_messages: Option<u32>,
    show_omission_marker: Option<bool>,
}

impl Default for ContextStrategyConfig {
    fn default() -> Self {
        Self {
            strategy_type: ContextStrategyType::SlidingWindow,
            max_messages: None,
            summarization_model_id: None,
            summary_max_tokens: Some(500),
            summarize_threshold: Some(6),
            short_term_turns: Some(5),
            mid_term_summary_tokens: Some(2000),
            long_term_facts_tokens: Some(500),
            keep_first_messages: Some(2),
            keep_last_messages: Some(4),
            show_omission_marker: Some(true),
        }
    }
}
```

#### 4. Strategy Trait Pattern

```rust
use async_trait::async_trait;

#[async_trait]
trait ContextStrategy: Send + Sync {
    fn name(&self) -> ContextStrategyType;
    fn description(&self) -> &str;
    
    async fn apply(
        &self,
        messages: Vec<Message>,
        config: &ContextStrategyConfig,
        context: &StrategyContext,
    ) -> Result<StrategyResult, StrategyError>;
}

// Sliding Window Implementation
struct SlidingWindowStrategy;

#[async_trait]
impl ContextStrategy for SlidingWindowStrategy {
    fn name(&self) -> ContextStrategyType {
        ContextStrategyType::SlidingWindow
    }
    
    fn description(&self) -> &str {
        "Keeps only the most recent messages within the token budget"
    }
    
    async fn apply(
        &self,
        messages: Vec<Message>,
        config: &ContextStrategyConfig,
        context: &StrategyContext,
    ) -> Result<StrategyResult, StrategyError> {
        if context.current_tokens <= context.token_budget {
            return Ok(StrategyResult::no_op(messages));
        }
        
        let mut kept_messages = Vec::new();
        let mut total_tokens = 0;
        
        // Iterate from newest to oldest
        for message in messages.iter().rev() {
            let message_tokens = estimate_message_tokens(message);
            
            if total_tokens + message_tokens <= context.available_budget {
                kept_messages.insert(0, message.clone());
                total_tokens += message_tokens;
            }
        }
        
        Ok(StrategyResult {
            messages: kept_messages,
            messages_removed: messages.len() - kept_messages.len(),
            tokens_saved: context.current_tokens - total_tokens,
            was_applied: true,
            summary: None,
            extracted_facts: None,
        })
    }
}
```

#### 5. Tauri Command Integration

```rust
// lib.rs
use tauri::{Manager, State};

struct AppState {
    context_manager: ContextManager,
    memory_service: MemoryService,
}

#[tauri::command]
async fn prepare_messages_for_model(
    messages: Vec<Message>,
    assistant_id: String,
    topic_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<PreparedMessages, String> {
    let config = state.context_manager.get_effective_config(
        topic_id.as_deref(),
        Some(&assistant_id),
    ).await?;
    
    let result = state.context_manager
        .apply_strategy(messages, &config)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(PreparedMessages {
        messages: result.messages,
        context_summary: result.summary,
        context_management_applied: result.was_applied,
    })
}

#[tauri::command]
async fn update_context_strategy(
    level: ConfigLevel,
    config: ContextStrategyConfig,
    target_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    match level {
        ConfigLevel::Global => {
            state.context_manager.set_global_config(config).await?;
        }
        ConfigLevel::Assistant => {
            let id = target_id.ok_or("Assistant ID required")?;
            state.context_manager.set_assistant_config(&id, config).await?;
        }
        ConfigLevel::Topic => {
            let id = target_id.ok_or("Topic ID required")?;
            state.context_manager.set_topic_config(&id, config).await?;
        }
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            context_manager: ContextManager::new(),
            memory_service: MemoryService::new(),
        })
        .invoke_handler(tauri::generate_handler![
            prepare_messages_for_model,
            update_context_strategy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 6. Token Estimation in Rust

```rust
use tiktoken_rs::{cl100k_base, CoreBPE};
use once_cell::sync::Lazy;

static TOKENIZER: Lazy<CoreBPE> = Lazy::new(|| {
    cl100k_base().expect("Failed to load tokenizer")
});

fn estimate_text_tokens(text: &str) -> usize {
    TOKENIZER.encode_with_special_tokens(text).len()
}

fn estimate_message_tokens(message: &Message) -> usize {
    // Base overhead for message structure
    const MESSAGE_OVERHEAD: usize = 4;
    
    let content_tokens = estimate_text_tokens(&message.content);
    
    MESSAGE_OVERHEAD + content_tokens
}

fn estimate_conversation_tokens(messages: &[Message], system_prompt: Option<&str>) -> usize {
    let system_tokens = system_prompt.map(estimate_text_tokens).unwrap_or(0);
    let message_tokens: usize = messages.iter().map(estimate_message_tokens).sum();
    
    system_tokens + message_tokens
}
```

### Recommended Rust Crates

| Purpose | Crate | Notes |
|---------|-------|-------|
| Async runtime | `tokio` | De facto standard for async Rust |
| Serialization | `serde`, `serde_json` | JSON interop with frontend |
| Tokenization | `tiktoken-rs` | OpenAI-compatible token counting |
| SQLite | `sqlx` or `rusqlite` | Persistent storage |
| Vector embeddings | `qdrant-client` or `milvus` | Semantic memory search |
| Async traits | `async-trait` | Async methods in traits |
| Error handling | `thiserror`, `anyhow` | Ergonomic error types |

### Performance Considerations

1. **Zero-Copy Serialization**: Use `serde` with `#[serde(borrow)]` where possible
2. **Batch Processing**: Group IPC calls to reduce overhead
3. **Caching**: Cache token estimates for repeated messages
4. **Lazy Initialization**: Initialize tokenizers and models lazily
5. **Memory Mapping**: Use mmap for large conversation histories

---

## References

### Academic Research

1. **"Lost in the Middle: How Language Models Use Long Contexts"** (Liu et al., 2023)
   - https://arxiv.org/abs/2307.03172
   - Demonstrates U-shaped attention patterns in LLMs

2. **"What Works for 'Lost-in-the-Middle' in LLMs?"** (2024)
   - https://arxiv.org/abs/2511.13900
   - Evaluates mitigation strategies

3. **"A Survey on the Memory Mechanism of Large Language Model Based Agents"** (2024)
   - https://dl.acm.org/doi/10.1145/3748302
   - Comprehensive survey of memory architectures

4. **"An Interactive Benchmark for LLM Agents in Long-Context Software Engineering"** (2024)
   - https://arxiv.org/abs/2511.13998
   - Hierarchical memory architecture in coding assistants

### Industry Resources

5. **"Context Window Management Strategies"** - Maxim AI
   - https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/

6. **"Four Important Lessons About Context Engineering"** - InfoWorld
   - https://www.infoworld.com/article/4085355/four-important-lessons-about-context-engineering.html

7. **"Context Rot: The Emerging Challenge"** - Understanding AI
   - https://www.understandingai.org/p/context-rot-the-emerging-challenge

8. **"Understanding LLM Performance Degradation"** - Demiliani
   - https://demiliani.com/2025/11/02/understanding-llm-performance-degradation-a-deep-dive-into-context-window-limits/

### Tauri/Rust Resources

9. **Tauri State Management**
   - https://v2.tauri.app/develop/calling-rust/

10. **Tauri Store Plugin**
    - https://v2.tauri.app/plugin/store/

### Related Projects

11. **Awesome LLM Long Context Modeling**
    - https://github.com/Xnhyacinth/Awesome-LLM-Long-Context-Modeling

12. **LangMem** - Hierarchical memory for LangChain
    - https://github.com/langchain-ai/langchain

13. **Mem0** - Long-term memory for AI
    - https://github.com/mem0ai/mem0

---

## Appendix: Configuration Schema

### Complete TypeScript Types

```typescript
type ContextStrategyType =
  | 'none'           // No management
  | 'sliding_window' // Keep most recent
  | 'summarize'      // Progressive summarization
  | 'hierarchical'   // Three-tier memory
  | 'truncate_middle' // Keep first + last

interface ContextStrategyConfig {
  type: ContextStrategyType
  
  // Sliding window
  maxMessages?: number
  
  // Summarization
  summarizationModelId?: string
  summaryMaxTokens?: number      // Default: 500
  summarizeThreshold?: number    // Default: 6
  
  // Hierarchical
  shortTermTurns?: number        // Default: 5
  midTermSummaryTokens?: number  // Default: 2000
  longTermFactsTokens?: number   // Default: 500
  
  // Truncate middle
  keepFirstMessages?: number     // Default: 2
  keepLastMessages?: number      // Default: 4
  showOmissionMarker?: boolean   // Default: true
}
```

### Default Configuration

```typescript
const DEFAULT_CONTEXT_STRATEGY_CONFIG: ContextStrategyConfig = {
  type: 'sliding_window',
  maxMessages: undefined,
  summarizationModelId: undefined,
  summaryMaxTokens: 500,
  summarizeThreshold: 6,
  shortTermTurns: 5,
  midTermSummaryTokens: 2000,
  longTermFactsTokens: 500,
  keepFirstMessages: 2,
  keepLastMessages: 4,
  showOmissionMarker: true
}
```

---

*Last updated: November 2025*

