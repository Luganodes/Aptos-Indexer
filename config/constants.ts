import { config } from 'dotenv'

config()

export const APTOS_API_URL: string = process.env.APTOS_API_URL || 'https://fullnode.mainnet.aptoslabs.com/v1'
export const APTOS_STAKE_POOL_ADD: string =
  process.env.APTOS_STAKE_POOL_ADD || '0xff3e9c10dd3781a1e0750a75ae9e5b04133cd7e8ca18b9936ffcf3b2a2538a49'
export const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/aptos-indexer'
export const CRON_TIME: string = process.env.CRON_TIME || '*/30 * * * *'

export const symbolMap = new Map<string, string>([
  ['aptos', 'APTUSDT'],
])

export const exchangeApis = {
  BINANCE_KLINES_API: 'https://api.binance.com/api/v3/klines',
  BINANCE_TICKER_API: 'https://api.binance.com/api/v3/ticker/price',
  COINGECKO_API: 'https://api.coingecko.com/api/v3/coins',
}
