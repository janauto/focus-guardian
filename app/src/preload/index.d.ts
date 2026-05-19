import type { FocusAPI } from '../shared/types'

declare global {
  interface Window {
    focusApi: FocusAPI
  }
}

export {}
