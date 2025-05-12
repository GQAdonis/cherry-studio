import React from 'react'
import './LoadingIndicator.css'

interface LoadingIndicatorProps {
  appId: string
  displayName?: string
  isLoading: boolean
}

/**
 * Loading indicator component that displays a mini app icon and spinner
 * while the mini app is loading.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ appId, displayName, isLoading }) => {
  if (!isLoading) return null
  
  return (
    <div className={`loading-indicator ${!isLoading ? 'hidden' : ''}`}>
      <div 
        className="app-icon"
        data-appid={appId}
      />
      <div className="loading-spinner" />
      <div className="loading-text">Loading {displayName || appId}...</div>
    </div>
  )
}

export default LoadingIndicator