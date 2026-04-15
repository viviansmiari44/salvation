import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import TronApp from './tron' // 🛠️ ADDED: Import your new Tron component
import './index.css'

const queryClient = new QueryClient()

// 🛠️ ADDED: Detect the current URL path
const currentPath = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* 🛠️ ADDED: Native routing. Loads TronApp if the URL is /tron, otherwise loads the standard App */}
      {currentPath === '/tron' || currentPath === '/tron/' ? <TronApp /> : <App />}
    </QueryClientProvider>
  </React.StrictMode>
)