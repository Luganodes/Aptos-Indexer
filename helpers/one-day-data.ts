import Reward from '../models/reward'
import Stake from '../models/stake'
import { DocType } from '../types'

// Populates one-day data for rewards and stakes
export const populateOneDayData = async (rewardObj: any, stakeObj: any, epoch: number) => {
  const date = get12AMDateOfGivenTimestamp(rewardObj.timestamp)
  const timestamp = date.getTime()

  // Fetch existing one-day reward and stake records
  const [oneDayReward, oneDayStake] = await Promise.all([
    Reward.findOne({
      delegatorAddress: rewardObj.delegatorAddress,
      rewardType: DocType.DAILY_RECURRING,
      timestamp,
    }),
    Stake.findOne({
      delegatorAddress: stakeObj.delegatorAddress,
      stakeType: DocType.DAILY_RECURRING,
      timestamp,
    }),
  ])

  if (oneDayReward && oneDayStake) {
    // Update existing records
    Object.assign(oneDayReward, {
      epoch,
      pendingReward: rewardObj.pendingReward,
      reward: oneDayReward.reward + rewardObj.reward,
      totalReward: rewardObj.totalReward,
      totalStaked: rewardObj.totalStaked,
    })

    Object.assign(oneDayStake, {
      activeStake: stakeObj.activeStake,
      epoch,
      inactiveStake: stakeObj.inactiveStake,
      pendingInactiveStake: stakeObj.pendingInactiveStake,
      stakeSeqNo: stakeObj.stakeSeqNo,
      totalAdd: stakeObj.totalAdd,
      totalWithdraw: stakeObj.totalWithdraw,
      unstaked: stakeObj.unstaked,
      withdrawSeqNo: stakeObj.withdrawSeqNo,
    })

    await Promise.all([oneDayReward.save(), oneDayStake.save()])
  } else {
    // Create new records
    await Promise.all([
      Reward.create({
        delegatorAddress: rewardObj.delegatorAddress,
        epoch,
        pendingReward: rewardObj.pendingReward,
        reward: rewardObj.reward,
        rewardType: DocType.DAILY_RECURRING,
        timestamp,
        totalReward: rewardObj.totalReward,
        totalStaked: rewardObj.totalStaked,
        usd: rewardObj.usd,
      }),
      Stake.create({
        activeStake: stakeObj.activeStake,
        delegatorAddress: stakeObj.delegatorAddress,
        epoch,
        inactiveStake: stakeObj.inactiveStake,
        pendingInactiveStake: stakeObj.pendingInactiveStake,
        stakeSeqNo: stakeObj.stakeSeqNo,
        stakeType: DocType.DAILY_RECURRING,
        timestamp,
        totalAdd: stakeObj.totalAdd,
        totalWithdraw: stakeObj.totalWithdraw,
        unstaked: stakeObj.unstaked,
        usd: stakeObj.usd,
        withdrawSeqNo: stakeObj.withdrawSeqNo,
      }),
    ])
  }
}

const get12AMDateOfGivenTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setUTCHours(0, 0, 0, 0)
  return date
}
