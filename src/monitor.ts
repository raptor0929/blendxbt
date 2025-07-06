import StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import { fullEventLog, bigIntToString } from './utils';
import { Campaign } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

console.log(process.env.STELLAR_RPC_URL);

class SorobanEventMonitor {
  server: any;
  contractId: string;
  webhookUrl: string;
  pollInterval: number;
  lastProcessedLedger: number | null;
  isRunning: boolean;
  processedEvents: Set<string>;
  supabase: SupabaseClient;
  campaigns: Campaign[];

  constructor(config: {
    rpcUrl: string;
    contractId: string;
    webhookUrl: string;
    pollInterval?: number;
    startLedger?: number | null;
  }) {
    this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
    this.contractId = config.contractId;
    this.webhookUrl = config.webhookUrl;
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.lastProcessedLedger = config.startLedger || null;
    this.isRunning = false;
    this.processedEvents = new Set();
    this.campaigns = [];
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ROLE_KEY environment variables');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async start(): Promise<void> {
    console.log(`Starting event monitor for contract: ${this.contractId}`);
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

      let contractIds = this.getContractIds();

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
        console.log("=== SOROBAN HUMANIZED EVENTS ===");
        console.log({humanizedEvents});

        for (const event of humanizedEvents) {
          if (this.processedEvents.has(event.id) || this.checkAsset(event.asset)) {
            console.log(`Skipping duplicate event: ${event.id}`);
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
      console.log('Processing event:', event.id);
      
      // Send to webhook
      await this.sendToWebhook(bigIntToString(event));
      
    } catch (error) {
      console.error('Error processing event:', error);
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

  async sendToWebhook(eventData: any): Promise<void> {
    console.log('Sending to webhook:', eventData);
    try {
      const response = await axios.post(this.webhookUrl, {
        event: 'soroban_contract_event',
        data: eventData
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Soroban-Event-Monitor/1.0'
        }
      });

      console.log(`Webhook sent successfully for event ${eventData.id}: ${response.status}`);
      
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to send webhook for event ${eventData.id}:`, err.message);
      // You might want to implement retry logic here
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getContractIds(): string[] {
    return [this.contractId];
  }
}

// Usage example
const rpcUrl = process.env.STELLAR_RPC_URL;
const contractId = process.env.CONTRACT_ID;
const webhookUrl = process.env.WEBHOOK_URL;

if (!rpcUrl || !contractId || !webhookUrl) {
  throw new Error('Missing required environment variables: STELLAR_RPC_URL, CONTRACT_ID, or WEBHOOK_URL');
}

const monitor = new SorobanEventMonitor({
  rpcUrl: rpcUrl as string, // or mainnet
  contractId: contractId as string, // Your contract ID
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