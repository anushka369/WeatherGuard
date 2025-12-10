// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityPool.sol";
import "../src/OracleConsumer.sol";
import "../src/PolicyManager.sol";

/**
 * @title Deploy
 * @notice Basic deployment script for Weather Insurance dApp contracts
 * @dev Deploys contracts in correct order with minimal configuration
 * @dev For testnet use DeployTestnet.s.sol, for mainnet use DeployMainnet.s.sol
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envOr("ORACLE_ADDRESS", address(0));
        
        require(oracleAddress != address(0), "ORACLE_ADDRESS not set in .env");
        
        console.log("=== Starting Basic Deployment ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Oracle Address:", oracleAddress);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy LiquidityPool first
        console.log("Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool();
        console.log("  LiquidityPool deployed at:", address(liquidityPool));

        // Deploy OracleConsumer with oracle address
        console.log("Deploying OracleConsumer...");
        OracleConsumer oracleConsumer = new OracleConsumer(oracleAddress);
        console.log("  OracleConsumer deployed at:", address(oracleConsumer));

        // Deploy PolicyManager with dependencies
        console.log("Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(address(liquidityPool));
        console.log("  PolicyManager deployed at:", address(policyManager));
        
        // Configure contracts
        console.log("Configuring contracts...");
        liquidityPool.setPolicyManager(address(policyManager));
        oracleConsumer.setPolicyManager(address(policyManager));
        policyManager.setOracleConsumer(address(oracleConsumer));
        console.log("  Configuration complete");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("LiquidityPool:  ", address(liquidityPool));
        console.log("OracleConsumer: ", address(oracleConsumer));
        console.log("PolicyManager:  ", address(policyManager));
        console.log("");
        console.log("Save these addresses to your .env file:");
        console.log("LIQUIDITY_POOL_ADDRESS=", address(liquidityPool));
        console.log("ORACLE_CONSUMER_ADDRESS=", address(oracleConsumer));
        console.log("POLICY_MANAGER_ADDRESS=", address(policyManager));
    }
}
