/// <reference types="vite/client" />

// Declare module for image imports with query parameters
declare module '*.png?url' {
  const src: string
  export default src
}

declare module '*.jpg?url' {
  const src: string
  export default src
}

declare module '*.jpeg?url' {
  const src: string
  export default src
}

declare module '*.webp?url' {
  const src: string
  export default src
}

declare module '*.svg?url' {
  const src: string
  export default src
}

// Specific path declarations for app images
declare module '@renderer/assets/images/apps/*.png?url' {
  const src: string
  export default src
}

declare module '@renderer/assets/images/apps/*.jpg?url' {
  const src: string
  export default src
}

declare module '@renderer/assets/images/apps/*.webp?url' {
  const src: string
  export default src
}

declare module '@renderer/assets/images/apps/*.svg?url' {
  const src: string
  export default src
}

// Specific path declarations for model images
declare module '@renderer/assets/images/models/*.png?url' {
  const src: string
  export default src
}

// Specific path declarations for provider images
declare module '@renderer/assets/images/providers/*.png?url' {
  const src: string
  export default src
}

declare module '@renderer/assets/images/providers/*.svg?url' {
  const src: string
  export default src
}
