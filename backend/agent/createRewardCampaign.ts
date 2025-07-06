import { ExecutableGameFunctionResponse, GameFunction, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { createClient } from '@supabase/supabase-js';
import { createCampaign } from "../scripts/createCampaign";
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const createRewardCampaign = new GameFunction({
  name: "create_campaign",
  description: "Create a new reward campaign for a pool, asset, daily reward amount, and duration days",
  args: [
    { name: "pool", description: "The pool address to create the campaign for" },
    { name: "asset", description: "The asset to create the campaign for" },
    { name: "daily_reward_amount", description: "The daily reward amount to create the campaign for" },
    { name: "duration_days", description: "The duration of the campaign in days" }
  ],
  executable: async (args, logger) => {
    try {
      logger("Creating campaign...");
      if (!args.pool || !args.asset || !args.daily_reward_amount || !args.duration_days) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ error: "Pool address, asset, daily reward amount, and duration days are required" })
        );
      }
      const contractAddress = process.env.REWARD_CAMPAIGN_CONTRACT_ID;
      if (!contractAddress) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          JSON.stringify({ error: "Missing REWARD_CAMPAIGN_CONTRACT_ID environment variable" })
        );
      }
      const xlm_address = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
      const result = await createCampaign({
        pool: args.pool,
        asset: args.asset,
        rewardToken: xlm_address,
        dailyRewardAmount: Number(args.daily_reward_amount),
        durationDays: Number(args.duration_days)
      });
      if (!result) {
        return new ExecutableGameFunctionResponse(
          ExecutableGameFunctionStatus.Failed,
          "Failed to create campaign: no result returned from contract call"
        );
      }
      const { campaignId, txHash } = result;
      if (campaignId && txHash) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          logger('Missing SUPABASE_URL or SUPABASE_ROLE_KEY environment variables');
        } else {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const now = new Date();
          const endDate = new Date(now.getTime() + Number(args.duration_days) * 24 * 60 * 60 * 1000);
          const { error } = await supabase.from('campaigns').insert([
            {
              campaign_id: campaignId,
              pool: args.pool,
              asset: args.asset,
              start_date: now.toISOString(),
              end_date: endDate.toISOString(),
              status: 'active'
            }
          ]);
          if (error) {
            logger('Error saving campaign to Supabase: ' + error.message);
          } else {
            logger('✅ Campaign saved to Supabase');
          }
        }
      }
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Done,
        `Campaign created successfully!\n\nCampaign #: ${campaignId}\n\nTx: https://stellar.expert/explorer/testnet/tx/${txHash}`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      logger(`Error creating campaign: ${errorMessage}`);
      return new ExecutableGameFunctionResponse(
        ExecutableGameFunctionStatus.Failed,
        `Failed to create campaign: ${errorMessage}`
      );
    }
  }
});

export default createRewardCampaign; 