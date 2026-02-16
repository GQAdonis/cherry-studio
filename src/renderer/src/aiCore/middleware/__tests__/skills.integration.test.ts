/**
 * Integration Tests for Skills Functionality
 *
 * These tests verify that the skill plugin is properly integrated:
 * 1. Skill instructions are injected into conversations
 * 2. Skills work with the middleware chain
 * 3. Error handling is graceful
 */

import { describe, expect, it, vi } from 'vitest'

describe('Skills Integration', () => {
  describe('Skill Plugin is Exported from aiCore', () => {
    it('should export createSkillPlugin from built-in/plugins', async () => {
      // Act
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')

      // Assert
      expect(skillPlugin.createSkillPlugin).toBeDefined()
      expect(typeof skillPlugin.createSkillPlugin).toBe('function')
    })
  })

  describe('Skill Plugin Behavior', () => {
    it('should call getSkills when transforming params', async () => {
      // Arrange
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')
      const mockGetSkills = vi.fn().mockResolvedValue([])

      const plugin = (skillPlugin.createSkillPlugin as any)({
        getSkills: mockGetSkills
      })

      // Act
      const params = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model'
      }

      await plugin.transformParams(params as any)

      // Assert
      expect(mockGetSkills).toHaveBeenCalled()
    })

    it('should return params unchanged when no skills are enabled', async () => {
      // Arrange
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')
      const mockGetSkills = vi.fn().mockResolvedValue([])

      const plugin = (skillPlugin.createSkillPlugin as any)({
        getSkills: mockGetSkills
      })

      const originalMessages = [{ role: 'user', content: 'Hello' }]
      const params = {
        messages: [...originalMessages],
        model: 'test-model'
      }

      // Act
      const result = await plugin.transformParams(params as any)

      // Assert
      expect(result.messages).toEqual(originalMessages)
    })

    it('should inject system prompt with enabled skills', async () => {
      // Arrange
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')
      const mockGetSkills = vi
        .fn()
        .mockResolvedValue([{ id: 'skill-1', name: 'Test Skill', enabled: true, instructions: 'Test instruction' }])

      const plugin = (skillPlugin.createSkillPlugin as any)({
        getSkills: mockGetSkills
      })

      const params = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model'
      }

      // Act
      const result = await plugin.transformParams(params as any)
      const systemMsg = result.messages.find((m: any) => m.role === 'system')

      // Assert
      expect(systemMsg).toBeDefined()
      expect(systemMsg.content).toContain('## Active Skills')
      expect(systemMsg.content).toContain('### Skill: Test Skill')
      expect(systemMsg.content).toContain('Test instruction')
    })

    it('should handle skill fetch errors gracefully', async () => {
      // Arrange
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')
      const mockGetSkills = vi.fn().mockRejectedValue(new Error('API Error'))

      const plugin = (skillPlugin.createSkillPlugin as any)({
        getSkills: mockGetSkills
      })

      const params = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model'
      }

      // Act & Assert - should not throw
      const result = await plugin.transformParams(params as any)

      expect(result).toBeDefined()
    })

    it('should emit skill.activation stream chunks for enabled skills', async () => {
      const skillPlugin = await import('@cherrystudio/ai-core/built-in/plugins')
      const plugin = (skillPlugin.createSkillPlugin as any)({
        getSkills: vi.fn().mockResolvedValue([
          { id: 'skill-1', name: 'UI/UX Pro Max', enabled: true, instructions: 'Design guidance' },
          { id: 'skill-2', name: 'Artifact Refiner', enabled: true, instructions: 'Artifact guidance' }
        ])
      })

      const streamTransformFactory = plugin.transformStream({}, {})
      const transformStream = streamTransformFactory({})
      const reader = transformStream.readable.getReader()

      const first = await reader.read()
      const second = await reader.read()
      await reader.cancel()

      expect(first.value).toEqual({
        type: 'data',
        value: {
          type: 'skill.activation',
          skillName: 'UI/UX Pro Max',
          action: 'activated'
        }
      })
      expect(second.value).toEqual({
        type: 'data',
        value: {
          type: 'skill.activation',
          skillName: 'Artifact Refiner',
          action: 'activated'
        }
      })
    })
  })

  describe('Agent-Skill Integration', () => {
    it('should have getEnabledForAgent API exposed', () => {
      // Assert - verify the API structure exists
      expect(window.api).toBeDefined()
      expect(window.api.skill).toBeDefined()
      expect(window.api.skill.getEnabledForAgent).toBeDefined()
      expect(typeof window.api.skill.getEnabledForAgent).toBe('function')
    })

    it('should have other skill management APIs', () => {
      // Assert
      expect(window.api.skill.getList).toBeDefined()
      expect(window.api.skill.toggle).toBeDefined()
      expect(window.api.skill.executeScript).toBeDefined()
      expect(window.api.skill.refresh).toBeDefined()
      expect(window.api.skill.getMatchingConfig).toBeDefined()
      expect(window.api.skill.setMatchingConfig).toBeDefined()
      expect(window.api.skill.setAgentSkills).toBeDefined()
    })

    it('should expose skill creator APIs through preload', () => {
      expect(window.api.skillCreator).toBeDefined()
      expect(window.api.skillCreator.validate).toBeDefined()
      expect(window.api.skillCreator.initTemplate).toBeDefined()
      expect(window.api.skillCreator.saveToProvider).toBeDefined()
      expect(window.api.skillCreator.testScript).toBeDefined()
    })
  })

  describe('IPC Channels for Skills', () => {
    it('should have correct IPC channel constants', () => {
      // Assert
      const IpcChannel = (globalThis as any).IpcChannel
      expect(IpcChannel?.Skill_GetList).toBe('skill:get-list')
      expect(IpcChannel?.Skill_GetAgentSkills).toBe('skill:get-agent-skills')
      expect(IpcChannel?.Skill_SetAgentSkills).toBe('skill:set-agent-skills')
      expect(IpcChannel?.Skill_ExecuteScript).toBe('skill:execute-script')
      expect(IpcChannel?.SkillCreator_Validate).toBe('skill-creator:validate')
      expect(IpcChannel?.SkillCreator_InitTemplate).toBe('skill-creator:init-template')
      expect(IpcChannel?.SkillCreator_SaveToProvider).toBe('skill-creator:save-to-provider')
      expect(IpcChannel?.SkillCreator_TestScript).toBe('skill-creator:test-script')
      expect(IpcChannel?.Skill_AddToAgent).toBe('skill:add-to-agent')
      expect(IpcChannel?.Skill_RemoveFromAgent).toBe('skill:remove-from-agent')
      expect(IpcChannel?.Skill_GetEnabledForAgent).toBe('skill:get-enabled-for-agent')
    })
  })
})
