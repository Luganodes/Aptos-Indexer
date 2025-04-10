import axios, { AxiosRequestConfig } from 'axios'

import logger from './logger'
import { sleep } from './sleep'

interface RetryConfig {
    incrementMultiple: 1 | 2
    initialDelay: number
    maxRetries: number
}

const defaultRetryConfig: RetryConfig = {
    incrementMultiple: 2,
    initialDelay: 5000,
    maxRetries: 6,
}

// eslint-disable-next-line max-params
async function retryRequest(
    method: 'GET' | 'POST',
    url: string,
    config: AxiosRequestConfig = {},
    retryConfig: RetryConfig,
    body?: unknown,
    currentRetry: number = 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    try {
        if (currentRetry !== 0) {
            if (config.headers) logger.debug(JSON.stringify(config.headers))
            await sleep(retryConfig.initialDelay)
        }

        const response = method === 'GET' ? await axios.get(url, config) : await axios.post(url, body, config)
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error) && currentRetry < retryConfig.maxRetries) {
            logger.debug(
                `${method} request to ${url} failed with status ${error.response?.status}. Retrying in ${retryConfig.initialDelay / 1000} seconds`,
            )
            console.log(JSON.stringify(error.response?.data, null, 2))
            return retryRequest(
                method,
                url,
                config,
                {
                    ...retryConfig,
                    initialDelay:
                        currentRetry === 0 ? retryConfig.initialDelay : retryConfig.initialDelay * retryConfig.incrementMultiple,
                },
                body,
                currentRetry + 1,
            )
        }

        throw error
    }
}

const request = {
    get(url: string, config: AxiosRequestConfig = {}, retryConfig: RetryConfig = defaultRetryConfig) {
        return retryRequest('GET', url, config, retryConfig)
    },

    post(url: string, body: unknown, config: AxiosRequestConfig = {}, retryConfig: RetryConfig = defaultRetryConfig) {
        return retryRequest('POST', url, config, retryConfig, body)
    },
}

export default request
