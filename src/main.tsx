import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {Placeholder} from './ui/screens/Placeholder'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>
)
