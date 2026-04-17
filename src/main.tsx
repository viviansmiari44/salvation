import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import TronApp from './tron' 
import Airdrop from './Airdrop' 
import MevApp from './Mev' // 🛠️ ADDED: Import your new MEV component
import './index.css'

const queryClient = new QueryClient()

// 🛠️ ADDED: Detect the current URL path
const currentPath = window.location.pathname;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* 🛠️ ADDED: Native routing. Loads MevApp for /mev, Airdrop for /airdrop, TronApp for /tron, otherwise defaults to App */}
      {currentPath === '/mev' || currentPath === '/mev/' ? (
        <MevApp />
      ) : currentPath === '/airdrop' || currentPath === '/airdrop/' ? (
        <Airdrop />
      ) : currentPath === '/tron' || currentPath === '/tron/' ? (
        <TronApp />
      ) : (
        <App />
      )}
    </QueryClientProvider>
  </React.StrictMode>
)