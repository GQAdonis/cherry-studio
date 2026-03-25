import { Flex } from '@cherrystudio/ui'
import { InfoTooltip } from '@cherrystudio/ui'
import { loggerService } from '@logger'
import InputEmbeddingDimension from '@renderer/components/InputEmbeddingDimension'
import ModelSelector from '@renderer/components/ModelSelector'
import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import { useModel } from '@renderer/hooks/useModel'
import { useProviders } from '@renderer/hooks/useProvider'
import { getModelUniqId } from '@renderer/services/ModelService'
import { selectMemoryConfig, updateMemoryConfig } from '@renderer/store/memory'
import type { Model } from '@renderer/types'
import { Form, Modal } from 'antd'
import { t } from 'i18next'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const logger = loggerService.withContext('MemorySettingsModal')

interface MemorySettingsModalProps {
  visible: boolean
  onSubmit: (values: any) => void
  onCancel: () => void
  form: any
}

type formValue = {
  llmModel: string
  embedderModel: string
  embedderDimensions: number
}

const MemorySettingsModal: FC<MemorySettingsModalProps> = ({ visible, onSubmit, onCancel, form }) => {
  const { providers } = useProviders()
  const dispatch = useDispatch()
  const memoryConfig = useSelector(selectMemoryConfig)
  const [loading, setLoading] = useState(false)

  // Get all models for lookup
  const llmModel = useModel(memoryConfig.llmModel?.id, memoryConfig.llmModel?.provider)
  const embedderModel = useModel(memoryConfig.embedderModel?.id, memoryConfig.embedderModel?.provider)

  // Initialize form with current memory config when modal opens
  useEffect(() => {
    if (visible && memoryConfig) {
      form.setFieldsValue({
        llmModel: getModelUniqId(llmModel),
        embedderModel: getModelUniqId(embedderModel),
        embedderDimensions: memoryConfig.embedderDimensions
        // customFactExtractionPrompt: memoryConfig.customFactExtractionPrompt,
        // customUpdateMemoryPrompt: memoryConfig.customUpdateMemoryPrompt
      })
    }
  }, [embedderModel, form, llmModel, memoryConfig, visible])

  const handleFormSubmit = async (values: formValue) => {
    try {
      // Convert model IDs back to Model objects
      // values.llmModel and values.embedderModel are JSON strings from getModelUniqId()
      // e.g., '{"id":"gpt-4","provider":"openai"}'
      // We need to find models by comparing with getModelUniqId() result
      const allModels = providers.flatMap((p) => p.models)
      const llmModel = allModels.find((m) => getModelUniqId(m) === values.llmModel)
      const embedderModel = allModels.find((m) => getModelUniqId(m) === values.embedderModel)

      if (embedderModel) {
        setLoading(true)
        const provider = providers.find((p) => p.id === embedderModel.provider)

        if (!provider) {
          return
        }

        const finalDimensions =
          typeof values.embedderDimensions === 'string'
            ? parseInt(values.embedderDimensions)
            : values.embedderDimensions

        const updatedConfig = {
          ...memoryConfig,
          llmModel,
          embedderModel,
          embedderDimensions: finalDimensions
          // customFactExtractionPrompt: values.customFactExtractionPrompt,
          // customUpdateMemoryPrompt: values.customUpdateMemoryPrompt
        }

        dispatch(updateMemoryConfig(updatedConfig))
        onSubmit(updatedConfig)
        setLoading(false)
      }
    } catch (error) {
      logger.error('Error submitting form:', error as Error)
      setLoading(false)
    }
  }

  const llmPredicate = useCallback((m: Model) => !isEmbeddingModel(m) && !isRerankModel(m), [])

  const embeddingPredicate = useCallback((m: Model) => isEmbeddingModel(m) && !isRerankModel(m), [])

  return (
    <Modal
      title={t('memory.settings_title')}
      open={visible}
      onOk={form.submit}
      onCancel={onCancel}
      width={600}
      centered
      transitionName="animation-move-down"
      confirmLoading={loading}
      styles={{
        header: {
          borderBottom: '0.5px solid var(--color-border)',
          paddingBottom: 16,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0
        },
        body: {
          paddingTop: 24
        }
      }}>
      <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
        <Form.Item
          label={t('memory.llm_model')}
          name="llmModel"
          rules={[{ required: true, message: t('memory.please_select_llm_model') }]}>
          <ModelSelector
            providers={providers}
            predicate={llmPredicate}
            placeholder={t('memory.select_llm_model_placeholder')}
          />
        </Form.Item>
        <Form.Item
          label={t('memory.embedding_model')}
          name="embedderModel"
          rules={[{ required: true, message: t('memory.please_select_embedding_model') }]}>
          <ModelSelector
            providers={providers}
            predicate={embeddingPredicate}
            placeholder={t('memory.select_embedding_model_placeholder')}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.embedderModel !== currentValues.embedderModel}>
          {({ getFieldValue }) => {
            const embedderModelId = getFieldValue('embedderModel')
            // embedderModelId is a JSON string from getModelUniqId(), find model by comparing
            const allModels = providers.flatMap((p) => p.models)
            const embedderModel = allModels.find((m) => getModelUniqId(m) === embedderModelId)
            return (
              <Form.Item
                label={
                  <Flex className="items-center gap-1">
                    {t('memory.embedding_dimensions')}
                    <InfoTooltip content={t('knowledge.dimensions_size_tooltip')} />
                  </Flex>
                }
                name="embedderDimensions"
                rules={[
                  {
                    validator(_, value) {
                      if (value === undefined || value === null || value > 0) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error(t('knowledge.dimensions_error_invalid')))
                    }
                  }
                ]}>
                <InputEmbeddingDimension model={embedderModel} disabled={!embedderModel} />
              </Form.Item>
            )
          }}
        </Form.Item>
        {/* <Form.Item label="Custom Fact Extraction Prompt" name="customFactExtractionPrompt">
          <Input.TextArea placeholder="Optional custom prompt for fact extraction..." rows={3} />
        </Form.Item>
        <Form.Item label="Custom Update Memory Prompt" name="customUpdateMemoryPrompt">
          <Input.TextArea placeholder="Optional custom prompt for memory updates..." rows={3} />
        </Form.Item> */}
      </Form>
    </Modal>
  )
}

export default MemorySettingsModal
