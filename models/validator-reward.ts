import mongoose, {Document, Schema} from 'mongoose'

export enum DocType {
  DAILY_RECURRING = 'DAILY_RECURRING',
  TWO_HRS_RECURRING = 'TWO_HRS_RECURRING',
}

export interface IValidatorReward extends Document {
  epoch: number
  reward: number
  rewardType: DocType
  timestamp: number
  totalStaked: number
  usd: null | number
}

const validatorRewardSchema = new Schema<IValidatorReward>({
  epoch: {
    required: true,
    type: Number,
  },
  reward: {
    required: true,
    type: Number,
  },
  rewardType: {
    default: DocType.TWO_HRS_RECURRING,
    enum: Object.values(DocType),
    type: String,
  },
  timestamp: {
    required: true,
    type: Number,
  },
  totalStaked: {
    required: true,
    type: Number,
  },
  usd: {
    default: null,
    type: Number,
  },
})

const ValidatorReward = mongoose.connection
  .useDb('aptos-indexer')
  .model<IValidatorReward>('validator-reward', validatorRewardSchema)

export default ValidatorReward
