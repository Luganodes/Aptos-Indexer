import logger from './utils/logger'
import { updateDelegatorList } from './helpers/delegators'
import { getLastProcessedEpoch } from './helpers/last-processd-epoch'
import { fetchEpochNumber } from './helpers/network'
import { processRewards } from './helpers/reward'
import { connectToDatabase, disconnectFromDatabase } from './utils/db'
import cron from 'node-cron'
import { CRON_TIME } from './config/constants'

// This function fetches and processes Aptos blockchain data.
export async function fetchAptosData(): Promise<void> {
  try {
    // Connect to the MongoDB database.
    await connectToDatabase()

    // Fetch the current epoch number from the Aptos blockchain.
    const currentEpoch: number = await fetchEpochNumber()

    // Retrieve the last processed epoch from the database.
    const lastProcessedEpoch = await getLastProcessedEpoch()

    // Check if the current epoch is greater than the last processed epoch.
    if (currentEpoch > lastProcessedEpoch) {
      logger.info(`Processing new epoch ${currentEpoch}. Last processed epoch was ${lastProcessedEpoch}`)

      // Update the list of delegators for the current epoch.
      const { delegators, timestamp } = await updateDelegatorList(currentEpoch)
      logger.info('List of delegators updated')

      // Process rewards for the current epoch using the updated delegator list.
      await processRewards(currentEpoch, delegators, timestamp)
      logger.info(`Completed Running Aptos Indexer for epoch: ${currentEpoch}`)
    } else {
      // Log a message if the current epoch has already been processed.
      logger.info(
        `Skipping indexer run - current epoch ${currentEpoch} is not greater than last processed epoch ${lastProcessedEpoch}`,
      )
    }
  } catch (error) {
    // Log any errors that occur during the data fetching process.
    logger.error(`Error fetching Aptos data: ${error}`)
  } finally {
    // Disconnect from the database after processing.
    await disconnectFromDatabase()
  }
}

// Run the indexer immediately upon start
(async () => {
  try {
    // Execute the fetchAptosData function immediately.
    await fetchAptosData()
    logger.info('Initial indexer run completed successfully.')
  } catch (error) {
    // Log any errors that occur during the initial run.
    logger.error(`Error during initial indexer run: ${error}`)
  }
})()

// Schedule the indexer to run according to the cron job
cron.schedule(CRON_TIME, async () => {
  logger.info(`Running the indexer (${CRON_TIME})`)
  try {
    // Execute the fetchAptosData function according to the cron schedule.
    await fetchAptosData()
    logger.info('Indexer run completed successfully.')
  } catch (error) {
    // Log any errors that occur during the scheduled runs.
    logger.error(`Error during indexer run: ${error}`)
  }
})
