import type { CSSProperties, FC, ReactNode } from 'react'

interface StackProps {
  children?: ReactNode
  gap?: string | number
  alignItems?: CSSProperties['alignItems']
  justifyContent?: CSSProperties['justifyContent']
  style?: CSSProperties
  className?: string
}

export const HStack: FC<StackProps> = ({ children, gap, alignItems = 'center', justifyContent, style, className }) => (
  <div
    style={{ display: 'flex', flexDirection: 'row', gap, alignItems, justifyContent, ...style }}
    className={className}>
    {children}
  </div>
)

export const VStack: FC<StackProps> = ({ children, gap, alignItems, justifyContent, style, className }) => (
  <div
    style={{ display: 'flex', flexDirection: 'column', gap, alignItems, justifyContent, ...style }}
    className={className}>
    {children}
  </div>
)
