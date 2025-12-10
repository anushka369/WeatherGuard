// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityPool.sol";
import "../src/OracleConsumer.sol";
import "../src/PolicyManager.sol";

/**
 * @title DeployMainnet
 * @notice Mainnet deployment script for Weather Insurance dApp
 * @dev Deploys all contracts with production-grade configuration and safety checks
 */
contract DeployMainnet is Script {
    // Mainnet configuration (production values)
    uint256 constant INITIAL_YIELD_PERCENTAGE = 7000; // 70%
    uint256 constant MIN_COVERAGE_PERIOD = 1 days;
    uint256 constant MAX_COVERAGE_PERIOD = 365 days;
    uint256 constant MIN_PAYOUT_AMOUNT = 0.01 ether;
    uint256 constant MAX_PAYOUT_AMOUNT = 100 ether;
    uint256 constant BASE_PREMIUM_RATE = 500; // 5%

    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envOr("ORACLE_ADDRESS", address(0));
        
        // Strict validation for mainnet
        require(oracleAddress != address(0), "ORACLE_ADDRESS not set in .env");
        require(oracleAddress != address(0xdead), "Invalid oracle address");
        
        console.log("=== Starting Mainnet Deployment ===");
        console.log("WARNING: This is a MAINNET deployment!");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Oracle Address:", oracleAddress);
        console.log("");
        
        // Additional safety check
        console.log("Please verify the following configuration:");
        console.log("  Yield Percentage:      ", INITIAL_YIELD_PERCENTAGE, "bp (70%)");
        console.log("  Min Coverage Period:   ", MIN_COVERAGE_PERIOD / 1 days, "days");
        console.log("  Max Coverage Period:   ", MAX_COVERAGE_PERIOD / 1 days, "days");
        console.log("  Min Payout Amount:     ", MIN_PAYOUT_AMOUNT / 1 ether, "ETH");
        console.log("  Max Payout Amount:     ", MAX_PAYOUT_AMOUNT / 1 ether, "ETH");
        console.log("  Base Premium Rate:     ", BASE_PREMIUM_RATE, "bp (5%)");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy LiquidityPool
        console.log("Step 1: Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool();
        console.log("  LiquidityPool deployed at:", address(liquidityPool));
        
        // Verify deployment
        require(address(liquidityPool) != address(0), "LiquidityPool deployment failed");
        require(liquidityPool.owner() == vm.addr(deployerPrivateKey), "LiquidityPool owner mismatch");
        console.log("  Deployment verified");
        console.log("");

        // Step 2: Deploy OracleConsumer
        console.log("Step 2: Deploying OracleConsumer...");
        OracleConsumer oracleConsumer = new OracleConsumer(oracleAddress);
        console.log("  OracleConsumer deployed at:", address(oracleConsumer));
        
        // Verify deployment
        require(address(oracleConsumer) != address(0), "OracleConsumer deployment failed");
        require(oracleConsumer.owner() == vm.addr(deployerPrivateKey), "OracleConsumer owner mismatch");
        require(oracleConsumer.oracleAddress() == oracleAddress, "Oracle address mismatch");
        console.log("  Deployment verified");
        console.log("");

        // Step 3: Deploy PolicyManager
        console.log("Step 3: Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(address(liquidityPool));
        console.log("  PolicyManager deployed at:", address(policyManager));
        
        // Verify deployment
        require(address(policyManager) != address(0), "PolicyManager deployment failed");
        require(policyManager.owner() == vm.addr(deployerPrivateKey), "PolicyManager owner mismatch");
        require(address(policyManager.liquidityPool()) == address(liquidityPool), "LiquidityPool reference mismatch");
        console.log("  Deployment verified");
        console.log("");

        // Step 4: Configure LiquidityPool
        console.log("Step 4: Configuring LiquidityPool...");
        liquidityPool.setPolicyManager(address(policyManager));
        require(liquidityPool.policyManager() == address(policyManager), "Policy Manager configuration failed");
        console.log("  Policy Manager set and verified");
        
        liquidityPool.setYieldPercentage(INITIAL_YIELD_PERCENTAGE);
        require(liquidityPool.yieldPercentage() == INITIAL_YIELD_PERCENTAGE, "Yield percentage configuration failed");
        console.log("  Yield percentage set and verified:", INITIAL_YIELD_PERCENTAGE, "basis points");
        console.log("");

        // Step 5: Configure OracleConsumer
        console.log("Step 5: Configuring OracleConsumer...");
        oracleConsumer.setPolicyManager(address(policyManager));
        require(oracleConsumer.policyManager() == address(policyManager), "Policy Manager configuration failed");
        console.log("  Policy Manager set and verified");
        console.log("");

        // Step 6: Configure PolicyManager
        console.log("Step 6: Configuring PolicyManager...");
        policyManager.setOracleConsumer(address(oracleConsumer));
        require(policyManager.oracleConsumer() == address(oracleConsumer), "Oracle Consumer configuration failed");
        console.log("  Oracle Consumer set and verified");
        
        policyManager.setParameterLimits(
            MIN_COVERAGE_PERIOD,
            MAX_COVERAGE_PERIOD,
            MIN_PAYOUT_AMOUNT,
            MAX_PAYOUT_AMOUNT
        );
        require(policyManager.minCoveragePeriod() == MIN_COVERAGE_PERIOD, "Min coverage period configuration failed");
        require(policyManager.maxCoveragePeriod() == MAX_COVERAGE_PERIOD, "Max coverage period configuration failed");
        require(policyManager.minPayoutAmount() == MIN_PAYOUT_AMOUNT, "Min payout amount configuration failed");
        require(policyManager.maxPayoutAmount() == MAX_PAYOUT_AMOUNT, "Max payout amount configuration failed");
        console.log("  Parameter limits set and verified");
        
        policyManager.setBasePremiumRate(BASE_PREMIUM_RATE);
        require(policyManager.basePremiumRate() == BASE_PREMIUM_RATE, "Base premium rate configuration failed");
        console.log("  Base premium rate set and verified:", BASE_PREMIUM_RATE, "basis points");
        console.log("");

        vm.stopBroadcast();

        // Step 7: Final Verification and Summary
        console.log("=== Deployment Complete and Verified ===");
        console.log("");
        console.log("Contract Addresses:");
        console.log("  LiquidityPool:   ", address(liquidityPool));
        console.log("  OracleConsumer:  ", address(oracleConsumer));
        console.log("  PolicyManager:   ", address(policyManager));
        console.log("");
        
        console.log("Configuration:");
        console.log("  Oracle Address:        ", oracleAddress);
        console.log("  Yield Percentage:      ", INITIAL_YIELD_PERCENTAGE, "bp (70%)");
        console.log("  Min Coverage Period:   ", MIN_COVERAGE_PERIOD / 1 days, "days");
        console.log("  Max Coverage Period:   ", MAX_COVERAGE_PERIOD / 1 days, "days");
        console.log("  Min Payout Amount:     ", MIN_PAYOUT_AMOUNT / 1 ether, "ETH");
        console.log("  Max Payout Amount:     ", MAX_PAYOUT_AMOUNT / 1 ether, "ETH");
        console.log("  Base Premium Rate:     ", BASE_PREMIUM_RATE, "bp (5%)");
        console.log("");
        
        console.log("Owner Addresses (all contracts):");
        console.log("  ", vm.addr(deployerPrivateKey));
        console.log("");
        
        console.log("Verification Commands:");
        console.log("  See DEPLOYMENT.md for verification commands");
        console.log("");
        
        console.log("IMPORTANT: Save these addresses securely!");
        console.log("Add to your .env file:");
        console.log("  LIQUIDITY_POOL_ADDRESS=", address(liquidityPool));
        console.log("  ORACLE_CONSUMER_ADDRESS=", address(oracleConsumer));
        console.log("  POLICY_MANAGER_ADDRESS=", address(policyManager));
        console.log("");
        
        console.log("Next Steps:");
        console.log("  1. Verify contracts on block explorer");
        console.log("  2. Test basic functionality with small amounts");
        console.log("  3. Monitor contract events and transactions");
        console.log("  4. Consider transferring ownership to a multisig wallet");
    }
}
