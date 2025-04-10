import mongoose, {Document, Schema} from 'mongoose'

export interface ITransaction extends Document {
  amount: number
  delegatorAddress: string
  fee: number
  timestamp: number
  transactionHash: string
  type: 'STAKE' | 'WITHDRAW'
  usd: null | number
}

const transactionSchema: Schema = new Schema(
  {
    amount: {
      required: true,
      type: Number,
    },
    delegatorAddress: {
      index: true,
      required: true,
      type: String,
    },
    fee: {
      required: true,
      type: Number,
    },
    timestamp: {
      index: true,
      required: true,
      type: Number,
    },
    transactionHash: {
      required: true,
      type: String,
      unique: true,
    },
    type: {
      enum: ['WITHDRAW', 'STAKE'],
      required: true,
      type: String,
    },
    usd: {
      default: null,
      type: Number,
    },
  },
  {
    timestamps: true,
  },
)

const Transaction = mongoose.connection.useDb('aptos-indexer').model<ITransaction>('Transaction', transactionSchema)

export default Transaction
