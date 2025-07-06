import { blendXBT, telegramPlugin } from './blendXBT';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct location
dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async () => {
    console.log('Starting...');

    await blendXBT.init();

    console.log('🤖 BlendXBT Telegram Agent - Started');
    
    blendXBT.setLogger((blendXBT, message) => {
      console.log(`-----[${blendXBT.name}]-----`);
      console.log(message);
      console.log("\n");
    });

    // Initialize Telegram Plugin
    telegramPlugin.onMessage(async (msg) => {
      const agentTgWorker = blendXBT.getWorkerById(telegramPlugin.getWorker().id);
      const task = "Reply professionally and fullfill the request to chat id: " + msg.chat.id + " and the incoming is message: " + msg.text + " and the message id is: " + msg.message_id;
  
      await agentTgWorker.runTask(task, {
        verbose: false, // Optional: Set to true to log each step
      });
    });
})();