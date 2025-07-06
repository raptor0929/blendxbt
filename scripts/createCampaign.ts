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
    const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
    const server = new SorobanRpc.Server(RPC_URL);
    const contract = new Contract(REWARD_CAMPAIGN_CONTRACT_ID);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Fix the vector conversion - you were double-converting
    let builtTransaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(
            contract.call("distribute_rewards",
                nativeToScVal(campaign_id, { type: 'u32' }),
                nativeToScVal(user_addresses, { type: 'Vec<Address>' }),
                nativeToScVal(user_balances, { type: 'Vec<i128>' }),
                nativeToScVal(total_pool_deposits, { type: 'i128' })
            )
        )
        .setTimeout(30)
        .build();

    try {
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

        let sendResponse = await server.sendTransaction(preparedTransaction);
        console.log(`Sent transaction: ${JSON.stringify(sendResponse)}`);

        if (sendResponse.status === "PENDING") {
            let getResponse;
            let retries = 20;

            while (retries-- > 0) {
                console.log(`SendResponse.hash: ${sendResponse.hash}`);
                getResponse = await server.getTransaction(sendResponse.hash);
                console.log(`getTransaction response: ${JSON.stringify(getResponse)}`);
                
                // Break out of loop if transaction is processed (SUCCESS or FAILED)
                if (getResponse.status === "SUCCESS" || getResponse.status === "FAILED") {
                    break;
                }
                
                console.log("Waiting for transaction confirmation...");
                await new Promise((resolve) => setTimeout(resolve, 3000)); // Reduced to 3s interval
            }
            console.log(`out of while loop`);

            if (!getResponse) {
                throw new Error("No response from server.");
            } else if (getResponse.status === "SUCCESS") {
                // Proper return value extraction
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
        console.log("❌ Sending transaction failed");
        console.log(JSON.stringify(err, null, 2));
    }
})();