import { loggerService } from '@logger'

import type { SkillRecord } from './skillStorage'

const logger = loggerService.withContext('SkillValidator')

/**
 * Validation error (skill cannot be saved).
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Validation warning (skill can be saved, but may not perform optimally).
 */
export interface ValidationWarning {
  field: string
  message: string
}

/**
 * Validation result for a skill.
 */
export interface SkillValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// ── Name validation regex from agentskills.io spec ──────────────────────
const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
const NAME_CONSECUTIVE_HYPHENS = /--/

/**
 * Validates skills against the agentskills.io specification.
 *
 * Reference: https://agentskills.io/specification
 */
export class SkillValidator {
  /**
   * Validate a skill record against the agentskills.io spec.
   */
  validate(skill: Partial<SkillRecord>): SkillValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // ── name (required) ──────────────────────────────────────────────────
    if (!skill.name) {
      errors.push({ field: 'name', message: 'Name is required' })
    } else {
      if (skill.name.length > 64) {
        errors.push({ field: 'name', message: 'Name must be 64 characters or fewer' })
      }
      if (!NAME_REGEX.test(skill.name)) {
        errors.push({
          field: 'name',
          message: 'Name may only contain lowercase letters, numbers, and hyphens. Must not start or end with a hyphen.'
        })
      }
      if (NAME_CONSECUTIVE_HYPHENS.test(skill.name)) {
        errors.push({ field: 'name', message: 'Name must not contain consecutive hyphens (--)' })
      }
    }

    // ── description (required) ───────────────────────────────────────────
    if (!skill.description) {
      errors.push({ field: 'description', message: 'Description is required' })
    } else {
      if (skill.description.length > 1024) {
        errors.push({ field: 'description', message: 'Description must be 1024 characters or fewer' })
      }
      // Quality check: description should mention "when" to use the skill
      const hasWhenInfo =
        /\bwhen\b/i.test(skill.description) ||
        /\buse (this |for )/i.test(skill.description) ||
        /\btrigger/i.test(skill.description)
      if (!hasWhenInfo) {
        warnings.push({
          field: 'description',
          message:
            'Description should include when to use this skill (e.g. "Use when..." or "Triggers on...") for better skill routing'
        })
      }
    }

    // ── instructions (required) ──────────────────────────────────────────
    if (!skill.instructions || !skill.instructions.trim()) {
      errors.push({ field: 'instructions', message: 'SKILL.md body (instructions) must not be empty' })
    } else {
      const lineCount = skill.instructions.split('\n').length
      if (lineCount > 500) {
        warnings.push({
          field: 'instructions',
          message: `SKILL.md body is ${lineCount} lines. The specification recommends keeping it under 500 lines for efficient context usage. Consider moving detailed content to references/ files.`
        })
      }
    }

    // ── compatibility (optional, max 500 chars) ─────────────────────────
    if (skill.compatibility && skill.compatibility.length > 500) {
      errors.push({ field: 'compatibility', message: 'Compatibility must be 500 characters or fewer' })
    }

    // ── metadata (optional, map of string to string) ────────────────────
    if (skill.metadata) {
      for (const [key, value] of Object.entries(skill.metadata)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          errors.push({
            field: 'metadata',
            message: `Metadata values must be strings. Key "${key}" has invalid value.`
          })
        }
      }
    }

    // ── id should match name ─────────────────────────────────────────────
    if (skill.id && skill.name && skill.id !== skill.name) {
      warnings.push({
        field: 'id',
        message: `Skill ID "${skill.id}" differs from name "${skill.name}". The spec recommends the directory name matches the name field.`
      })
    }

    const valid = errors.length === 0
    if (!valid) {
      logger.warn(`Skill validation failed: ${errors.length} error(s)`, { errors })
    }

    return { valid, errors, warnings }
  }

  /**
   * Create a template skill record with placeholder values.
   */
  static createTemplate(skillName: string): SkillRecord {
    const name = skillName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64)

    return {
      id: name || 'new-skill',
      name: name || 'new-skill',
      description: 'Replace with a description of what this skill does and when to use it.',
      instructions: '# ' + (name || 'New Skill') + '\n\nAdd your instructions here.\n',
      tools: [],
      examples: [],
      tags: [],
      triggerPatterns: []
    }
  }
}
