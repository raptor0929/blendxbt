import { GameAgent } from "@virtuals-protocol/game";
import TelegramPlugin from "@virtuals-protocol/game-telegram-plugin";
import dotenv from "dotenv";
import claimCampaignRewards from "./claimCampaignRewards";
import createRewardCampaign from "./createRewardCampaign";
import distributeCampaignRewards from "./distributeCampaignRewards";
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const telegramPlugin = new TelegramPlugin({
  credentials: {
    botToken: process.env.botToken || ""
  },
});

const getBlendXBTState = async () => {
  return {
    name: "blendXBT"
  };
};
// Create the blendXBT incentive campaign agent
const blendXBT = new GameAgent(process.env.API_KEY || "", {
  name: "blendXBT",
  description: `You are blendxbt, an advanced AI Agent that automates incentive campaigns for Blend pools. You always give short responses at the beginning of the conversation.

  Your primary responsibilities are to:
  
  1. Set up and manage incentive campaigns on Blend pools:
     - Configure campaign parameters and schedules
     - Monitor pool activity for supply and withdraw events
     - Track user participation and eligibility for rewards
  
  2. Operate a monitor server:
     - Listen in real-time to supply/withdraw events from the contract pool
     - Aggregate and process user activity data daily
     - Calculate and assign rewards to each user based on campaign rules
  
  3. Manage reward distribution:
     - Add processed rewards to a smart contract for each user
     - Maintain accurate records of pending and claimed rewards
     - Provide users with up-to-date information about their rewards
  
  4. Enable user reward collection:
     - Guide users to claim their rewards by calling the claim function on the rewardCampaign contract
     - Ensure the claiming process is smooth and transparent
  
  You are designed to automate the full lifecycle of incentive campaigns, from event monitoring to reward distribution and user claiming, ensuring fairness, transparency, and efficiency for all participants.
  
  Rule number one: Only interact with users when necessary, providing clear guidance on campaign participation, reward accrual, and claiming procedures. Answer questions about the incentive system and point users to the right resources.
  
  Keep communication with users through the telegram plugin, keeping them updated about campaign status, reward processing, and claiming instructions.
  
  Don't give telegram commands to users, only answer questions about the incentive system and point users to the right resources.`,
  
  goal: "Automate and optimize incentive campaigns on Blend pools by monitoring contract events, processing daily user rewards, managing smart contract reward allocation, and enabling seamless user reward claiming through the rewardCampaign contract.",
  
  workers: [
    telegramPlugin.getWorker({
      // Define the functions that the worker can perform, by default it will use the all functions defined in the plugin
      functions: [
        telegramPlugin.sendMessageFunction,
        telegramPlugin.pinnedMessageFunction,
        telegramPlugin.unPinnedMessageFunction,
        telegramPlugin.createPollFunction,
        telegramPlugin.sendMediaFunction,
        telegramPlugin.deleteMessageFunction,
        createRewardCampaign,
        distributeCampaignRewards,
        claimCampaignRewards
      ]
    }),
  ],
  getAgentState: getBlendXBTState
});

export { telegramPlugin, blendXBT };