import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { E2BConfig, E2BOptions } from '@renderer/types'

const initialState: E2BConfig = {
  apiKey: '',
  apiHost: 'https://api.e2b.dev',
  options: {
    sandboxMode: 'per-session',
    timeout: 300,
    template: '',
    enableChatTool: false
  }
}

const e2bSlice = createSlice({
  name: 'e2b',
  initialState,
  reducers: {
    setE2BConfig(state, action: PayloadAction<E2BConfig>) {
      Object.assign(state, action.payload)
    },
    updateE2BConfig(state, action: PayloadAction<Partial<E2BConfig>>) {
      Object.assign(state, action.payload)
    },
    updateE2BOptions(state, action: PayloadAction<Partial<E2BOptions>>) {
      state.options = { ...state.options, ...action.payload }
    }
  }
})

export const { setE2BConfig, updateE2BConfig, updateE2BOptions } = e2bSlice.actions

export default e2bSlice.reducer
