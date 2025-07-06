#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short, vec, Address, Env, Symbol, Vec, 
    log, token
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const CAMPAIGN_COUNT: Symbol = symbol_short!("CAMP_CNT");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub campaign_id: u32,
    pub pool_address: Address,
    pub asset: Address,
    pub reward_token: Address,
    pub daily_reward_amount: i128,
    pub total_funded_amount: i128,
    pub remaining_funds: i128,
    pub campaign_duration_days: u32,
    pub start_time: u64,
    pub end_time: u64,
    pub is_active: bool,
    pub creator: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserReward {
    pub user: Address,
    pub campaign_id: u32,
    pub unclaimed_amount: i128,
    pub total_claimed: i128,
    pub last_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserBalance {
    pub user: Address,
    pub balance: i128,
}

#[contracttype]
pub enum DataKey {
    Campaign(u32),                    // campaign_id
    UserReward(Address, u32),         // (user, campaign_id)
    Admin,
    CampaignCount,
    CampaignByPool(Address, Address), // (pool, asset) -> campaign_id
}

#[contracterror]
pub enum Error {
    NotAuthorized = 1,
    CampaignNotFound = 2,
    InsufficientFunds = 3,
    AlreadyInitialized = 4,
    InvalidAmount = 5,
    CampaignEnded = 6,
    CampaignNotActive = 7,
    InvalidDuration = 8,
    CampaignAlreadyExists = 9,
    InvalidUserBalances = 10,
}

#[contract]
pub struct RewardCampaignContract;

#[contractimpl]
impl RewardCampaignContract {
    
    /// Initialize the contract with admin
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CampaignCount, &0u32);
        
        log!(&env, "Contract initialized with admin: {}", admin);
        Ok(())
    }
    
    /// Create a new campaign for a (pool, asset) pair
    /// XLM funds should be sent to cover the entire campaign duration
    pub fn create_campaign(
        env: Env,
        pool_address: Address,
        asset: Address,
        reward_token: Address,
        daily_reward_amount: i128,
        duration_days: u32,
        creator: Address,
    ) -> Result<u32, Error> {
        creator.require_auth();
        
        if daily_reward_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        
        if duration_days == 0 {
            return Err(Error::InvalidDuration);
        }
        
        // Check if campaign already exists for this pool-asset pair
        if env.storage().persistent().has(&DataKey::CampaignByPool(pool_address.clone(), asset.clone())) {
            return Err(Error::CampaignAlreadyExists);
        }
        
        let total_funded_amount = daily_reward_amount * (duration_days as i128);
        
        // Always transfer XLM (native asset) from creator to contract
        let token_client = token::Client::new(&env, &reward_token);
        token_client.transfer(&creator, &env.current_contract_address(), &total_funded_amount);
        
        // Get next campaign ID
        let mut campaign_count: u32 = env.storage().instance().get(&DataKey::CampaignCount).unwrap_or(0);
        campaign_count += 1;
        
        let current_time = env.ledger().timestamp();
        let end_time = current_time + (duration_days as u64 * 24 * 60 * 60); // duration in seconds
        
        let campaign = Campaign {
            campaign_id: campaign_count,
            pool_address: pool_address.clone(),
            asset: asset.clone(),
            reward_token: reward_token.clone(),
            daily_reward_amount,
            total_funded_amount,
            remaining_funds: total_funded_amount,
            campaign_duration_days: duration_days,
            start_time: current_time,
            end_time,
            is_active: true,
            creator: creator.clone(),
        };
        
        // Store campaign
        env.storage().persistent().set(&DataKey::Campaign(campaign_count), &campaign);
        env.storage().persistent().set(&DataKey::CampaignByPool(pool_address.clone(), asset.clone()), &campaign_count);
        env.storage().instance().set(&DataKey::CampaignCount, &campaign_count);
        
        log!(&env, "Campaign created: ID {} for pool {} asset {} with {} total rewards", 
             campaign_count, pool_address, asset, total_funded_amount);
        
        Ok(campaign_count)
    }
    
    /// Distribute rewards to users based on their balances
    /// Called by backend with user balances and total pool deposits
    pub fn distribute_rewards(
        env: Env,
        campaign_id: u32,
        user_addresses: Vec<Address>,
        user_balances: Vec<i128>,
        total_pool_deposits: i128,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        let campaign_opt = env.storage().persistent().get(&DataKey::Campaign(campaign_id));
        if campaign_opt.is_none() {
            log!(&env, "Error: Campaign not found for id {}", campaign_id);
            return Err(Error::CampaignNotFound);
        }
        let mut campaign: Campaign = campaign_opt.unwrap();
        
        if !campaign.is_active {
            log!(&env, "Error: Campaign {} is not active", campaign_id);
            return Err(Error::CampaignNotActive);
        }
        
        let current_time = env.ledger().timestamp();
        if current_time > campaign.end_time {
            log!(&env, "Error: Campaign {} has ended", campaign_id);
            return Err(Error::CampaignEnded);
        }
        
        if total_pool_deposits <= 0 {
            log!(&env, "Error: No deposits in pool for campaign {}", campaign_id);
            return Ok(());
        }
        
        if user_addresses.is_empty() || user_balances.is_empty() || user_addresses.len() != user_balances.len() {
            log!(&env, "Error: No user addresses or balances provided for campaign {}", campaign_id);
            return Ok(());
        }
        
        let daily_reward = campaign.daily_reward_amount;
        
        // Check if we have enough funds for this distribution
        if campaign.remaining_funds < daily_reward {
            log!(&env, "Error: Insufficient funds for campaign {}", campaign_id);
            return Err(Error::InsufficientFunds);
        }
        
        let mut total_distributed = 0i128;
        
        // Calculate and distribute rewards to each user
        for i in 0..user_addresses.len() {
            let user = user_addresses.get(i).unwrap();
            let balance = user_balances.get(i).unwrap();
            
            if balance <= 0 {
                log!(&env, "Info: Skipping user {} with non-positive balance {}", user, balance);
                continue;
            }
            
            // Calculate user's daily allocation: user_balance * daily_reward / total_pool_deposits
            let user_reward = (balance * daily_reward) / total_pool_deposits;
            
            if user_reward <= 0 {
                log!(&env, "Info: Skipping user {} with calculated reward {}", user, user_reward);
                continue;
            }
            
            // Update user rewards
            let mut user_reward_data: UserReward = env.storage().persistent()
                .get(&DataKey::UserReward(user.clone(), campaign_id))
                .unwrap_or(UserReward {
                    user: user.clone(),
                    campaign_id,
                    unclaimed_amount: 0,
                    total_claimed: 0,
                    last_update: current_time,
                });
            
            user_reward_data.unclaimed_amount += user_reward;
            user_reward_data.last_update = current_time;
            
            env.storage().persistent().set(
                &DataKey::UserReward(user.clone(), campaign_id),
                &user_reward_data
            );
            
            total_distributed += user_reward;
            
            log!(&env, "User {} allocated {} rewards in campaign {}", 
                 user, user_reward, campaign_id);
        }
        
        // Update campaign remaining funds
        campaign.remaining_funds -= total_distributed;
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        
        log!(&env, "Distributed {} total rewards to {} users in campaign {}", 
             total_distributed, user_addresses.len(), campaign_id);
        
        Ok(())
    }
    
    /// Allow user to claim their rewards from a specific campaign
    pub fn claim_rewards(env: Env, user: Address, campaign_id: u32) -> Result<i128, Error> {
        user.require_auth();
        
        let campaign: Campaign = env.storage().persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;
        
        let mut user_reward: UserReward = env.storage().persistent()
            .get(&DataKey::UserReward(user.clone(), campaign_id))
            .ok_or(Error::InsufficientFunds)?;
        
        if user_reward.unclaimed_amount <= 0 {
            return Err(Error::InsufficientFunds);
        }
        
        let claim_amount = user_reward.unclaimed_amount;
        user_reward.unclaimed_amount = 0;
        user_reward.total_claimed += claim_amount;
        
        env.storage().persistent().set(
            &DataKey::UserReward(user.clone(), campaign_id),
            &user_reward
        );
        
        // Always transfer XLM (native asset) to user
        let token_client = token::Client::new(&env, &campaign.reward_token);
        token_client.transfer(&env.current_contract_address(), &user, &claim_amount);
        
        log!(&env, "User {} claimed {} rewards from campaign {}", user, claim_amount, campaign_id);
        Ok(claim_amount)
    }

    pub fn claim_all_rewards(env: Env, user: Address) -> Result<Vec<(u32, i128)>, Error> {
        user.require_auth();
        
        let campaign_count: u32 = env.storage().instance().get(&DataKey::CampaignCount).unwrap_or(0);
        let mut claimed_rewards: Vec<(u32, i128)> = vec![&env];
        
        for campaign_id in 1..=campaign_count {
            if let Some(mut user_reward) = env.storage().persistent()
                .get::<DataKey, UserReward>(&DataKey::UserReward(user.clone(), campaign_id)) {
                
                if user_reward.unclaimed_amount > 0 {
                    let claim_amount = user_reward.unclaimed_amount;
                    user_reward.unclaimed_amount = 0;
                    user_reward.total_claimed += claim_amount;
                    
                    env.storage().persistent().set(
                        &DataKey::UserReward(user.clone(), campaign_id),
                        &user_reward
                    );
                    
                    // Get campaign to know which token to transfer
                    if let Some(campaign) = env.storage().persistent()
                        .get::<DataKey, Campaign>(&DataKey::Campaign(campaign_id)) {
                        
                        let token_client = token::Client::new(&env, &campaign.reward_token);
                        token_client.transfer(&env.current_contract_address(), &user, &claim_amount);
                        
                        claimed_rewards.push_back((campaign_id, claim_amount));
                    }
                }
            }
        }
        
        log!(&env, "User {} claimed rewards from {} campaigns", user, claimed_rewards.len());
        Ok(claimed_rewards)
    }
    
    /// Get user's unclaimed rewards for a specific campaign
    pub fn get_user_rewards(env: Env, user: Address, campaign_id: u32) -> i128 {
        let user_reward: UserReward = env.storage().persistent()
            .get(&DataKey::UserReward(user.clone(), campaign_id))
            .unwrap_or(UserReward {
                user: user.clone(),
                campaign_id,
                unclaimed_amount: 0,
                total_claimed: 0,
                last_update: 0,
            });
        
        user_reward.unclaimed_amount
    }
    
    /// Get all user's unclaimed rewards across all campaigns
    pub fn get_user_all_rewards(env: Env, user: Address) -> Vec<(u32, i128)> {
        let campaign_count: u32 = env.storage().instance().get(&DataKey::CampaignCount).unwrap_or(0);
        let mut rewards: Vec<(u32, i128)> = vec![&env];
        
        for campaign_id in 1..=campaign_count {
            if let Some(user_reward) = env.storage().persistent()
                .get::<DataKey, UserReward>(&DataKey::UserReward(user.clone(), campaign_id)) {
                
                if user_reward.unclaimed_amount > 0 {
                    rewards.push_back((campaign_id, user_reward.unclaimed_amount));
                }
            }
        }
        
        rewards
    }
    
    /// Get campaign details
    pub fn get_campaign(env: Env, campaign_id: u32) -> Option<Campaign> {
        env.storage().persistent().get(&DataKey::Campaign(campaign_id))
    }
    
    /// Get campaign ID by pool and asset
    pub fn get_campaign_by_pool_asset(env: Env, pool_address: Address, asset: Address) -> Option<u32> {
        env.storage().persistent().get(&DataKey::CampaignByPool(pool_address, asset))
    }
    
    /// Get all active campaigns
    pub fn get_active_campaigns(env: Env) -> Vec<Campaign> {
        let campaign_count: u32 = env.storage().instance().get(&DataKey::CampaignCount).unwrap_or(0);
        let mut campaigns: Vec<Campaign> = vec![&env];
        
        for campaign_id in 1..=campaign_count {
            if let Some(campaign) = env.storage().persistent()
                .get::<DataKey, Campaign>(&DataKey::Campaign(campaign_id)) {
                if campaign.is_active {
                    campaigns.push_back(campaign);
                }
            }
        }
        
        campaigns
    }
    
    /// Update campaign status (only admin or creator)
    pub fn update_campaign_status(env: Env, campaign_id: u32, is_active: bool) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        
        let mut campaign: Campaign = env.storage().persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;
        
        // Check if caller is admin or campaign creator
        if env.storage().instance().get::<DataKey, Address>(&DataKey::Admin).unwrap() != admin {
            campaign.creator.require_auth();
        } else {
            admin.require_auth();
        }
        
        campaign.is_active = is_active;
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        
        log!(&env, "Campaign {} status updated to {}", campaign_id, is_active);
        Ok(())
    }
    
    /// Shutdown campaign and withdraw remaining funds (only campaign creator after campaign ends)
    pub fn shutdown_campaign(env: Env, campaign_id: u32) -> Result<i128, Error> {
        let mut campaign: Campaign = env.storage().persistent()
            .get(&DataKey::Campaign(campaign_id))
            .ok_or(Error::CampaignNotFound)?;
        
        campaign.creator.require_auth();
        
        let current_time = env.ledger().timestamp();
        if current_time <= campaign.end_time {
            return Err(Error::CampaignNotActive);
        }
        
        let remaining_funds = campaign.remaining_funds;
        if remaining_funds <= 0 {
            return Err(Error::InsufficientFunds);
        }
        
        campaign.remaining_funds = 0;
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        
        // Always transfer XLM (native asset) back to creator
        // let xlm_address = soroban_sdk::native_asset(&env);
        // let token_client = token::Client::new(&env, &xlm_address);
        let token_client = token::Client::new(&env, &campaign.reward_token);
        token_client.transfer(&env.current_contract_address(), &campaign.creator, &remaining_funds);
        
        log!(&env, "Emergency withdrawal of {} XLM from campaign {}", remaining_funds, campaign_id);
        Ok(remaining_funds)
    }
    
    /// Get total number of campaigns
    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::CampaignCount).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

mod test;
