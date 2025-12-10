// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityPool.sol";
import "../src/OracleConsumer.sol";
import "../src/PolicyManager.sol";

/**
 * @title DeployTestnet
 * @notice Testnet deployment script for Weather Insurance dApp
 * @dev Deploys all contracts with testnet-specific configuration
 */
contract DeployTestnet is Script {
    // Testnet configuration
    uint256 constant INITIAL_YIELD_PERCENTAGE = 7000; // 70%
    uint256 constant MIN_COVERAGE_PERIOD = 1 hours; // Shorter for testing
    uint256 constant MAX_COVERAGE_PERIOD = 90 days;
    uint256 constant MIN_PAYOUT_AMOUNT = 0.001 ether; // Lower for testing
    uint256 constant MAX_PAYOUT_AMOUNT = 10 ether; // Lower for testing
    uint256 constant BASE_PREMIUM_RATE = 500; // 5%

    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envOr("ORACLE_ADDRESS", address(0));
        
        // Validate oracle address
        require(oracleAddress != address(0), "ORACLE_ADDRESS not set in .env");
        
        console.log("=== Starting Testnet Deployment ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Oracle Address:", oracleAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy LiquidityPool
        console.log("Step 1: Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool();
        console.log("  LiquidityPool deployed at:", address(liquidityPool));
        console.log("");

        // Step 2: Deploy OracleConsumer
        console.log("Step 2: Deploying OracleConsumer...");
        OracleConsumer oracleConsumer = new OracleConsumer(oracleAddress);
        console.log("  OracleConsumer deployed at:", address(oracleConsumer));
        console.log("");

        // Step 3: Deploy PolicyManager
        console.log("Step 3: Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(address(liquidityPool));
        console.log("  PolicyManager deployed at:", address(policyManager));
        console.log("");

        // Step 4: Configure LiquidityPool
        console.log("Step 4: Configuring LiquidityPool...");
        liquidityPool.setPolicyManager(address(policyManager));
        console.log("  Policy Manager set");
        
        liquidityPool.setYieldPercentage(INITIAL_YIELD_PERCENTAGE);
        console.log("  Yield percentage set to:", INITIAL_YIELD_PERCENTAGE, "basis points");
        console.log("");

        // Step 5: Configure OracleConsumer
        console.log("Step 5: Configuring OracleConsumer...");
        oracleConsumer.setPolicyManager(address(policyManager));
        console.log("  Policy Manager set");
        console.log("");

        // Step 6: Configure PolicyManager
        console.log("Step 6: Configuring PolicyManager...");
        policyManager.setOracleConsumer(address(oracleConsumer));
        console.log("  Oracle Consumer set");
        
        policyManager.setParameterLimits(
            MIN_COVERAGE_PERIOD,
            MAX_COVERAGE_PERIOD,
            MIN_PAYOUT_AMOUNT,
            MAX_PAYOUT_AMOUNT
        );
        console.log("  Parameter limits set");
        
        policyManager.setBasePremiumRate(BASE_PREMIUM_RATE);
        console.log("  Base premium rate set to:", BASE_PREMIUM_RATE, "basis points");
        console.log("");

        vm.stopBroadcast();

        // Step 7: Verification and Summary
        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("Contract Addresses:");
        console.log("  LiquidityPool:   ", address(liquidityPool));
        console.log("  OracleConsumer:  ", address(oracleConsumer));
        console.log("  PolicyManager:   ", address(policyManager));
        console.log("");
        
        console.log("Configuration:");
        console.log("  Oracle Address:        ", oracleAddress);
        console.log("  Yield Percentage:      ", INITIAL_YIELD_PERCENTAGE, "bp (70%)");
        console.log("  Min Coverage Period:   ", MIN_COVERAGE_PERIOD, "seconds");
        console.log("  Max Coverage Period:   ", MAX_COVERAGE_PERIOD, "seconds");
        console.log("  Min Payout Amount:     ", MIN_PAYOUT_AMOUNT, "wei");
        console.log("  Max Payout Amount:     ", MAX_PAYOUT_AMOUNT, "wei");
        console.log("  Base Premium Rate:     ", BASE_PREMIUM_RATE, "bp (5%)");
        console.log("");
        
        console.log("Verification Commands:");
        console.log("  See DEPLOYMENT.md for verification commands");
        console.log("");
        
        console.log("Save these addresses to your .env file:");
        console.log("  LIQUIDITY_POOL_ADDRESS=", address(liquidityPool));
        console.log("  ORACLE_CONSUMER_ADDRESS=", address(oracleConsumer));
        console.log("  POLICY_MANAGER_ADDRESS=", address(policyManager));
    }
}
