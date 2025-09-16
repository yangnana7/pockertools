import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// cache-busting query to bypass stale CSS in dev servers
import './index.css?v=v6-guard-2'

const container = document.getElementById('root')!
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
