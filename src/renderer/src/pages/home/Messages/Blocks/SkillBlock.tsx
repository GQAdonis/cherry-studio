import type { SkillMessageBlock } from '@renderer/types/newMessage'
import { Tag, Typography } from 'antd'
import { GraduationCap } from 'lucide-react'
import type { FC } from 'react'

const { Text } = Typography

interface Props {
  block: SkillMessageBlock
}

const SkillBlock: FC<Props> = ({ block }) => {
  const isError = block.action === 'failed'
  const isSuccess = block.action === 'completed'
  // Color mapping: activated=blue/processing, completed=green, failed=red
  const color = isError ? 'red' : isSuccess ? 'green' : 'blue'

  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-md bg-opacity-10 p-2"
      style={{ backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <GraduationCap size={16} className={`text-${color}-500`} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Text strong style={{ fontSize: 13 }}>
            {block.skillName}
          </Text>
          <Tag color={color} style={{ margin: 0, fontSize: 10, lineHeight: '18px' }}>
            {block.action.toUpperCase()}
          </Tag>
        </div>
        {block.toolName && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            Tool: {block.toolName}
          </Text>
        )}
        {block.error && (
          <Text type="danger" style={{ fontSize: 11 }}>
            {block.error?.message || 'Unknown Error'}
          </Text>
        )}
      </div>
    </div>
  )
}

export default SkillBlock
