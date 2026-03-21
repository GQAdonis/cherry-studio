/**
 * Navigation abstraction for router-agnostic navigation.
 *
 * Currently backed by react-router-dom. When the app migrates to
 * @tanstack/react-router (upstream v2 / PR #10162), only this file
 * needs to change — all call sites remain untouched.
 *
 * @tanstack migration notes:
 *   useAppNavigate → useNavigate from @tanstack/react-router
 *     navigate('/path') → navigate({ to: '/path' })
 *   useAppParams    → useParams from @tanstack/react-router (fully typed via route)
 *   AppNavigateFunction → NavigateFn from @tanstack/react-router
 */
import { type NavigateFunction, useNavigate, useParams } from 'react-router-dom'

export type AppNavigateFunction = NavigateFunction

export const useAppNavigate = useNavigate
export const useAppParams = useParams
