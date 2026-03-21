import { loggerService } from '@logger'
import { useAppDispatch } from '@renderer/store'
import { setHtmxServerPort } from '@renderer/store/artifacts'
import { useEffect } from 'react'

const logger = loggerService.withContext('useArtifactHtmxServer')

export function useArtifactHtmxServer(enabled: boolean) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!enabled) {
      dispatch(setHtmxServerPort(null))
      return
    }

    let disposed = false
    const unsubscribe = window.api.artifact.onServerStatus(({ event, port }) => {
      if (disposed) {
        return
      }
      dispatch(setHtmxServerPort(event === 'started' ? port : null))
    })

    const ensureServer = async () => {
      try {
        const status = await window.api.artifact.getServerStatus()
        if (disposed) {
          return
        }

        if (status.running && status.port) {
          dispatch(setHtmxServerPort(status.port))
          return
        }

        const started = await window.api.artifact.startServer()
        if (!disposed) {
          dispatch(setHtmxServerPort(started.success ? started.port || null : null))
        }
      } catch (error) {
        logger.error('Failed to ensure HTMX artifact server', error as Error)
        if (!disposed) {
          dispatch(setHtmxServerPort(null))
        }
      }
    }

    void ensureServer()

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [dispatch, enabled])
}

export default useArtifactHtmxServer
