import './assets/styles/index.css'
import './assets/styles/tailwind.css'
import '@ant-design/v5-patch-for-react-19'
import './loggerBootstrap'
import './init'

import { createRoot } from 'react-dom/client'

import App from './App'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
