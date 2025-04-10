import axios from 'axios'
import { error } from 'node:console'

import logger from './logger'
import request from './axios-instance'
import { exchangeApis, symbolMap } from '../config/constants'

async function fetchPriceFromBinance(coin: string, timestamp: number): Promise<null | number> {
    try {
        const symbol = symbolMap.get(coin)
        if (!symbol) throw new Error(`Symbol not available for ${coin}`)

        const d = new Date(timestamp)
        timestamp = d.setUTCHours(0, 0, 0, 0)
        const currentTimestamp = new Date().setUTCHours(0, 0, 0, 0)
        if (timestamp === currentTimestamp) {
            const url = exchangeApis.BINANCE_TICKER_API
            const params = { symbol }
            const response = await axios.get(url, { params })
            return Number.parseFloat(response.data.price)
        }

        const url = exchangeApis.BINANCE_KLINES_API
        const params = {
            endTime: timestamp + 86_400_000,
            interval: '1d',
            limit: 1,
            startTime: timestamp,
            symbol,
        }
        const response = await axios.get(url, { params })
        const { data } = response

        if (!data || data.length === 0) throw new Error(`Data not vailable for symbol ${symbol} at ${timestamp}`)

        const highPrice = Number.parseFloat(data[0][2]) // High price is the third element
        const lowPrice = Number.parseFloat(data[0][3]) // Low price is the fourth element
        return (highPrice + lowPrice) / 2
    } catch (error) {
        if (error instanceof Error)
            logger.error(`Could not find price for ${coin} at ${timestamp} from binance: ${error.message}`)
        return null
    }
}

const fetchPriceFromCoingecko = async (coin: string, date: string): Promise<number> => {
    try {
        const url = `${exchangeApis.COINGECKO_API}/${coin}/history`
        const data = await request.get(url, {
            params: { date, localization: false },
        })
        return data.market_data.current_price.usd
    } catch (error) {
        if (error instanceof Error)
            logger.error(`Could not find price for ${coin} on ${date} from coingecko: ${error.message}`)
        throw error
    }
}

const findTokenPrice = async (coin: string, timestamp: number): Promise<number> => {
    try {
        if (timestamp > Date.now()) throw new Error('Cannot find price for future date')

        const d = new Date(timestamp)
        const date = d.getUTCDate()
        const month = d.getUTCMonth() + 1
        const year = d.getUTCFullYear()
        const dateParam = `${date}-${month}-${year}`

        const price = await fetchPriceFromBinance(coin, timestamp)
        if (price) return price

        return fetchPriceFromCoingecko(coin, dateParam)
    } catch {
        if (error instanceof Error)
            logger.error(`Could not find price for ${coin} at ${timestamp} from any source: ${error.message}`)
        throw error
    }
}

export { findTokenPrice }
