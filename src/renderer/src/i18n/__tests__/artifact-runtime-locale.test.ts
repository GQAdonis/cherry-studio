import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

function readLocale(fileName: string): Record<string, any> {
  const filePath = path.resolve(process.cwd(), 'src/renderer/src/i18n/locales', fileName)
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function getPathValue(source: Record<string, any>, pathParts: string[]) {
  return pathParts.reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source)
}

describe('artifact and topic skill locale keys', () => {
  const localeFiles = ['en-us.json', 'zh-cn.json', 'zh-tw.json']
  const requiredPaths = [
    'common.all',
    'common.clone',
    'common.create',
    'artifacts.archive',
    'artifacts.download_package',
    'artifacts.hide_archived',
    'artifacts.knowledge_bridge',
    'artifacts.new_project_setup',
    'artifacts.project_name_placeholder',
    'artifacts.projects_title',
    'artifacts.rebind_source',
    'artifacts.show_archived',
    'artifacts.source',
    'artifacts.updated_at',
    'assistants.create.settings.title',
    'assistants.create.settings.description',
    'assistants.settings.skills.title',
    'assistants.settings.skills.description',
    'assistants.settings.skills.use_global',
    'assistants.settings.skills.custom',
    'assistants.settings.skills.mode',
    'assistants.settings.skills.selected',
    'assistants.settings.skills.selected_placeholder',
    'assistants.settings.skills.strategy',
    'assistants.settings.skills.custom_info',
    'settings.artifacts.studio.title',
    'settings.artifacts.studio.allow_conversation_override',
    'settings.artifacts.studio.allow_project_override',
    'settings.artifacts.studio.default_model',
    'settings.artifacts.studio.default_temperature',
    'settings.artifacts.studio.default_top_p',
    'settings.artifacts.studio.default_max_tokens',
    'settings.artifacts.studio.default_stream_output',
    'settings.artifacts.studio.default_skill_mode',
    'settings.artifacts.studio.default_skill_strategy',
    'settings.artifacts.studio.default_context_strategy',
    'settings.artifacts.studio.default_knowledge_bases',
    'settings.artifacts.studio.auto_create_knowledge_bridge',
    'settings.models.default_model',
    'settings.skill.matching.title',
    'settings.skill.matching.strategy',
    'settings.context_strategy.title',
    'settings.temperature.label',
    'settings.top_p.label',
    'settings.max_tokens.label',
    'settings.stream_output.label',
    'settings.artifacts.runtime.title',
    'settings.artifacts.runtime.profile',
    'settings.artifacts.runtime.basic',
    'settings.artifacts.runtime.standard',
    'settings.artifacts.runtime.advanced',
    'settings.artifacts.runtime.profile_help',
    'settings.artifacts.runtime.allow_dynamic_deps',
    'settings.artifacts.runtime.allow_external_resources',
    'settings.artifacts.runtime.allow_custom_bundler',
    'chat.topics.skill_scope.label',
    'chat.topics.skill_scope.use_assistant',
    'chat.topics.skill_scope.all',
    'chat.topics.skill_scope.none',
    'chat.topics.skill_scope.selected',
    'chat.topics.skill_scope.no_skills',
    'chat.topics.skill_scope.strategy',
    'chat.topics.skill_scope.strategy_inherit'
  ]

  for (const localeFile of localeFiles) {
    it(`contains required keys in ${localeFile}`, () => {
      const locale = readLocale(localeFile)
      for (const keyPath of requiredPaths) {
        const value = getPathValue(locale, keyPath.split('.'))
        expect(value, `${localeFile} missing key ${keyPath}`).toBeTypeOf('string')
        expect(String(value).trim().length).toBeGreaterThan(0)
      }
    })
  }
})
