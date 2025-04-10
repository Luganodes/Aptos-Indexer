# Aptos Blockchain Indexer

## Overview

The Aptos Blockchain Indexer is a tool designed to fetch, process, and store data from the Aptos blockchain. It primarily focuses on indexing delegator and reward data, which is crucial for understanding the staking and reward dynamics on the Aptos network. The indexer connects to the Aptos blockchain, retrieves the latest epoch data, updates delegator information, calculates rewards, and stores this information in a MongoDB database.

> NOTE: This indexer is pretty space intensive, so it's recommended to prune the database accordingly to ensure heap operations are not affected due to the size of the data being processed after fetching the data from the database.

## Project Structure

The project is organized into several key components:

- **Helpers**: Contains utility functions for processing data, managing network requests, and handling rewards.
- **Models**: Defines the Mongoose schemas for storing data in MongoDB.
- **Utils**: Provides utility functions for logging and database connections.
- **Config**: Contains configuration constants, such as API URLs and cron job timings.

## Key Components

### 1. `index.ts`

This is the main entry point of the application. It initializes the indexer, connects to the database, fetches and processes blockchain data, and schedules regular updates.

- **Database Connection**: Connects to MongoDB to store and retrieve data.
- **Epoch Processing**: Fetches the current epoch and checks if it needs processing.
- **Delegator Update**: Updates the list of delegators for the current epoch.
- **Reward Processing**: Calculates and stores rewards for each delegator.
- **Cron Job**: Schedules the indexer to run at regular intervals.

### 2. `helpers/reward.ts`

Handles the processing of rewards for delegators.

- **USD Price Fetching**: Retrieves the current USD price for Aptos.
- **Stake Data Retrieval**: Gets current stake data for each delegator.
- **Reward Calculation**: Calculates total and pending rewards for each delegator.
- **Database Update**: Updates the reward data in the database.

### 3. `helpers/one-day-data.ts`

Manages the aggregation of one-day data for rewards and stakes.

- **Data Population**: Populates daily records for rewards and stakes.
- **Record Update**: Updates existing records or creates new ones if they don't exist.

### 4. `helpers/delegators.ts`

Updates the list of delegators for a given epoch.

- **Event Processing**: Fetches and processes stake and withdraw events.
- **Delegator Data Update**: Updates existing delegators and processes new ones.

### 5. `helpers/network.ts`

Handles network requests to the Aptos API.

- **Epoch Fetching**: Retrieves the current epoch number.
- **Event Fetching**: Fetches stake and withdraw events from the blockchain.

## RPC Endpoints

The indexer uses the following RPC endpoints from the Aptos API:

1. **Epoch Number**: Fetches the current epoch number.
   - Endpoint: `${APTOS_API_URL}/`

2. **Add Stake Events**: Fetches add stake events from the Aptos API.
   - Endpoint: `${APTOS_API_URL}/accounts/${APTOS_STAKE_POOL_ADD}/events/0x1::delegation_pool::DelegationPool/add_stake_events`
   - Parameters: 
     - `limit`: Number of events to fetch (default is 50).
     - `start`: Starting sequence number for fetching events.

3. **Withdraw Stake Events**: Fetches withdraw stake events from the Aptos API.
   - Endpoint: `${APTOS_API_URL}/accounts/${APTOS_STAKE_POOL_ADD}/events/0x1::delegation_pool::DelegationPool/withdraw_stake_events`
   - Parameters: 
     - `limit`: Number of events to fetch (default is 50).
     - `start`: Starting sequence number for fetching events.

4. **Current Stake Data**: Fetches the current stake data for a specific delegator.
   - Endpoint: `${APTOS_API_URL}/view`
   - Request Body:
     - `arguments`: An array containing the stake pool address and the delegator address.
     - `function`: The function to call, e.g., `0x1::delegation_pool::get_stake`.
     - `type_arguments`: An empty array.

5. **Transaction by Version**: Fetches transaction details by version number.
   - Endpoint: `${APTOS_API_URL}/transactions/by_version/${version}`
   - Parameters:
     - `version`: The version number of the transaction to fetch.

## How the Indexer Works

1. **Initialization**: The indexer starts by connecting to the MongoDB database and fetching the current epoch number from the Aptos blockchain.

2. **Epoch Check**: It checks if the current epoch is greater than the last processed epoch. If so, it proceeds to process the new epoch.

3. **Delegator Update**: The indexer updates the list of delegators by fetching and processing stake and withdraw events. It combines these events to update existing delegators and process new ones.

4. **Reward Processing**: For each delegator, the indexer calculates the total and pending rewards based on their stake data. It updates the reward data in the database and accumulates the validator reward value.

5. **One-Day Data Population**: The indexer populates one-day data for rewards and stakes, updating existing records or creating new ones as needed.

6. **Scheduled Execution**: The indexer is scheduled to run at regular intervals defined by the `CRON_TIME` constant, ensuring that the data is kept up-to-date with the blockchain.

## Configuration

The project uses environment variables for configuration, which are loaded using the `dotenv` package. Key configuration constants include:

- **APTOS_API_URL**: The URL of the Aptos API.
- **MONGODB_URI**: The URI of the MongoDB database.
- **CRON_TIME**: The cron schedule for running the indexer.
- **NODE_ENV**: The environment in which the indexer is running.
- **APTOS_STAKE_POOL_ADD**: The address of the stake pool.

### Sample `.env` File

Create a `.env` file in the root directory of the project with the following content:

```
APTOS_API_URL=https://fullnode.mainnet.aptoslabs.com/v1
APTOS_STAKE_POOL_ADD=your_aptos_stake_pool_address
MONGODB_URI=mongodb://localhost:27017/aptos-indexer
CRON_TIME=*/30 * * * *
NODE_ENV=development
```

## Running the Project

### Using pnpm

1. **Install Dependencies**: Run `pnpm install` to install the required packages.

2. **Build the Project**: Use `pnpm run build` to compile the TypeScript code.

3. **Start the Indexer**: Use `pnpm start` to run the indexer. For development, use `pnpm run start:dev`.

4. **Environment Variables**: Ensure that the necessary environment variables are set in a `.env` file or in your environment.

### Using Docker

1. **Build the Docker Image**: Run the following command to build the Docker image:
   ```bash
   docker build -t aptos-indexer .
   ```

2. **Run the Docker Container**: Use the following command to run the Docker container, ensuring the `.env` file is used:
   ```bash
   docker run -d --name aptos-indexer --env-file .env aptos-indexer
   ```

### Using Docker Compose

1. **Create a `docker-compose.yml` File**: Add the following content to a `docker-compose.yml` file in the root directory:

   ```yaml
   version: '3.8'
   services:
     aptos-indexer:
       build: .
       env_file:
         - .env
       ports:
         - "3000:3000" # Adjust the port as needed
       restart: unless-stopped
   ```

2. **Start the Services**: Run the following command to start the services defined in the `docker-compose.yml` file:
   ```bash
   docker-compose up -d
   ```

3. **Stop the Services**: To stop the services, use:
   ```bash
   docker-compose down
   ```

## Flow Diagram

Below is a flow diagram illustrating the detailed process of the indexer:

![Flow Diagram](https://i.imgur.com/yZWQT8J.png)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
