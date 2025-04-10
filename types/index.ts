export interface AptosLedgerInfo {
  block_height: string
  chain_id: number
  epoch: string
  git_hash: string
  ledger_timestamp: string
  ledger_version: string
  node_role: string
  oldest_block_height: string
  oldest_ledger_version: string
}

interface EventGuid {
  account_address: string
  creation_number: string
}

export interface AddStakeEvent {
  data: {
    add_stake_fee: string
    amount_added: string
    delegator_address: string
    pool_address: string
  }
  guid: EventGuid
  sequence_number: string
  type: string
  version: string
}

export interface WithdrawStakeEvent {
  data: {
    amount_withdrawn: string
    delegator_address: string
    pool_address: string
  }
  guid: EventGuid
  sequence_number: string
  type: string
  version: string
}

export interface DelegatorStake {
  delegationAmount: number
  sequenceNo: number
  version: string
}

export interface ProcessedStakeEvents {
  delegatorStakes: Record<string, DelegatorStake>
  latestProcessedSeqNo: number
}

// Add these new interfaces
export interface DelegatorWithdraw {
  sequenceNo: number
  version: string
  withdrawAmount: number
}

export interface ProcessedWithdrawEvents {
  delegatorWithdraws: Record<string, DelegatorWithdraw>
  latestProcessedSeqNo: number
}

// Define an interface for the Stake document
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
  usd: number
  withdrawSeqNo: number
}

// Define the enum for stake types
export enum DocType {
  DAILY_RECURRING = 'DAILY_RECURRING',
  TWO_HRS_RECURRING = 'TWO_HRS_RECURRING',
}

export interface DelegatorData {
  delegatorAddress: string
  epoch: number
  stakeSeqNo: number
  timestamp: number
  totalAdd: number
  totalWithdraw: number
  unstaked: boolean
  withdrawSeqNo: number
}

// Interface for combined event data
export interface DelegatorEventData {
  hasStakeEvent: boolean
  hasWithdrawEvent: boolean
  stakeEvent?: AddStakeEvent
  withdrawEvent?: WithdrawStakeEvent
}

export interface IReward extends Document {
  delegatorAddress: string
  pendingReward: number
  reward: number
  rewardType: DocType
  timestamp: number
  totalReward: number
  totalStaked: number
  usd: number
}

export interface StakeData {
  active: number
  inactive: number
  pendingInactive: number
}

export interface IValidatorReward extends Document {
  epoch: number
  reward: number
  rewardType: DocType
  timestamp: number
  totalStaked: number
  usd: number
}

export interface EventData {
  data: {
    amount_added?: string
    amount_withdrawn?: string
    delegator_address: string
  }
  version: string
}

export interface TransactionData {
  gas_unit_price: string
  gas_used: string
  hash: string
  timestamp: string
}

export interface ITransaction extends Document {
  amount: number
  delegatorAddress: string
  fee: number
  timestamp: number
  transactionHash: string
  type: 'STAKE' | 'WITHDRAW'
  usd: number
}
