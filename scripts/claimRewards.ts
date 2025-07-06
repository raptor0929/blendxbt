import {
  Keypair,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const REWARD_CAMPAIGN_CONTRACT_ID = process.env.REWARD_CAMPAIGN_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const SECRET_KEY = process.env.USER_SECRET_KEY || 'YOUR_SECRET_KEY_HERE';

// Sample arguments
const user = 'GDDPTHEUN2BPZGZZXLU77YRQA6M5YT4ESXRNRZTA6Y72IRCPOQK4GFAF'
const campaign_id = 1;

(async () => {
  const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
  const server = new SorobanRpc.Server(RPC_URL);
  const contract = new Contract(REWARD_CAMPAIGN_CONTRACT_ID);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  let builtTransaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call("claim_rewards",
        nativeToScVal(user, { type: 'address' }),
        nativeToScVal(campaign_id, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  // First, simulate the transaction to check if it will succeed
  console.log("Simulating transaction...");
  const simulationResponse = await server.simulateTransaction(builtTransaction);
  console.log(`Simulation response: ${simulationResponse}`);
  
  // Proper type checking for simulation response
  if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
      console.error("Simulation failed:", simulationResponse.error);
      return;
  }

  // Check if it's a successful simulation with result
  if (simulationResponse.result) {
      console.log("✅ Simulation successful!");
      
      // Extract return value if present
      if (simulationResponse.result.retval) {
          const returnValue = scValToNative(simulationResponse.result.retval);
          console.log(`Return value: ${returnValue}`);
      } else {
          console.log("No return value from simulation");
      }
  } else {
      console.log("Simulation successful but no result field (this shouldn't happen for contract invocations)");
  }

  let preparedTransaction = await server.prepareTransaction(builtTransaction);
  preparedTransaction.sign(sourceKeypair);

  try {
    let sendResponse = await server.sendTransaction(preparedTransaction);
    console.log(`SendResponse.hash: ${sendResponse}`);

    if (sendResponse.status === "PENDING") {
      let getResponse;
      let retries = 20;

      while (retries-- > 0) {
        getResponse = await server.getTransaction(sendResponse.hash);
        if (getResponse.status && getResponse.status !== "NOT_FOUND") break;
        console.log("Waiting for transaction confirmation...");
        await new Promise((resolve) => setTimeout(resolve, 20000)); // 2s interval
      }

      if (!getResponse) {
        throw new Error("No response from server.");
      } else if (getResponse.status === "SUCCESS") {
        console.log(`Transaction result: ${getResponse.returnValue?.value?.() ?? "No return value"}`);
      } else {
        console.error(`Transaction failed: ${getResponse}`);
      }
    } else {
      throw sendResponse.errorResult;
    }
  } catch (err) {
    console.log("Sending transaction failed");
    console.log(`Error result: ${err}`);
  }
})(); 