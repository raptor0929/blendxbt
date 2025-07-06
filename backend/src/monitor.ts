import StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import { fullEventLog, bigIntToString } from './utils';
import { Campaign } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log(process.env.STELLAR_RPC_URL);

class SorobanEventMonitor {
  server: any;
  webhookUrl: string;
  pollInterval: number;
  lastProcessedLedger: number | null;
  isRunning: boolean;
  processedEvents: Set<string>;
  supabase: SupabaseClient;
  campaigns: Campaign[];

  constructor(config: {
    rpcUrl: string;
    webhookUrl: string;
    pollInterval?: number;
    startLedger?: number | null;
  }) {
    this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
    this.webhookUrl = config.webhookUrl;
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.lastProcessedLedger = config.startLedger || null;
    this.isRunning = false;
    this.processedEvents = new Set();
    this.campaigns = [];
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async start(): Promise<void> {
    console.log('Starting event monitor');
    this.isRunning = true;
    
    // Get the latest ledger if no starting point specified
    if (!this.lastProcessedLedger) {
      const latestLedger = await this.server.getLatestLedger();
      this.lastProcessedLedger = latestLedger.sequence;
      console.log(`Starting from ledger: ${this.lastProcessedLedger}`);
    }

    this.poll();
  }

  stop(): void {
    this.isRunning = false;
    console.log('Event monitor stopped');
  }

  async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkForEvents();
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('Error polling for events:', error);
        await this.sleep(this.pollInterval);
      }
    }
  }

  async getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*');
    if (error) {
      console.error('Error fetching campaigns from Supabase:', error.message);
      return [];
    }
    this.campaigns = data as Campaign[];
    return this.campaigns;
  }

  checkAsset(asset: string): boolean {
    return this.campaigns.some(campaign => campaign.asset === asset);
  }

  async checkForEvents(): Promise<void> {
    console.log('Checking for events');
    try {
      const currentLedger = await this.server.getLatestLedger();
      
      if (this.lastProcessedLedger === null || currentLedger === null) {
        return; // No starting point or no current ledger
      }
      if (currentLedger.sequence <= this.lastProcessedLedger) {
        return; // No new ledgers
      }

      this.getCampaigns();
      let contractIds = this.getContractIds();
      console.log('Pools:', contractIds);

      // Query events from the last processed ledger to current
      const eventsResponse = await this.server.getEvents({
        startLedger: this.lastProcessedLedger + 1,
        endLedger: currentLedger.sequence,
        filters: [
          {
            type: 'contract',
            contractIds: contractIds
          }
        ]
      });
      if (eventsResponse.events && eventsResponse.events.length > 0) {
        const humanizedEvents = fullEventLog(eventsResponse.events);

        for (const event of humanizedEvents) {
          console.log(`Processing event: ${event.id}`);
          const eventAsset = event.topics[1];
          if (this.processedEvents.has(event.id)) {
            console.log(`Skipping duplicate event: ${event.id}`);
            continue;
          }
          if (!this.checkAsset(eventAsset)) {
            console.log(`Skipping event for asset: ${eventAsset} because it's not in the campaigns`);
            continue;
          }
          this.processedEvents.add(event.id);
          await this.processEvent(event);
        }
      }

      this.lastProcessedLedger = currentLedger.sequence;
      
    } catch (error) {
      console.error('Error checking for events:', error);
    }
  }

  async processEvent(event: any): Promise<void> {
    try {
      const blendEventType = event.topics[0];
      if (blendEventType === 'supply_collateral') {
        await this.addParticipantBalance(event);
      } else if (blendEventType === 'withdraw_collateral') {
        await this.reduceParticipantBalance(event);
      }
      
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  async addParticipantBalance(event: any): Promise<void> {
    console.log('Processing event:', event.id);
    const asset = event.topics[1];
    const address = event.topics[2];
    const amount = Number(event.data[0]);
    const campaign = this.campaigns.find(campaign => campaign.asset === asset);
    if (!campaign) {
      console.log(`Skipping event for asset: ${asset} because it's not in the campaigns`);
      return;
    }
    // Check if participant exists
    const { data: existing, error: fetchError } = await this.supabase
      .from('campaign_participant')
      .select('id, balance')
      .eq('address', address)
      .eq('campaign_id', campaign.campaign_id)
      .single();

    if (existing) {
      // Add new amount to existing balance
      const { id, balance: existingBalance } = existing as { id: any; balance: any };
      const currentBalance = Number(existingBalance) || 0;
      const newBalance = currentBalance + Number(amount);
      const { error: updateError } = await this.supabase
        .from('campaign_participant')
        .update({ balance: newBalance })
        .eq('id', id);

      console.log(`Successfully updated participant ${address} balance to ${newBalance} in Supabase`);
      if (updateError) {
        console.error('Error updating participant balance in Supabase:', updateError.message);
        return;
      }
    } else {
      // Insert new participant
      const { error: insertError } = await this.supabase
        .from('campaign_participant')
        .insert([
          {
            campaign_id: campaign.campaign_id,
            address,
            balance: amount
          }
        ]);
      console.log(`Successfully inserted participant ${address} balance to ${amount} in Supabase`);
      if (insertError) {
        console.error('Error saving participant to Supabase:', insertError.message);
        return;
      }
    }
  }

  async reduceParticipantBalance(event: any): Promise<void> {
    console.log('Processing event:', event.id);
    const asset = event.topics[1];
    const address = event.topics[2];
    const amount = event.data[0];
    const campaign = this.campaigns.find(campaign => campaign.asset === asset);
    if (!campaign) {
      console.log(`Skipping event for asset: ${asset} because it's not in the campaigns`);
      return;
    }
    // Check if participant exists
    const { data: existing, error: fetchError } = await this.supabase
      .from('campaign_participant')
      .select('id, balance')
      .eq('address', address)
      .eq('campaign_id', campaign.campaign_id)
      .single();
    
    if (existing) {
      // Reduce balance
      const { id, balance: existingBalance } = existing as { id: any; balance: any };
      const currentBalance = Number(existingBalance) || 0;
      const newBalance = currentBalance - Number(amount);
      const { error: updateError } = await this.supabase
        .from('campaign_participant')
        .update({ balance: newBalance })
        .eq('id', id);
      if (updateError) {
        console.error('Error updating participant balance in Supabase:', updateError.message);
        return;
      }
    } else {
      console.log(`Participant not found for address: ${address} and campaign: ${campaign.campaign_id}`);
    }
  }

  parseXdrValues(topics: any[]): any[] {
    console.log('Parsing XDR values:', topics);
    return topics.map(topic => {
      try {
        const scVal = StellarSdk.xdr.ScVal.fromXDR(topic, 'base64');
        return this.scValToNative(scVal);
      } catch (error) {
        return topic; // Return raw if parsing fails
      }
    });
  }

  parseXdrValue(value: any): any {
    console.log('Parsing XDR value:', value);
    try {
      const scVal = StellarSdk.xdr.ScVal.fromXDR(value, 'base64');
      return this.scValToNative(scVal);
    } catch (error) {
      return value; // Return raw if parsing fails
    }
  }

  scValToNative(scVal: any): any {
    console.log('Converting ScVal to native:', scVal);
    // Convert ScVal to native JavaScript types
    try {
      return StellarSdk.scValToNative(scVal);
    } catch (error) {
      // Fallback for complex types
      return scVal.toString();
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getContractIds(): string[] {
    return [...new Set(this.campaigns.map(campaign => campaign.pool))];
  }
}

// Usage example
const rpcUrl = process.env.STELLAR_RPC_URL;
const webhookUrl = process.env.WEBHOOK_URL;

if (!rpcUrl || !webhookUrl) {
  throw new Error('Missing required environment variables: STELLAR_RPC_URL, CONTRACT_ID, or WEBHOOK_URL');
}

const monitor = new SorobanEventMonitor({
  rpcUrl: rpcUrl as string, // or mainnet
  webhookUrl: webhookUrl as string,
  pollInterval: 5000, // Poll every 5 seconds
  startLedger: null // Start from latest, or specify a ledger number
});

// Start monitoring
monitor.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  monitor.stop();
  process.exit(0);
});

module.exports = SorobanEventMonitor;