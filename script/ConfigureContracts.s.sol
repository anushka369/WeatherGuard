// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityPool.sol";
import "../src/OracleConsumer.sol";
import "../src/PolicyManager.sol";

/**
 * @title ConfigureContracts
 * @notice Post-deployment configuration script
 * @dev Updates contract parameters after initial deployment
 */
contract ConfigureContracts is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address liquidityPoolAddress = vm.envAddress("LIQUIDITY_POOL_ADDRESS");
        address oracleConsumerAddress = vm.envAddress("ORACLE_CONSUMER_ADDRESS");
        address policyManagerAddress = vm.envAddress("POLICY_MANAGER_ADDRESS");
        
        // Load contracts
        LiquidityPool liquidityPool = LiquidityPool(payable(liquidityPoolAddress));
        OracleConsumer oracleConsumer = OracleConsumer(oracleConsumerAddress);
        PolicyManager policyManager = PolicyManager(payable(policyManagerAddress));
        
        console.log("=== Configuring Contracts ===");
        console.log("LiquidityPool:", address(liquidityPool));
        console.log("OracleConsumer:", address(oracleConsumer));
        console.log("PolicyManager:", address(policyManager));
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Optional: Update yield percentage
        uint256 newYieldPercentage = vm.envOr("YIELD_PERCENTAGE", uint256(7000));
        if (liquidityPool.yieldPercentage() != newYieldPercentage) {
            console.log("Updating yield percentage to:", newYieldPercentage);
            liquidityPool.setYieldPercentage(newYieldPercentage);
        }
        
        // Optional: Update oracle address
        address newOracleAddress = vm.envOr("NEW_ORACLE_ADDRESS", address(0));
        if (newOracleAddress != address(0) && oracleConsumer.oracleAddress() != newOracleAddress) {
            console.log("Updating oracle address to:", newOracleAddress);
            oracleConsumer.setOracleAddress(newOracleAddress);
        }
        
        // Optional: Update parameter limits
        uint256 minCoveragePeriod = vm.envOr("MIN_COVERAGE_PERIOD", uint256(1 days));
        uint256 maxCoveragePeriod = vm.envOr("MAX_COVERAGE_PERIOD", uint256(365 days));
        uint256 minPayoutAmount = vm.envOr("MIN_PAYOUT_AMOUNT", uint256(0.01 ether));
        uint256 maxPayoutAmount = vm.envOr("MAX_PAYOUT_AMOUNT", uint256(100 ether));
        
        if (policyManager.minCoveragePeriod() != minCoveragePeriod ||
            policyManager.maxCoveragePeriod() != maxCoveragePeriod ||
            policyManager.minPayoutAmount() != minPayoutAmount ||
            policyManager.maxPayoutAmount() != maxPayoutAmount) {
            console.log("Updating parameter limits...");
            policyManager.setParameterLimits(
                minCoveragePeriod,
                maxCoveragePeriod,
                minPayoutAmount,
                maxPayoutAmount
            );
        }
        
        // Optional: Update base premium rate
        uint256 basePremiumRate = vm.envOr("BASE_PREMIUM_RATE", uint256(500));
        if (policyManager.basePremiumRate() != basePremiumRate) {
            console.log("Updating base premium rate to:", basePremiumRate);
            policyManager.setBasePremiumRate(basePremiumRate);
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Configuration Complete ===");
        console.log("Current Settings:");
        console.log("  Yield Percentage:", liquidityPool.yieldPercentage(), "bp");
        console.log("  Oracle Address:", oracleConsumer.oracleAddress());
        console.log("  Min Coverage Period:", policyManager.minCoveragePeriod(), "seconds");
        console.log("  Max Coverage Period:", policyManager.maxCoveragePeriod(), "seconds");
        console.log("  Min Payout Amount:", policyManager.minPayoutAmount(), "wei");
        console.log("  Max Payout Amount:", policyManager.maxPayoutAmount(), "wei");
        console.log("  Base Premium Rate:", policyManager.basePremiumRate(), "bp");
    }
}
