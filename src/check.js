import 'dotenv/config'
import { Connection } from '@solana/web3.js'

const RPC = process.env.RPC_URL
const KEY = process.env.PRIVATE_KEY_BASE58
if (!RPC || !KEY) {
  console.error('❌ RPC_URL ou PRIVATE_KEY_BASE58 manquant dans .env')
  process.exit(1)
}
const run = async () => {
  const conn = new Connection(RPC, 'confirmed')
  const v = await conn.getVersion()
  console.log('🔌 RPC:', RPC)
  console.log('✅ Solana ok →', v['solana-core'])
  console.log('🔑 Clé bs58 chargée (non affichée)')
}
run().catch(e=>{ console.error('❌', e?.message||e); process.exit(1) })
