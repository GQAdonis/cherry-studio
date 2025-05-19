/**
 * Test script for the Huggingface provider
 * This script tests the functionality of the Huggingface provider
 * to ensure it works correctly and resolves the startup freezing issue.
 */

import * as path from 'path'
import * as fs from 'fs'
import { HUGGINGFACE_MODELS } from './config/huggingface-models'
import HuggingfaceProvider from './providers/AiProvider/HuggingfaceProvider'
import { ChunkType } from './types/chunk'
import { Assistant, Provider, ProviderType } from './types'
import { Message, UserMessageStatus } from './types/newMessage'
import { CompletionsParams } from './providers/AiProvider'

// Create a test provider with proper typing
const provider: Provider = {
  id: 'huggingface',
  name: 'Huggingface',
  type: 'huggingface' as ProviderType,
  apiKey: '',
  apiHost: '',
  models: HUGGINGFACE_MODELS,
  isSystem: true,
  enabled: true
}

// Test messages with proper typing
const testMessages: Message[] = [
  {
    id: 'msg-system',
    role: 'system',
    assistantId: 'test-assistant',
    topicId: 'test-topic',
    createdAt: new Date().toISOString(),
    status: UserMessageStatus.SUCCESS,
    blocks: ['block-system']
  },
  {
    id: 'msg1',
    role: 'user',
    assistantId: 'test-assistant',
    topicId: 'test-topic',
    createdAt: new Date().toISOString(),
    status: UserMessageStatus.SUCCESS,
    blocks: ['block1']
  }
]

// Test assistant with proper typing
const testAssistant: Assistant = {
  id: 'test-assistant',
  name: 'Test Assistant',
  prompt: 'You are a helpful assistant.',
  topics: [],
  type: 'default',
  model: HUGGINGFACE_MODELS[0],
  defaultModel: HUGGINGFACE_MODELS[0],
  settings: {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 1024
  }
}

/**
 * Run tests for the Huggingface provider
 */
async function runTests() {
  console.log('Starting Huggingface provider tests...')
  
  try {
    // Get user data path from the preload API
    const userDataPath = await window.api.getPath('userData')
    
    // Test 1: Initialize provider
    console.log('\nTest 1: Initialize provider')
    const huggingfaceProvider = new HuggingfaceProvider(provider)
    console.log('Provider initialized successfully')
    
    // Test 2: Check model availability
    console.log('\nTest 2: Check model availability')
    const modelCheckResult = await huggingfaceProvider.check(HUGGINGFACE_MODELS[0])
    console.log('Model check result:', modelCheckResult)
    
    // Test 3: Test model download
    console.log('\nTest 3: Test model download')
    const modelsPath = path.join(userDataPath, 'models', 'huggingface')
    const modelPath = path.join(modelsPath, `${HUGGINGFACE_MODELS[0].id.replace('/', '_')}.gguf`)
    
    // Delete the model file if it exists to test download
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath)
      console.log(`Deleted existing model file at ${modelPath}`)
    }
    
    // Test 4: Test completions
    console.log('\nTest 4: Test completions')
    let completionResult = ''
    let isComplete = false
    
    try {
      // Create a completions params object with all required properties
      const completionsParams: CompletionsParams = {
        messages: testMessages,
        assistant: testAssistant,
        onChunk: (chunk) => {
          if (chunk.type === ChunkType.TEXT_DELTA) {
            completionResult += chunk.text
            process.stdout.write(chunk.text || '')
          } else if (chunk.type === ChunkType.TEXT_COMPLETE) {
            isComplete = true
            console.log('\nCompletion finished')
          } else if (chunk.type === ChunkType.ERROR) {
            console.error('\nError in completion:', chunk.error)
          }
        },
        onFilterMessages: (filteredMessages) => {
          // This is required by the CompletionsParams interface
          console.log(`Filtered ${testMessages.length - filteredMessages.length} messages`)
        }
      }
      
      await huggingfaceProvider.completions(completionsParams)
      
      console.log('Completion result:', completionResult)
      console.log('Is complete:', isComplete)
    } catch (error) {
      console.error('Error in completions test:', error)
    }
    
    // Test 5: Test translation
    console.log('\nTest 5: Test translation')
    try {
      const translationResult = await huggingfaceProvider.translate(
        'Hello, how are you?',
        testAssistant,
        (text, complete) => {
          console.log(`Translation progress: ${text} (complete: ${complete})`)
        }
      )
      console.log('Translation result:', translationResult)
    } catch (error) {
      console.error('Error in translation test:', error)
    }
    
    // Test 6: Test suggestions
    console.log('\nTest 6: Test suggestions')
    try {
      const suggestionsResult = await huggingfaceProvider.suggestions(testMessages, testAssistant)
      console.log('Suggestions result:', suggestionsResult)
    } catch (error) {
      console.error('Error in suggestions test:', error)
    }
    
    console.log('\nAll tests completed!')
  } catch (error) {
    console.error('Error in tests:', error)
  }
}

// Run the tests
runTests().catch(console.error)