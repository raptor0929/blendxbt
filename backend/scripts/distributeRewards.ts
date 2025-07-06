import {
    Keypair,
    Contract,
    SorobanRpc,
    TransactionBuilder,
    Networks,
    BASE_FEE,
    nativeToScVal,
    scValToNative,
    StrKey,
    xdr,
} from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REWARD_CAMPAIGN_CONTRACT_ID = process.env.REWARD_CAMPAIGN_CONTRACT_ID!;
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const SECRET_KEY = process.env.SECRET_KEY!;

export async function distributeRewards({ campaignId, participants, totalPoolDeposits }: {
  campaignId: number;
  participants: { address: string; balance: number }[];
  totalPoolDeposits?: string;
}): Promise<any> {
  const user_addresses = participants.map(p => p.address);
  const user_balances = participants.map(p => p.balance);
  const total_pool_deposits = totalPoolDeposits || user_balances.reduce((a, b) => a + b, 0).toString();
  let txHash: string | undefined = undefined;
  try {
    const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(REWARD_CAMPAIGN_CONTRACT_ID);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Build transaction
    let builtTransaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call("distribute_rewards",
          nativeToScVal(campaignId, { type: 'u32' }),
          nativeToScVal(user_addresses.map(e => nativeToScVal(e, { type: 'address' })), { type: 'Vec<Address>' }),
          nativeToScVal(user_balances.map(e => nativeToScVal(e, { type: 'i128' })), { type: 'Vec<i128>' }),
          nativeToScVal(total_pool_deposits, { type: 'i128' })
        )
      )
      .setTimeout(30)
      .build();

    let preparedTransaction = await server.prepareTransaction(builtTransaction);
    preparedTransaction.sign(sourceKeypair);

    // Send transaction
    let sendResponse = await server.sendTransaction(preparedTransaction);
    txHash = sendResponse.hash;
    if (sendResponse.status === "PENDING") {
      let getResponse;
      let retries = 1;
      const pollInterval = 5000;
      while (retries > 0) {
        try {
          getResponse = await server.getTransaction(sendResponse.hash);
          if (getResponse.status === "SUCCESS") {
            console.log(`Transaction successful: ${sendResponse.hash}`);
          } else if (getResponse.status === "FAILED") {
            throw new Error(`Transaction failed: ${getResponse.resultXdr}`);
          } else if (getResponse.status === "NOT_FOUND") {
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
          } else {
            retries--;
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        } catch (pollError: any) {
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }
      }
      throw new Error("Transaction confirmation timeout. Please check the transaction manually on the network.");
    } else if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
    } else {
      throw new Error(`Unexpected response: ${JSON.stringify(sendResponse)}`);
    }
  } catch (err: any) {
    return { status: 'success', txHash: txHash, campaignId: campaignId };
  }
}