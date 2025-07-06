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

const REWARD_CAMPAIGN_CONTRACT_ID = process.env.REWARD_CAMPAIGN_CONTRACT_ID!;
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const SECRET_KEY = process.env.USER_SECRET_KEY!;

export async function claimRewards({ campaignId }: { campaignId: number }): Promise<any> {
  const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
  const user = sourceKeypair.publicKey();
  console.log(`User: ${user}`);
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
        nativeToScVal(campaignId, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  let txHash: string | undefined = undefined;
  let rewardAmount: number | undefined = undefined;

  const simulationResponse = await server.simulateTransaction(builtTransaction);
  console.log(`Simulation response: ${simulationResponse}`);
  if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
      console.error("Simulation failed:", simulationResponse.error);
      return;
  }
  if (simulationResponse.result) {
      console.log("✅ Simulation successful!");
      if (simulationResponse.result.retval) {
          const returnValue = scValToNative(simulationResponse.result.retval);
          console.log(`Return value: ${returnValue}`);
          rewardAmount = Number(returnValue);
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
    txHash = sendResponse.hash;
    if (sendResponse.status === "PENDING") {
      let getResponse;
      let retries = 20;
      while (retries-- > 0) {
        getResponse = await server.getTransaction(sendResponse.hash);
        if (getResponse.status && getResponse.status !== "NOT_FOUND") break;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s interval
      }
      if (!getResponse) {
        throw new Error("No response from server.");
      } else if (getResponse.status === "SUCCESS") {
        console.log(`Transaction successful: ${sendResponse.hash}`);
      } else {
        throw new Error(getResponse.status);
      }
    } else {
      throw sendResponse.errorResult;
    }
  } catch (err) {
    return { status: 'success', txHash: txHash, rewardAmount: rewardAmount };
  }
} 