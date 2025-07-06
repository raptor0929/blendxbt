import { ExecutableGameFunctionResponse, GameFunction, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { createClient } from '@supabase/supabase-js';
import { distributeRewards } from "../scripts/distributeRewards";
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const distributeCampaignRewards = new GameFunction({
  name: "distribute_campaign_rewards",
  description: "Distribute rewards to all participants in a campaign_id.",
  args: [
    { name: "campaign_id", description: "The campaign ID to distribute rewards for" }
  ],
  executable: async (args, logger) => {
    try {
      if (!args.campaign_id) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ error: "campaign_id is required" })
        );
      }
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_ROLE_KEY environment variables" })
        );
      }
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: participants, error } = await supabase
        .from('campaign_participant')
        .select('address, balance')
        .eq('campaign_id', args.campaign_id);
      if (error) {
        logger('Error fetching participants: ' + error.message);
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `Failed to fetch participants: ${error.message}`
        );
      }
      if (!participants || participants.length === 0) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          `No participants found for campaign_id ${args.campaign_id}`
        );
      }
      logger(`Fetched ${participants.length} participants for campaign_id ${args.campaign_id}`);
      const result = await distributeRewards({
        campaignId: Number(args.campaign_id),
        participants: participants.map((p: any) => ({ address: p.address, balance: Number(p.balance) }))
      });
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Rewards distributed for campaign #: ${args.campaign_id}\n\nTx: https://stellar.expert/explorer/testnet/tx/${result.txHash}`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      logger(`Error distributing rewards: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to distribute rewards: ${errorMessage}`
      );
    }
  }
});

export default distributeCampaignRewards; 