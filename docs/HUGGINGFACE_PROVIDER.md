# Huggingface Provider

## Overview

The Huggingface provider is a new AI provider implementation that replaces the previous Silicon provider. It enables the application to use Huggingface's SmolLM2 models for text generation, translation, summarization, and other natural language processing tasks.

## How It Works

The Huggingface provider uses a lazy-loading approach for model downloads, which means models are only downloaded when they are first used. This approach helps to:

1. Reduce initial application startup time
2. Minimize disk space usage by only downloading models that are actually used
3. Allow for a smoother user experience by not blocking the UI during model downloads

### Lazy-Loading Process

1. When a model is requested for the first time, the provider checks if it exists locally
2. If the model doesn't exist, it initiates a download from Huggingface's model repository
3. The download progress is tracked and can be monitored by the user
4. Once downloaded, the model is initialized and ready for use
5. Subsequent requests to the same model use the local copy without requiring re-download

## SmolLM2 Models

The Huggingface provider currently supports two SmolLM2 models:

### SmolLM2-360M-Instruct

- 360 million parameters
- Instruction-tuned for better response quality
- Optimized for CPU inference
- Suitable for general text generation, translation, and summarization tasks
- Default model for most operations

### SmolLM2-135M-Instruct

- 135 million parameters
- Instruction-tuned for better response quality
- Optimized for CPU inference
- Smaller and faster than the 360M model, but with slightly reduced capabilities
- Suitable for simpler tasks or when performance is a priority

Both models are quantized (Q4_0) to reduce memory usage and improve inference speed on CPU.

## Configuration

The Huggingface provider can be configured in several ways:

### Provider Configuration

The provider itself is configured in the `src/renderer/src/store/llm.ts` file, where it's added to the `INITIAL_PROVIDERS` array:

```typescript
{
  id: 'huggingface',
  name: 'Huggingface',
  type: 'huggingface',
  apiKey: '',
  apiHost: '',
  models: HUGGINGFACE_MODELS,
  isSystem: true,
  enabled: true
}
```

### Model Configuration

Models are configured in the `src/renderer/src/config/huggingface-models.ts` file:

```typescript
export const HUGGINGFACE_MODELS: Model[] = [
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    name: 'SmolLM2-360M-Instruct',
    description: 'A 360M parameter instruction-tuned model optimized for CPU inference',
    provider: 'huggingface',
    group: 'SmolLM2',
    type: ['text']
  },
  {
    id: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    name: 'SmolLM2-135M-Instruct',
    description: 'A 135M parameter instruction-tuned model optimized for CPU inference',
    provider: 'huggingface',
    group: 'SmolLM2',
    type: ['text']
  }
]
```

### Performance Settings

Performance settings for each model are defined in the same file:

```typescript
export const MODEL_PERFORMANCE_SETTINGS = {
  'HuggingFaceTB/SmolLM2-360M-Instruct': {
    threads: 4,
    gpuLayers: 0, // Run on CPU
    batchSize: 512
  },
  'HuggingFaceTB/SmolLM2-135M-Instruct': {
    threads: 4,
    gpuLayers: 0, // Run on CPU
    batchSize: 512
  }
}
```

## Customization

You can customize the Huggingface provider in several ways:

1. **Add new models**: Add new model entries to the `HUGGINGFACE_MODELS` array and corresponding download URLs to the `MODEL_URLS` object
2. **Adjust performance settings**: Modify the `MODEL_PERFORMANCE_SETTINGS` object to change thread count, GPU usage, or batch size
3. **Change default models**: Update the default model settings in the `initialState` object in `src/renderer/src/store/llm.ts`

## Troubleshooting

### Application Doesn't Start

If the application doesn't start after enabling the Huggingface provider:

1. Check if the provider is properly initialized in the store
2. Ensure the `enabled` flag is set to `true` for the provider
3. Verify that the model files are not corrupted by deleting the models directory and letting the application re-download them
4. Check the application logs for any errors related to model initialization

### Model Download Issues

If models fail to download:

1. Check your internet connection
2. Verify that the model URLs in `MODEL_URLS` are correct and accessible
3. Ensure you have sufficient disk space for the models
4. Check if your firewall or antivirus is blocking the download

### Slow Performance

If model inference is slow:

1. Try using the smaller SmolLM2-135M-Instruct model for better performance
2. Adjust the `threads` setting in `MODEL_PERFORMANCE_SETTINGS` to match your CPU core count
3. If you have a compatible GPU, you can try setting `gpuLayers` to a non-zero value to offload some computation to the GPU

### Memory Issues

If the application uses too much memory:

1. Use the smaller SmolLM2-135M-Instruct model
2. Reduce the `batchSize` in the performance settings
3. Ensure you're not running multiple heavy models simultaneously