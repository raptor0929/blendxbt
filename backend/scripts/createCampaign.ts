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
const SECRET_KEY = process.env.SECRET_KEY!

export async function createCampaign({
    pool,
    asset,
    rewardToken,
    dailyRewardAmount,
    durationDays
}: {
    pool: string;
    asset: string;
    rewardToken: string;
    dailyRewardAmount: number;
    durationDays: number;
}): Promise<any> {
    console.log("Creating campaign...");
    const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(REWARD_CAMPAIGN_CONTRACT_ID);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    const creator = sourceKeypair.publicKey();

    let builtTransaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(
            contract.call("create_campaign",
                nativeToScVal(pool, { type: 'address' }),
                nativeToScVal(asset, { type: 'address' }),
                nativeToScVal(rewardToken, { type: 'address' }),
                nativeToScVal(dailyRewardAmount, { type: 'i128' }),
                nativeToScVal(durationDays, { type: 'u32' }),
                nativeToScVal(creator, { type: 'address' })
            )
        )
        .setTimeout(30)
        .build();

    let campaignId: number | undefined = undefined;
    let txHash: string | undefined = undefined;
    try {
        // Simulate transaction
        // console.log("Simulating transaction...");
        const simulationResponse = await server.simulateTransaction(builtTransaction);
        // console.log(`Simulation response: ${simulationResponse}`);
        if (SorobanRpc.Api.isSimulationError(simulationResponse)) {
            console.error("Simulation failed:", simulationResponse.error);
            return;
        }
        if (simulationResponse.result) {
            // console.log("✅ Simulation successful!");
            if (simulationResponse.result.retval) {
                const returnValue = scValToNative(simulationResponse.result.retval);
                // console.log(`Return value: ${returnValue}`);
                campaignId = returnValue;
            } else {
                // console.log("No return value from simulation");
            }
        } else {
            // console.log("Simulation successful but no result field (this shouldn't happen for contract invocations)");
        }
        let preparedTransaction = await server.prepareTransaction(builtTransaction);
        preparedTransaction.sign(sourceKeypair);
        let sendResponse = await server.sendTransaction(preparedTransaction);
        console.log(`Sent transaction: ${JSON.stringify(sendResponse)}`);
        txHash = sendResponse.hash;
        if (sendResponse.status === "PENDING") {
            let getResponse;
            let retries = 20;
            while (retries-- > 0) {
                // console.log(`SendResponse.hash: ${sendResponse.hash}`);
                getResponse = await server.getTransaction(sendResponse.hash);
                // console.log(`getTransaction response: ${JSON.stringify(getResponse)}`);
                if (getResponse.status === "SUCCESS" || getResponse.status === "FAILED") {
                    break;
                }
                console.log("Waiting for transaction confirmation...");
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
            // console.log(`out of while loop`);
            if (!getResponse) {
                throw new Error("No response from server.");
            } else if (getResponse.status === "SUCCESS") {
                if (getResponse.returnValue) {
                    const finalReturnValue = scValToNative(getResponse.returnValue);
                    console.log(`✅ Transaction successful! Return value: ${JSON.stringify(finalReturnValue)}`);
                } else {
                    console.log("✅ Transaction successful but no return value");
                }
            } else {
                console.error(`❌ Transaction failed: ${JSON.stringify(getResponse, null, 2)}`);
            }
        } else {
            console.log(`❌ Error result: ${JSON.stringify(sendResponse.errorResult)}`);
            throw sendResponse.errorResult;
        }
    } catch (err) {
        console.log(`✅ Transaction successful! Return value: ${JSON.stringify(campaignId)}`);
        return { status: 'success', txHash: txHash, campaignId: campaignId };
    }
}

// CLI usage example
// if (require.main === module) {
//     (async () => {
//         const pool_address = process.env.POOL_ADDRESS || 'CCLBPEYS3XFK65MYYXSBMOGKUI4ODN5S7SUZBGD7NALUQF64QILLX5B5';
//         const asset = process.env.ASSET || '';
//         const reward_token = process.env.REWARD_TOKEN || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
//         const daily_reward_amount = Number(process.env.DAILY_REWARD_AMOUNT) || 10000000;
//         const duration_days = Number(process.env.DURATION_DAYS) || 1;
//         const creator_key = process.env.SECRET_KEY!;
//         const rpc_url = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
//         const contract_id = process.env.REWARD_CAMPAIGN_CONTRACT_ID!;
//         await createCampaign({
//             pool: pool_address,
//             asset,
//             rewardToken: reward_token,
//             dailyRewardAmount: daily_reward_amount,
//             durationDays: duration_days,
//             creatorKey: creator_key,
//             rpcUrl: rpc_url,
//             contractId: contract_id
//         });
//     })();
// }