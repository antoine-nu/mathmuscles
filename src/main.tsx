import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Gallery } from './components/Gallery'
import { ProblemGallery } from './components/ProblemGallery'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has('galerie') ? <Gallery />
      : new URLSearchParams(location.search).has('problemes') ? <ProblemGallery />
        : <App />}
  </StrictMode>,
)
