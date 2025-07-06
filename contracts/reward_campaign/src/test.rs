#![cfg(test)]
extern crate std;
use std::println;

use super::*;
use soroban_sdk::{testutils::{Address as _, Logs}, token, Env, IntoVal};

#[test]
fn test_create_campaign_distribute_and_claim_rewards() {
    let env = Env::default();
    let contract_id = env.register(RewardCampaignContract, ());
    let client = RewardCampaignContractClient::new(&env, &contract_id);

    // Setup admin and token
    let admin = Address::generate(&env);
    log!(&env, "Admin address: {}", admin);
    let reward_token = Address::from_str(&env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
    log!(&env, "Token address: {}", reward_token);
    client.mock_all_auths().initialize(&admin);
    assert_eq!(client.get_admin(), admin);

    let token_client = token::TokenClient::new(&env, &reward_token);
    token_client.mock_all_auths().initialize(&admin, &7000000000000000000i128, &"Test Token", &"TEST");
    token_client.mock_all_auths().mint(&admin, &7000000000000000000i128);
    let admin_balance = token_client.balance(&admin);
    assert_eq!(admin_balance, 7000000000000000000i128);

    // Setup campaign params
    let pool_address = Address::generate(&env);
    let asset = Address::generate(&env);
    let reward_token = reward_token.clone();
    let daily_reward_amount = 1000i128;
    let duration_days = 1u32;
    let creator = admin.clone();

    // Create campaign
    let campaign_id = client.mock_all_auths().create_campaign(
        &pool_address,
        &asset,
        &reward_token,
        &daily_reward_amount,
        &duration_days,
        &creator,
    );
    assert_eq!(campaign_id, 1u32);

    // Distribute rewards
    let user = Address::generate(&env);
    let user_addresses = vec![&env, user.clone()];
    let user_balances = vec![&env, 1000i128];
    let total_pool_deposits = 1000i128;
    client.mock_all_auths().distribute_rewards(
        &campaign_id,
        &user_addresses,
        &user_balances,
        &total_pool_deposits,
    );

    // Check user rewards before claim
    let unclaimed = client.get_user_rewards(&user, &campaign_id);
    assert_eq!(unclaimed, 1000i128);

    // Claim rewards
    let claimed = client.mock_all_auths().claim_rewards(&user, &campaign_id);
    assert_eq!(claimed, 1000i128);

    // Check user rewards after claim
    let unclaimed_after = client.get_user_rewards(&user, &campaign_id);
    assert_eq!(unclaimed_after, 0i128);

    for log in env.logs().all() {
        println!("SOROBAN LOG: {}", log);
    }
}
