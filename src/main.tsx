import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {Diagnostics} from './ui/Diagnostics'
import {Echo} from './ui/screens/Echo'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Echo />
    <Diagnostics />
  </StrictMode>
)
