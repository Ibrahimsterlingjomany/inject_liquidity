import 'dotenv/config'
import bs58 from 'bs58'
import { Keypair, Connection } from '@solana/web3.js'
import { Raydium } from '@raydium-io/raydium-sdk-v2'

const env = (k, req=true) => {
  const v = process.env[k]
  if (req && (!v || v==='')) throw new Error(`env ${k} manquant`)
  return v
}

const RPC          = env('RPC_URL')
const KEY58        = env('PRIVATE_KEY_BASE58')
const TOKEN0_MINT  = env('TOKEN0_MINT')
const TOKEN1_MINT  = env('TOKEN1_MINT')
const AMOUNT0_RAW  = env('AMOUNT0_RAW')
const AMOUNT1_RAW  = env('AMOUNT1_RAW')
const POOL_ID      = env('POOL_ID')
const SLIPPAGE_BPS = Number(env('SLIPPAGE_BPS'))

// DRY RUN D’ABORD
const DRY_RUN = true  // ➜ mets à false quand on valide

function loadKeypairFromBase58(b58) {
  const secret = bs58.decode(b58)
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

async function main() {
  console.log('🔌 RPC:', RPC)
  const connection = new Connection(RPC, 'confirmed')
  const owner = loadKeypairFromBase58(KEY58)
  console.log('🔐 Signer:', owner.publicKey.toBase58())

  const raydium = await Raydium.load({ connection, owner })
  const cpmm = raydium?.cpmm
  if (!cpmm) throw new Error('CPMM non dispo dans cette version du SDK')

  // Tenter de charger la pool
  let poolInfo = null
  if (raydium.api?.fetchPoolById) {
    const fetched = await raydium.api.fetchPoolById({ ids: POOL_ID })
    if (Array.isArray(fetched) && fetched.length) poolInfo = fetched[0]
  }
  if (!poolInfo && typeof cpmm.loadPool === 'function') {
    poolInfo = await cpmm.loadPool({ id: POOL_ID })
  }
  if (!poolInfo) throw new Error('Pool introuvable (attends un peu si elle vient d’être créée)')

  if (typeof cpmm.deposit !== 'function') {
    throw new Error('cpmm.deposit indisponible dans cette version')
  }

  const params = {
    poolInfo,
    inputA: { mint: TOKEN0_MINT, amount: AMOUNT0_RAW },
    inputB: { mint: TOKEN1_MINT, amount: AMOUNT1_RAW },
    fixedSide: 'a',
    slippageBps: SLIPPAGE_BPS
  }

  console.log('🧪 Params dépôt:', {
    poolId: poolInfo.id,
    inputA: params.inputA, inputB: params.inputB,
    fixedSide: params.fixedSide, slippageBps: params.slippageBps
  })

  if (DRY_RUN) {
    console.log('✅ DRY RUN OK — aucune transaction envoyée.')
    return
  }

  const { execute, extInfo } = await cpmm.deposit(params)
  console.log('🔧 extInfo:', extInfo)
  const sigs = await execute()
  const sig = Array.isArray(sigs) ? sigs[sigs.length - 1] : sigs
  console.log('✅ TX:', sig)
  console.log('🔗 Solscan:', `https://solscan.io/tx/${sig}`)
}

main().catch(e => {
  console.error('❌ Erreur:', e?.message ?? e)
  process.exit(1)
})
