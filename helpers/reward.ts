import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

import logger from '../utils/logger'
import { APTOS_STAKE_POOL_ADD } from '../config/constants'
import Reward from '../models/reward'
import ValidatorReward from '../models/validator-reward'
import { DocType } from '../types'
import { getAptosUSDPrice, getCurrentStakeData } from './data'
import { populateOneDayData } from './one-day-data'

const config = new AptosConfig({ network: Network.MAINNET })
const client = new Aptos(config)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processRewards(epoch: number, delegatorList: any[], timestamp: number) {
  // Fetch the current USD price for Aptos
  const usd = await getAptosUSDPrice(timestamp)
  logger.info(`Getting USD Price for Reward Data: ${usd}`)
  let validatorRewardValue = 0
  logger.info(`Processing Rewards for Each Delegator: ${epoch}`)
  for (const delegator of delegatorList) {
    // Get current stake data for the delegator
    const { active, inactive, pendingInactive } = await getCurrentStakeData(delegator.delegatorAddress)
    let delegatorUnstaked = false

    // Determine if the delegator is unstaked
    if (active + pendingInactive === 0) {
      delegatorUnstaked = true
    }

    // Update delegator object with stake data and USD price
    Object.assign(delegator, {
      activeStake: active,
      inactiveStake: inactive,
      pendingInactiveStake: pendingInactive,
      unstaked: delegatorUnstaked,
      usd,
    })

    // Save the updated delegator data
    await delegator.save()

    // Calculate total and pending rewards
    const sumOfStakes = active + pendingInactive + inactive
    const totalReward = sumOfStakes - delegator.totalAdd + delegator.totalWithdraw
    let pendingReward = sumOfStakes

    if (delegator.totalAdd >= delegator.totalWithdraw) {
      pendingReward -= delegator.totalAdd - delegator.totalWithdraw
    }

    // Fetch the previous reward object for the delegator
    const prevRewardObj = await Reward.findOne({
      delegatorAddress: delegator.delegatorAddress,
      rewardType: DocType.TWO_HRS_RECURRING,
    })
      .sort({ timestamp: -1 })
      .exec()

    // Calculate the reward for the current epoch
    let reward = totalReward
    if (prevRewardObj) {
      reward -= prevRewardObj.totalReward
    }

    const totalStaked = active + pendingInactive

    // Create reward data object
    const rewardData = {
      delegatorAddress: delegator.delegatorAddress,
      epoch,
      pendingReward,
      reward,
      rewardType: DocType.TWO_HRS_RECURRING,
      timestamp,
      totalReward,
      totalStaked,
      usd,
    }
    logger.info(`${delegator.delegatorAddress}: ${reward}, ${totalStaked}`)
    const rewardObject = await Reward.create(rewardData)

    // Accumulate validator reward value
    validatorRewardValue += reward
    // Populate one-day data for the reward
    populateOneDayData(rewardObject, delegator, epoch)
  }

  logger.info(`Validator Reward Value: ${validatorRewardValue}`)
  // Fetch the total staked amount from the stake pool resource
  const stakePoolResource = await client.getAccountResource({
    accountAddress: APTOS_STAKE_POOL_ADD,
    resourceType: '0x1::stake::StakePool',
  })

  const totalStaked = stakePoolResource.active.value
  logger.info(`Total Staked: ${totalStaked}`)
  logger.info(
    `Aggregating and storing Validator Reward, Staked Amount: ${validatorRewardValue}, ${totalStaked}, ${timestamp}`,
  )
  // Create a validator reward entry in the database
  await ValidatorReward.create({
    epoch,
    reward: validatorRewardValue,
    rewardType: DocType.TWO_HRS_RECURRING,
    timestamp,
    totalStaked,
    usd,
  })
}

export { processRewards }
