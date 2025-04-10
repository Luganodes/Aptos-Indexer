import request from '../utils/axios-instance'
import logger from '../utils/logger'
import { APTOS_API_URL, APTOS_STAKE_POOL_ADD } from '../config/constants'
import { AddStakeEvent, AptosLedgerInfo, WithdrawStakeEvent } from '../types'

// Fetches the current epoch number from the Aptos API
export async function fetchEpochNumber(): Promise<number> {
  try {
    const response: AptosLedgerInfo = await request.get(`${APTOS_API_URL}/`)
    return Number.parseInt(response.epoch, 10)
  } catch (error) {
    logger.error(`Error fetching epoch number: ${error}`)
    throw error
  }
}

// Fetches add stake events from the Aptos API
export async function getAddStakeEventsCall(startParam: number): Promise<AddStakeEvent[]> {
  const PATH = `/accounts/${APTOS_STAKE_POOL_ADD}/events/0x1::delegation_pool::DelegationPool/add_stake_events`
  try {
    const response: AddStakeEvent[] = await request.get(`${APTOS_API_URL}${PATH}`, {
      params: {
        limit: 50,
        start: startParam,
      },
      timeout: 5000,
    })
    return response
  } catch (error) {
    logger.error(`Error fetching add stake events: ${error}`)
    throw error
  }
}

// Fetches withdraw stake events from the Aptos API
export async function getWithdrawEventsCall(startParam: number): Promise<WithdrawStakeEvent[]> {
  const PATH = `/accounts/${APTOS_STAKE_POOL_ADD}/events/0x1::delegation_pool::DelegationPool/withdraw_stake_events`
  try {
    const response: WithdrawStakeEvent[] = await request.get(`${APTOS_API_URL}${PATH}`, {
      params: {
        limit: 50,
        start: startParam,
      },
      timeout: 5000,
    })
    return response
  } catch (error) {
    logger.error(`Error fetching withdraw stake events: ${error}`)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCurrentStakeDataCall(delegatorAddress: string): Promise<any> {
  const PATH = '/view'
  const body = {
    arguments: [APTOS_STAKE_POOL_ADD, delegatorAddress],
    function: '0x1::delegation_pool::get_stake',
    // eslint-disable-next-line camelcase
    type_arguments: [],
  }

  try {
    const response = await request.post(`${APTOS_API_URL}${PATH}`, body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    })
    return response
  } catch (error) {
    logger.error(`Error fetching current stake data: ${error}`)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTransactionByVersionCall(version: string): Promise<any> {
  const PATH = `/transactions/by_version/${version}`

  try {
    const response = await request.get(`${APTOS_API_URL}${PATH}`, {
      timeout: 5000,
    })
    return response
  } catch (error) {
    logger.error(`Error fetching transaction by version: ${error}`)
    throw error
  }
}
