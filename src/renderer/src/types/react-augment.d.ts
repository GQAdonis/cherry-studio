// React 19 exports useEffectEvent but @types/react hasn't added it to main types yet
// This augments the 'react' module to include the missing type
import 'react'

declare module 'react' {
  export function useEffectEvent<T extends (...args: any[]) => any>(callback: T): T
}
