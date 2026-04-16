import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import TronApp from './tron' 
import Airdrop from './Airdrop' // 🛠️ ADDED: Import your new Airdrop component
import './index.css'

const queryClient = new QueryClient()

// 🛠️ ADDED: Detect the current URL path
const currentPath = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* 🛠️ ADDED: Native routing. Loads Airdrop for /airdrop, TronApp for /tron, otherwise defaults to App */}
      {currentPath === '/airdrop' || currentPath === '/airdrop/' ? (
        <Airdrop />
      ) : currentPath === '/tron' || currentPath === '/tron/' ? (
        <TronApp />
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </React.StrictMode>
)