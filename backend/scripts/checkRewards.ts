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

export async function getUserRewards({ campaignId }: { campaignId: number }): Promise<any> {
  const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
  const user = sourceKeypair.publicKey();
  const server = new SorobanRpc.Server(RPC_URL);
  const contract = new Contract(REWARD_CAMPAIGN_CONTRACT_ID);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  let builtTransaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call("get_user_rewards",
        nativeToScVal(user, { type: 'address' }),
        nativeToScVal(campaignId, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  // Simulate the transaction
  const simulationResponse = await server.simulateTransaction(builtTransaction);
  if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
    throw new Error("Simulation failed: " + simulationResponse.error);
  }

  // Extract and return the result value
  if (simulationResponse.result && simulationResponse.result.retval) {
    return scValToNative(simulationResponse.result.retval);
  } else {
    throw new Error("No return value from get_user_rewards simulation");
  }
}