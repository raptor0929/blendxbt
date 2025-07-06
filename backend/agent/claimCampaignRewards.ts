import { ExecutableGameFunctionResponse, GameFunction, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { claimRewards } from "../scripts/claimRewards";
import { Keypair } from "@stellar/stellar-sdk";

const USER_ADDRESS = Keypair.fromSecret(process.env.USER_SECRET_KEY!).publicKey();

const claimCampaignRewards = new GameFunction({
  name: "claim_campaign_reward",
  description: "Claim rewards for a campaign_id",
  args: [
    { name: "campaign_id", description: "The campaign ID to claim rewards for" }
  ],
  executable: async (args, logger) => {
    try {
      if (!args.campaign_id) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ error: "campaign_id is required" })
        );
      }
      const result = await claimRewards({
        campaignId: Number(args.campaign_id)
      });
      const { txHash, rewardAmount } = result;
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Rewards claimed for user ${USER_ADDRESS} in campaign #: ${args.campaign_id}\n\nAmount: ${rewardAmount/10000000} XLM\n\nTx: https://stellar.expert/explorer/testnet/tx/${txHash}`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      logger(`Error claiming rewards: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to claim rewards: ${errorMessage}`
      );
    }
  }
});

export default claimCampaignRewards; 