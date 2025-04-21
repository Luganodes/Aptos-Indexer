/* eslint-disable camelcase */
import { findTokenPrice } from '../utils/token-price'
/* eslint-disable no-constant-condition */
import logger from '../utils/logger'
import Transaction from '../models/transaction'
import {
  AddStakeEvent,
  DelegatorStake,
  DelegatorWithdraw,
  EventData,
  ProcessedStakeEvents,
  ProcessedWithdrawEvents,
  StakeData,
  TransactionData,
  WithdrawStakeEvent,
} from '../types'
import {
  getAddStakeEventsCall,
  getCurrentStakeDataCall,
  getTransactionByVersionCall,
  getWithdrawEventsCall,
} from './network'

export const fetchAndProcessStakeEvents = async (lastProcessedSeqNo: number): Promise<ProcessedStakeEvents> => {
  let nextSeqNo = lastProcessedSeqNo + 1
  const delegatorStakes: Record<string, DelegatorStake> = {}
  let latestProcessedSeqNo = lastProcessedSeqNo

  while (true) {
    const stakeEvents = await getAddStakeEventsCall(nextSeqNo)
    if (stakeEvents.length === 0) break

    latestProcessedSeqNo = await processStakeEvents(stakeEvents, delegatorStakes)
    nextSeqNo = latestProcessedSeqNo + 1
  }

  return { delegatorStakes, latestProcessedSeqNo }
}

export const fetchAndProcessWithdrawEvents = async (lastProcessedSeqNo: number): Promise<ProcessedWithdrawEvents> => {
  let nextSeqNo = lastProcessedSeqNo + 1
  const delegatorWithdraws: Record<string, DelegatorWithdraw> = {}
  let latestProcessedSeqNo = lastProcessedSeqNo

  while (true) {
    const withdrawEvents = await getWithdrawEventsCall(nextSeqNo)
    if (withdrawEvents.length === 0) break

    latestProcessedSeqNo = await processWithdrawEvents(withdrawEvents, delegatorWithdraws)
    nextSeqNo = latestProcessedSeqNo + 1
  }

  return { delegatorWithdraws, latestProcessedSeqNo }
}

const processStakeEvents = (
  stakeEvents: AddStakeEvent[],
  delegatorStakes: Record<string, DelegatorStake>,
): Promise<number> => processEvents(stakeEvents, delegatorStakes, true)

const processWithdrawEvents = (
  withdrawEvents: WithdrawStakeEvent[],
  delegatorWithdraws: Record<string, DelegatorWithdraw>,
): Promise<number> => processEvents(withdrawEvents, delegatorWithdraws, false)

const processEvents = async <
  T extends AddStakeEvent | WithdrawStakeEvent,
  R extends DelegatorStake | DelegatorWithdraw,
>(
  events: T[],
  delegatorRecords: Record<string, R>,
  isStakeEvent: boolean,
): Promise<number> => {
  let latestSeqNo = 0

  for (const event of events) {
    await getAndPopulateTransaction(event)
    const { data, sequence_number, version } = event
    const { delegator_address } = data
    const sequenceNo = Number(sequence_number)
    const amount = isStakeEvent
      ? Number((event as AddStakeEvent).data.amount_added)
      : Number((event as WithdrawStakeEvent).data.amount_withdrawn)

    latestSeqNo = Math.max(latestSeqNo, sequenceNo)

    const existingRecord = delegatorRecords[delegator_address] as R
    const propertyName = isStakeEvent ? 'delegationAmount' : 'withdrawAmount'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedAmount = ((existingRecord && (existingRecord as any)[propertyName]) || 0) + amount

    delegatorRecords[delegator_address] = {
      [propertyName]: updatedAmount,
      sequenceNo,
      version,
    } as R
  }

  return latestSeqNo
}

export async function getCurrentStakeData(delegatorAddress: string): Promise<StakeData> {
  try {
    const [active, inactive, pendingInactive] = await getCurrentStakeDataCall(delegatorAddress)

    return {
      active: Number(active),
      inactive: Number(inactive),
      pendingInactive: Number(pendingInactive),
    }
  } catch (error) {
    logger.error(`Error getting current stake data: ${error}`)
    throw error
  }
}

export const getAptosUSDPrice = async (timestamp: number): Promise<null | number> => {
  try {
    const price = await findTokenPrice('aptos', timestamp)
    return price
  } catch (error) {
    logger.error(`Failed to fetch Aptos USD price: ${error}`)
    return null
  }
}

export const getAndPopulateTransaction = async (event: EventData): Promise<void> => {
  const { amount, type } = getTransactionType(event)
  const txData = await getTransactionByVersionCall(event.version)
  const timestamp = Math.trunc(Number(txData.timestamp) / 1000)
  const usdPrice = await getAptosUSDPrice(timestamp)
  logger.info(`Processing transaction ${txData.hash} with type ${type} and amount ${amount}`)
  const transaction = createTransactionObject(event, txData, type, amount, usdPrice)
  await Transaction.create(transaction)
}

const getTransactionType = (event: EventData): { amount: number; type: 'STAKE' | 'WITHDRAW' } => {
  if ('amount_withdrawn' in event.data) {
    return { amount: Number(event.data.amount_withdrawn), type: 'WITHDRAW' }
  }

  return { amount: Number(event.data.amount_added), type: 'STAKE' }
}

const createTransactionObject = (
  event: EventData,
  txData: TransactionData,
  type: 'STAKE' | 'WITHDRAW',
  amount: number,
  usdPrice: null | number,
  // eslint-disable-next-line max-params
) => ({
  amount,
  delegatorAddress: event.data.delegator_address,
  fee: Number(txData.gas_used) * Number(txData.gas_unit_price),
  timestamp: Math.trunc(Number(txData.timestamp) / 1000),
  transactionHash: txData.hash,
  type,
  usd: usdPrice,
})
