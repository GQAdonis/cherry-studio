import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import PrometheusLogo from '@renderer/assets/images/prometheus-flame.png'

const SplashContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--color-black);
  z-index: 9999;
  transition: opacity 0.5s ease-in-out;
`

const LogoContainer = styled.div`
  position: relative;
  width: 150px;
  height: 150px;
  margin-bottom: 20px;
`

const Logo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const AppName = styled.div`
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: var(--color-white);
  margin-top: 20px;
  letter-spacing: 1px;
`

const LoadingBar = styled.div`
  width: 200px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 30px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 30%;
    background: linear-gradient(to right, #ffdd00, #ff5500, #ff4d4d);
    border-radius: 2px;
    animation: loading 1.5s infinite ease-in-out;
  }

  @keyframes loading {
    0% {
      left: -30%;
    }
    100% {
      left: 100%;
    }
  }
`

interface SplashScreenProps {
  onFinished: () => void
  duration?: number
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished, duration = 3000 }) => {
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(0)
      setTimeout(onFinished, 500) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onFinished])

  return (
    <SplashContainer style={{ opacity }}>
      <LogoContainer>
        <Logo src={PrometheusLogo} alt="Prometheus Studio" />
      </LogoContainer>
      <AppName>PROMETHEUS STUDIO</AppName>
      <LoadingBar />
    </SplashContainer>
  )
}

export default SplashScreen
