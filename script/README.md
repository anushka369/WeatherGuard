# Deployment Scripts

This directory contains deployment and configuration scripts for the Weather Insurance dApp smart contracts.

## Available Scripts

### Deployment Scripts

1. **Deploy.s.sol** - Basic deployment script
   - Simple deployment with minimal configuration
   - Good for local testing and development
   - Usage: `forge script script/Deploy.s.sol:Deploy --rpc-url <RPC_URL> --broadcast`

2. **DeployTestnet.s.sol** - Testnet deployment script
   - Comprehensive testnet deployment
   - Testing-friendly parameters (lower minimums, shorter periods)
   - Includes verification and detailed logging
   - Usage: `forge script script/DeployTestnet.s.sol:DeployTestnet --rpc-url $QIE_TESTNET_RPC_URL --broadcast --verify`

3. **DeployMainnet.s.sol** - Mainnet deployment script
   - Production-grade deployment with strict validation
   - Comprehensive verification checks after each step
   - Safety validations and detailed logging
   - Usage: `forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url $QIE_MAINNET_RPC_URL --broadcast --verify --slow`

### Configuration Scripts

4. **ConfigureContracts.s.sol** - Post-deployment configuration
   - Update contract parameters after deployment
   - Change yield percentage, oracle address, parameter limits, etc.
   - Usage: `forge script script/ConfigureContracts.s.sol:ConfigureContracts --rpc-url <RPC_URL> --broadcast`

5. **VerifyContracts.s.sol** - Contract verification helper
   - Generates verification commands for deployed contracts
   - Useful if automatic verification fails during deployment
   - Usage: `forge script script/VerifyContracts.s.sol:VerifyContracts --rpc-url <RPC_URL>`

## Deployment Order

The contracts are deployed in the following order:

1. **LiquidityPool** - Deployed first (no dependencies)
2. **OracleConsumer** - Deployed with oracle address parameter
3. **PolicyManager** - Deployed with LiquidityPool address

After deployment, the contracts are configured:
- LiquidityPool.setPolicyManager(PolicyManager address)
- OracleConsumer.setPolicyManager(PolicyManager address)
- PolicyManager.setOracleConsumer(OracleConsumer address)

## Configuration Parameters

### Testnet Configuration
- Yield Percentage: 7000 bp (70%)
- Min Coverage Period: 1 hour
- Max Coverage Period: 90 days
- Min Payout Amount: 0.001 ETH
- Max Payout Amount: 10 ETH
- Base Premium Rate: 500 bp (5%)

### Mainnet Configuration
- Yield Percentage: 7000 bp (70%)
- Min Coverage Period: 1 day
- Max Coverage Period: 365 days
- Min Payout Amount: 0.01 ETH
- Max Payout Amount: 100 ETH
- Base Premium Rate: 500 bp (5%)

## Environment Variables Required

Create a `.env` file with the following variables:

```bash
# Required for all deployments
PRIVATE_KEY=your_private_key_here
ORACLE_ADDRESS=0x...

# Network RPC URLs
QIE_TESTNET_RPC_URL=https://rpc-testnet.qie.network
QIE_MAINNET_RPC_URL=https://rpc.qie.network

# For verification
ETHERSCAN_API_KEY=your_api_key_here
CHAIN_ID=12345

# Filled after deployment
LIQUIDITY_POOL_ADDRESS=
ORACLE_CONSUMER_ADDRESS=
POLICY_MANAGER_ADDRESS=
```

## Quick Start

### Testnet Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your values

# 2. Deploy to testnet
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url $QIE_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# 3. Save contract addresses to .env
```

### Mainnet Deployment

```bash
# 1. Ensure testnet deployment is tested
# 2. Run all tests
forge test

# 3. Deploy to mainnet (with caution!)
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $QIE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  -vvvv

# 4. Immediately save contract addresses securely
```

## Shell Scripts

For convenience, bash scripts are provided in the `scripts/` directory:

- `scripts/deploy-testnet.sh` - Automated testnet deployment with checks
- `scripts/deploy-mainnet.sh` - Automated mainnet deployment with safety checks

Make them executable:
```bash
chmod +x scripts/deploy-testnet.sh scripts/deploy-mainnet.sh
```

Run them:
```bash
./scripts/deploy-testnet.sh
./scripts/deploy-mainnet.sh
```

## Verification

If automatic verification fails, use the VerifyContracts script:

```bash
forge script script/VerifyContracts.s.sol:VerifyContracts --rpc-url <RPC_URL>
```

Or verify manually:

```bash
# LiquidityPool
forge verify-contract $LIQUIDITY_POOL_ADDRESS \
  src/LiquidityPool.sol:LiquidityPool \
  --chain-id $CHAIN_ID

# OracleConsumer
forge verify-contract $ORACLE_CONSUMER_ADDRESS \
  src/OracleConsumer.sol:OracleConsumer \
  --constructor-args $(cast abi-encode "constructor(address)" $ORACLE_ADDRESS) \
  --chain-id $CHAIN_ID

# PolicyManager
forge verify-contract $POLICY_MANAGER_ADDRESS \
  src/PolicyManager.sol:PolicyManager \
  --constructor-args $(cast abi-encode "constructor(address)" $LIQUIDITY_POOL_ADDRESS) \
  --chain-id $CHAIN_ID
```

## Post-Deployment

After deployment:

1. Save all contract addresses securely
2. Verify contracts on block explorer
3. Test basic functionality with small amounts
4. Update frontend configuration
5. Set up monitoring and alerts
6. Consider transferring ownership to multisig (mainnet)

## Troubleshooting

### Deployment Fails
- Check deployer balance: `cast balance $DEPLOYER_ADDRESS --rpc-url <RPC_URL>`
- Check nonce: `cast nonce $DEPLOYER_ADDRESS --rpc-url <RPC_URL>`
- Increase gas limit: `--gas-limit 10000000`
- Add retries: `--slow --retries 3`

### Verification Fails
- Wait for block confirmations
- Check constructor arguments match deployment
- Try manual verification
- Flatten contracts if needed: `forge flatten src/Contract.sol`

### Configuration Issues
- Check ownership: `cast call $CONTRACT_ADDRESS "owner()" --rpc-url <RPC_URL>`
- Verify current values before updating
- Ensure you're using the correct private key

## Security Notes

- Never commit `.env` file with real private keys
- Use a dedicated deployer wallet
- Test thoroughly on testnet before mainnet
- Consider using a hardware wallet for mainnet deployments
- Transfer ownership to multisig after mainnet deployment
- Keep secure backups of all contract addresses

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Deployment Guide](../DEPLOYMENT.md)
- [Design Document](../.kiro/specs/weather-insurance-dapp/design.md)
