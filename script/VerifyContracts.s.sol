// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityPool.sol";
import "../src/OracleConsumer.sol";
import "../src/PolicyManager.sol";

/**
 * @title VerifyContracts
 * @notice Script to verify deployed contracts on block explorer
 * @dev Generates verification commands for all deployed contracts
 */
contract VerifyContracts is Script {
    function run() external view {
        // Load deployed contract addresses from environment
        address liquidityPoolAddress = vm.envAddress("LIQUIDITY_POOL_ADDRESS");
        address oracleConsumerAddress = vm.envAddress("ORACLE_CONSUMER_ADDRESS");
        address policyManagerAddress = vm.envAddress("POLICY_MANAGER_ADDRESS");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        
        // Optional: Chain ID for verification
        uint256 chainId = vm.envOr("CHAIN_ID", block.chainid);
        
        console.log("=== Contract Verification Commands ===");
        console.log("");
        console.log("Chain ID:", chainId);
        console.log("");
        
        console.log("1. Verify LiquidityPool:");
        console.log("forge verify-contract \\");
        console.log("  ", liquidityPoolAddress, "\\");
        console.log("  src/LiquidityPool.sol:LiquidityPool \\");
        console.log("  --chain-id", chainId, "\\");
        console.log("  --watch");
        console.log("");
        
        console.log("2. Verify OracleConsumer:");
        console.log("forge verify-contract \\");
        console.log("  ", oracleConsumerAddress, "\\");
        console.log("  src/OracleConsumer.sol:OracleConsumer \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address)' ", oracleAddress, ") \\");
        console.log("  --chain-id", chainId, "\\");
        console.log("  --watch");
        console.log("");
        
        console.log("3. Verify PolicyManager:");
        console.log("forge verify-contract \\");
        console.log("  ", policyManagerAddress, "\\");
        console.log("  src/PolicyManager.sol:PolicyManager \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address)' ", liquidityPoolAddress, ") \\");
        console.log("  --chain-id", chainId, "\\");
        console.log("  --watch");
        console.log("");
        
        console.log("Note: Make sure ETHERSCAN_API_KEY is set in your .env file");
        console.log("For QIE network, use the appropriate block explorer API key");
    }
}
