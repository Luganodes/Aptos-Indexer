import mongoose, {Document, Schema} from 'mongoose'

export enum DocType {
  DAILY_RECURRING = 'DAILY_RECURRING',
  TWO_HRS_RECURRING = 'TWO_HRS_RECURRING',
}

interface IReward extends Document {
  delegatorAddress: string
  epoch: number
  pendingReward: number
  reward: number
  rewardType: DocType
  timestamp: number
  totalReward: number
  totalStaked: number
  usd: null | number
}

const rewardSchema = new Schema<IReward>({
  delegatorAddress: {
    required: true,
    type: String,
  },
  epoch: {
    required: true,
    type: Number,
  },
  pendingReward: {
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
  totalReward: {
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

const Reward = mongoose.connection.useDb('aptos-indexer').model<IReward>('reward', rewardSchema)

export default Reward
