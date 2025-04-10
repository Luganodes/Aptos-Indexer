import mongoose, {Document, Schema} from 'mongoose'

export enum DocType {
  DAILY_RECURRING = 'DAILY_RECURRING',
  TWO_HRS_RECURRING = 'TWO_HRS_RECURRING',
}

export interface IStake extends Document {
  activeStake: number
  delegatorAddress: string
  epoch: number
  inactiveStake: number
  pendingInactiveStake: number
  stakeSeqNo: number
  stakeType: string
  timestamp: number
  totalAdd: number
  totalWithdraw: number
  unstaked: boolean
  usd: null | number
  withdrawSeqNo: number
}

const stakeSchema = new Schema<IStake>({
  activeStake: {
    default: 0,
    type: Number,
  },
  delegatorAddress: {
    required: true,
    type: String,
  },
  epoch: {
    required: true,
    type: Number,
  },
  inactiveStake: {
    default: 0,
    type: Number,
  },
  pendingInactiveStake: {
    default: 0,
    type: Number,
  },
  stakeSeqNo: {
    default: 0,
    type: Number,
  },
  stakeType: {
    default: DocType.TWO_HRS_RECURRING,
    enum: Object.values(DocType),
    type: String,
  },
  timestamp: {
    required: true,
    type: Number,
  },
  totalAdd: {
    required: true,
    type: Number,
  },
  totalWithdraw: {
    required: true,
    type: Number,
  },
  unstaked: {
    default: false,
    type: Boolean,
  },
  usd: {
    default: null,
    type: Number,
  },
  withdrawSeqNo: {
    default: 0,
    type: Number,
  },
})

const Stake = mongoose.connection.useDb('aptos-indexer').model<IStake>('stake', stakeSchema)

export default Stake
