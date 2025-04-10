import ValidatorReward from '../models/validator-reward'

export const getLastProcessedEpoch = async function (): Promise<number> {
  const lastReward = await ValidatorReward.findOne().sort({epoch: -1})
  return lastReward?.epoch ?? 0
}
