/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../utils/logger'
import Stake from '../models/stake'
import { DelegatorData, DocType } from '../types'
import { fetchAndProcessStakeEvents, fetchAndProcessWithdrawEvents } from './data'

// Updates the list of delegators for a given epoch
export const updateDelegatorList = async (epoch: number): Promise<{ delegators: DelegatorData[]; timestamp: number }> => {
  // Get the last processed sequence numbers for stake and withdraw events
  const { lastProcessedStakeSeqNo, lastProcessedWithdrawSeqNo } = await getLastProcessedSeqNos()
  logger.info(`Fetching Stake and Withdraw Events: ${lastProcessedStakeSeqNo}, ${lastProcessedWithdrawSeqNo}`)

  // Fetch and process stake and withdraw events concurrently
  const [
    { delegatorStakes, latestProcessedSeqNo: latestStakeSeqNo },
    { delegatorWithdraws, latestProcessedSeqNo: latestWithdrawSeqNo },
  ] = await Promise.all([
    fetchAndProcessStakeEvents(lastProcessedStakeSeqNo),
    fetchAndProcessWithdrawEvents(lastProcessedWithdrawSeqNo),
  ])
  logger.info('Fetched Stake and Withdraw Events')

  // Combine stake and withdraw events for each delegator
  const combinedEventsData = combineEvents(delegatorStakes, delegatorWithdraws)

  // Extract delegator addresses from combined events
  const delegatorAddresses = Object.keys(combinedEventsData)

  // Fetch existing delegators from the database
  const existingDelegators = await fetchExistingDelegators(delegatorAddresses)

  // Get the current timestamp
  const timestamp = Date.now()

  // Process existing delegators with new event data
  const insertStakeData = processExistingDelegators(
    existingDelegators,
    combinedEventsData,
    timestamp,
    epoch,
    latestStakeSeqNo,
    latestWithdrawSeqNo,
  )

  // Process new delegators from event data
  const newDelegatorsData = processNewDelegators(
    combinedEventsData,
    timestamp,
    epoch,
    latestStakeSeqNo,
    latestWithdrawSeqNo,
  )

  // Use chunking to safely combine arrays
  const chunkSize = 1000
  let combinedStakeData: DelegatorData[] = []

  // Combine insertStakeData and newDelegatorsData
  for (let i = 0; i < insertStakeData.length; i += chunkSize) {
    const chunk = insertStakeData.slice(i, i + chunkSize)
    combinedStakeData = [...combinedStakeData, ...chunk]
  }

  for (let i = 0; i < newDelegatorsData.length; i += chunkSize) {
    const chunk = newDelegatorsData.slice(i, i + chunkSize)
    combinedStakeData = [...combinedStakeData, ...chunk]
  }

  // Process old stake delegators who have not been updated recently
  const oldStakeDelegators = await processOldStakeDelegators(
    delegatorAddresses,
    timestamp,
    epoch,
    latestStakeSeqNo,
    latestWithdrawSeqNo,
  )

  // Combine with oldStakeDelegators
  for (let i = 0; i < oldStakeDelegators.length; i += chunkSize) {
    const chunk = oldStakeDelegators.slice(i, i + chunkSize)
    combinedStakeData = [...combinedStakeData, ...chunk]
  }

  // Insert combined stake data into the database
  const insertedStakeData = await Stake.insertMany(combinedStakeData)
  // Filter out active delegators
  const activeDelegators = insertedStakeData.filter((delegator) => !delegator.unstaked)

  // Return active delegators and the current timestamp
  return { delegators: activeDelegators, timestamp }
}

// Fetches the last processed sequence numbers for stake and withdraw events
const getLastProcessedSeqNos = async () => {
  const prevStakeObj = await Stake.findOne({ stakeType: DocType.TWO_HRS_RECURRING }).sort({ timestamp: -1 })
  logger.info(`Last Stake Object in DB: ${prevStakeObj}`)
  return {
    lastProcessedStakeSeqNo: prevStakeObj?.stakeSeqNo || 0,
    lastProcessedWithdrawSeqNo: prevStakeObj?.withdrawSeqNo || 0,
  }
}

// Combines stake and withdraw events for each delegator
const combineEvents = (delegatorStakes: Record<string, any>, delegatorWithdraws: Record<string, any>) => {
  const combinedEventsData: Record<string, any> = {}
  for (const [delegator, stakeEvent] of Object.entries(delegatorStakes)) {
    combinedEventsData[delegator] = { addStake: true, addStakeEvent: stakeEvent, withdrawStake: false }
  }

  for (const [delegator, withdrawEvent] of Object.entries(delegatorWithdraws)) {
    if (delegator in combinedEventsData) {
      combinedEventsData[delegator].withdrawStake = true
      combinedEventsData[delegator].withdrawStakeEvent = withdrawEvent
    } else {
      combinedEventsData[delegator] = { addStake: false, withdrawStake: true, withdrawStakeEvent: withdrawEvent }
    }
  }

  return combinedEventsData
}

// Fetches existing delegators from the database
const fetchExistingDelegators = async (delegatorAddresses: string[]) => {
  const existingDelegators = await Stake.find({
    delegatorAddress: { $in: delegatorAddresses },
    stakeType: DocType.TWO_HRS_RECURRING,
  }).sort({ timestamp: -1 })

  // Reduce the array to a record of delegators
  // eslint-disable-next-line unicorn/no-array-reduce
  return existingDelegators.reduce(
    (acc, delegator) => {
      if (!acc[delegator.delegatorAddress] || acc[delegator.delegatorAddress].timestamp < delegator.timestamp) {
        acc[delegator.delegatorAddress] = delegator
      }

      return acc
    },
    {} as Record<string, any>,
  )
}

// Processes existing delegators with new event data
const processExistingDelegators = (
  existingDelegators: Record<string, any>,
  combinedEventsData: Record<string, any>,
  timestamp: number,
  epoch: number,
  latestStakeSeqNo: number,
  latestWithdrawSeqNo: number,
) => {
  const insertStakeData: DelegatorData[] = []

  for (const [delegatorAddress, delegator] of Object.entries(existingDelegators)) {
    const newStakeData = combinedEventsData[delegatorAddress]
    let totalAdd = delegator.totalAdd || 0
    let totalWithdraw = delegator.totalWithdraw || 0
    let { unstaked } = delegator
    if (newStakeData.addStake) {
      totalAdd += newStakeData.addStakeEvent.delegationAmount
      unstaked = false
    }

    if (newStakeData.withdrawStake) {
      totalWithdraw += newStakeData.withdrawStakeEvent.withdrawAmount
    }

    insertStakeData.push({
      delegatorAddress,
      epoch,
      stakeSeqNo: latestStakeSeqNo,
      timestamp,
      totalAdd,
      totalWithdraw,
      unstaked,
      withdrawSeqNo: latestWithdrawSeqNo,
    })
    delete combinedEventsData[delegatorAddress]
  }

  return insertStakeData
}

// Processes new delegators from event data
const processNewDelegators = (
  combinedEventsData: Record<string, any>,
  timestamp: number,
  epoch: number,
  latestStakeSeqNo: number,
  latestWithdrawSeqNo: number,
) =>
  Object.entries(combinedEventsData).map(([delegator, data]) => ({
    delegatorAddress: delegator,
    epoch,
    stakeSeqNo: latestStakeSeqNo,
    timestamp,
    totalAdd: data.addStake ? data.addStakeEvent.delegationAmount : 0,
    totalWithdraw: data.withdrawStake ? data.withdrawStakeEvent.withdrawAmount : 0,
    unstaked: false,
    withdrawSeqNo: latestWithdrawSeqNo,
  }))

// Processes old stake delegators who have not been updated recently
const processOldStakeDelegators = async (
  delegatorAddresses: string[],
  timestamp: number,
  epoch: number,
  latestStakeSeqNo: number,
  latestWithdrawSeqNo: number,
) => {
  const latestEpochStake = await Stake.findOne({ stakeType: DocType.TWO_HRS_RECURRING, unstaked: false }).sort({
    timestamp: -1,
  })
  if (!latestEpochStake) return []

  const oldStakeDelegators = await Stake.find({
    delegatorAddress: { $nin: delegatorAddresses },
    epoch: latestEpochStake.epoch,
    stakeType: DocType.TWO_HRS_RECURRING,
    unstaked: false,
  }).sort({ timestamp: -1 })

  return oldStakeDelegators.map((delegator) => ({
    delegatorAddress: delegator.delegatorAddress,
    epoch,
    stakeSeqNo: latestStakeSeqNo,
    timestamp,
    totalAdd: delegator.totalAdd,
    totalWithdraw: delegator.totalWithdraw,
    unstaked: delegator.unstaked,
    withdrawSeqNo: latestWithdrawSeqNo,
  }))
}
