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

const REWARD_CAMPAIGN_CONTRACT_ID = process.env.REWARD_CAMPAIGN_CONTRACT_ID || 'YOUR_CONTRACT_ID_HERE';
const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const SECRET_KEY = process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE';

// Sample arguments
const campaign_id = 1;
const user_addresses = [
    'GDDPTHEUN2BPZGZZXLU77YRQA6M5YT4ESXRNRZTA6Y72IRCPOQK4GFAF',
];
const user_balances = [10000000];
const total_pool_deposits = '10000000';

(async () => {
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
                    nativeToScVal(campaign_id, { type: 'u32' }),
                    nativeToScVal(user_addresses.map(e => nativeToScVal(e, { type: 'address' })), { type: 'Vec<Address>' }),
                    nativeToScVal(user_balances.map(e => nativeToScVal(e, { type: 'i128' })), { type: 'Vec<i128>' }),
                    nativeToScVal(total_pool_deposits, { type: 'i128' })
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

        // Send transaction
        let sendResponse = await server.sendTransaction(preparedTransaction);
        console.log(`Sent transaction: ${JSON.stringify(sendResponse)}`);

        if (sendResponse.status === "PENDING") {
            console.log(`Transaction hash: ${sendResponse.hash}`);
            
            // Poll for transaction result
            let getResponse;
            let retries = 20;
            const pollInterval = 5000; // 5 seconds

            while (retries > 0) {
                console.log(`Checking transaction status (${21 - retries}/20)...`);
                
                try {
                    getResponse = await server.getTransaction(sendResponse.hash);
                    console.log(`Status: ${getResponse.status}`);
                    
                    if (getResponse.status === "SUCCESS") {
                        console.log("✅ Transaction successful!");
                        console.log(`Transaction result: ${getResponse.returnValue?.value?.() ?? "No return value"}`);
                        console.log("Rewards distributed successfully!");
                        return; // Exit successfully
                    } else if (getResponse.status === "FAILED") {
                        console.error("❌ Transaction failed!");
                        console.error(`Error details: ${JSON.stringify(getResponse, null, 2)}`);
                        throw new Error(`Transaction failed: ${getResponse.resultXdr}`);
                    } else if (getResponse.status === "NOT_FOUND") {
                        console.log("⏳ Transaction still processing...");
                        retries--;
                        
                        if (retries > 0) {
                            console.log(`Waiting ${pollInterval/1000}s before next check...`);
                            await new Promise((resolve) => setTimeout(resolve, pollInterval));
                        }
                    } else {
                        console.log(`Unknown status: ${getResponse.status}`);
                        retries--;
                        await new Promise((resolve) => setTimeout(resolve, pollInterval));
                    }
                } catch (pollError: any) {
                    console.error(`Error polling transaction: ${pollError.message}`);
                    retries--;
                    if (retries > 0) {
                        await new Promise((resolve) => setTimeout(resolve, pollInterval));
                    }
                }
            }

            // If we get here, we ran out of retries
            throw new Error("Transaction confirmation timeout. Please check the transaction manually on the network.");
            
        } else if (sendResponse.status === "ERROR") {
            console.error(`Transaction submission error: ${JSON.stringify(sendResponse.errorResult)}`);
            throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
        } else {
            console.error(`Unexpected response status: ${sendResponse.status}`);
            throw new Error(`Unexpected response: ${JSON.stringify(sendResponse)}`);
        }
        
    } catch (err: any) {
        console.error("❌ Transaction failed:");
        console.error(err.message || err);
        
        // Print full error details if available
        if (err.response) {
            console.error("Full error response:", JSON.stringify(err.response, null, 2));
        }
        
        process.exit(1);
    }
})();