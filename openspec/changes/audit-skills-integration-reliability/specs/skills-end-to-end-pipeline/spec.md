## ADDED Requirements
### Requirement: Skills Runtime Injection Pipeline Integrity
The skills runtime pipeline SHALL preserve valid provider-bound payload structures while injecting skill instructions.

#### Scenario: Inject enabled skills into prompt without breaking payload shape
- **WHEN** the renderer AI middleware receives an AI SDK request with `params.prompt` as a message array and enabled skills are returned for the active agent
- **THEN** skill instructions are injected into a system message
- **AND** `params.prompt` remains an iterable message array accepted by downstream provider conversion logic

#### Scenario: Continue safely when skill retrieval fails
- **WHEN** enabled-skill retrieval fails during request preparation
- **THEN** the request proceeds with unchanged prompt/messages payloads
- **AND** the runtime does not throw conversion errors caused by non-iterable prompt values

#### Scenario: Provider compatibility across supported conversion paths
- **WHEN** skills injection executes before provider conversion for OpenAI and Anthropic chat requests
- **THEN** both conversion paths complete without type-shape exceptions
- **AND** completion streaming continues to first output or modeled provider error handling

### Requirement: Skills Runtime Boot Logging Readiness
Skills-enabled renderer startup SHALL initialize log source context before first runtime logs.

#### Scenario: Renderer boot sequence initializes logger window source first
- **WHEN** the primary renderer entry point bootstraps application modules
- **THEN** window source initialization occurs before other logging calls
- **AND** startup does not emit “window source not initialized” warnings
