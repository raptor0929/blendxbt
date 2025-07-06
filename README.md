# BlendXBT 🚀

![BlendXBT AI Character](/public/images/ai-character-bottle.png)

BlendXBT is a decentralized rewards and campaign management protocol built on the Stellar Soroban smart contract platform. It enables the creation, management, and distribution of on-chain rewards for DeFi pools, trading competitions, and other incentive programs. The protocol is designed to be transparent, automated, and extensible for a variety of use cases in the decentralized finance ecosystem.

## Key Features ✨

- 🏆 **Campaign Creation:** Easily create new reward campaigns for specific pools and assets, specifying daily reward amounts and campaign durations.
- 🤖 **Automated Reward Distribution:** Distribute rewards to participants based on their activity and balances, with on-chain transparency.
- 👀 **Real-Time Event Monitoring:** Blend pool events are monitored in real time using `monitor.ts`, which listens for Soroban contract events, updates participant balances, and triggers reward logic automatically.
- 💸 **Claimable Rewards:** Users can claim their accumulated rewards directly from the smart contract.
- 🗄️ **Supabase Integration:** Off-chain data (campaigns, participations) is synchronized with a Supabase database for analytics and UI.
- 📢 **Telegram Agent:** Automated agent for campaign management and notifications via Telegram.

## Technology Stack 🛠️

- **Smart Contracts:** Soroban (Stellar) for all on-chain logic
- **Backend:** Node.js (TypeScript), with scripts for campaign management, reward distribution, and monitoring
- **Database:** Supabase (PostgreSQL) for off-chain campaign and participant data
- **Messaging:** Telegram bot integration for notifications and campaign management

## Deployed Contract 🌐

- **Soroban Testnet Contract:** [CDBLGBQLRM7QCCHMZSG65RWT2KFZTQ6CKWD6ZG3JDFUD5GWO5M5UU7YJ](https://stellar.expert/explorer/testnet/contract/CDBLGBQLRM7QCCHMZSG65RWT2KFZTQ6CKWD6ZG3JDFUD5GWO5M5UU7YJ)

## Getting Started 🚦

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Access to the Soroban testnet
- Supabase project and credentials

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/raptor0929/blendxbt.git
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```
3. Configure environment variables:
   - Copy `env.example` to `.env` and fill in your Supabase and Soroban credentials.
4. Run the monitor server to listen to blend contracts events:
   ```sh
   npm run agent
   ```   
5. Run the Telegram agent:
   ```sh
   npm run agent
   ```

## Project Structure 🗂️

- `contracts/` - Soroban smart contract source code
- `agent/` - Game functions and backend logic
- `scripts/` - Utility scripts for campaign management and reward distribution
- `src/` - Monitoring and utility code (see `monitor.ts` for event monitoring logic)
- `README.md` - Project documentation

## License 📄

MIT License