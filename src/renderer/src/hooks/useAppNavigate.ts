/**
 * Navigation abstraction for router-agnostic navigation.
 *
 * Backed by @tanstack/react-router but provides a simplified API
 * compatible with react-router-dom's navigate(path) pattern.
 * All call sites use navigate('/path') — this wrapper converts
 * to tanstack's navigate({ to: '/path' }) format.
 */
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback } from 'react'

export type AppNavigateFunction = (to: string) => void

export const useAppNavigate = (): AppNavigateFunction => {
  const navigate = useNavigate()
  return useCallback((to: string) => navigate({ to }), [navigate])
}

export function useAppParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useParams({ strict: false }) as T
}
