# Deployment Guide

This guide covers the deployment of the Weather Insurance dApp smart contracts to QIE network.

## Prerequisites

1. **Foundry installed**: Ensure you have Foundry installed
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment Setup**: Copy `.env.example` to `.env` and fill in the required values
   ```bash
   cp .env.example .env
   ```

3. **Required Environment Variables**:
   - `PRIVATE_KEY`: Your deployer wallet private key (without 0x prefix)
   - `ORACLE_ADDRESS`: The address of the authorized weather oracle
   - `QIE_TESTNET_RPC_URL` or `QIE_MAINNET_RPC_URL`: RPC endpoint for the network
   - `ETHERSCAN_API_KEY`: API key for contract verification (if applicable)

4. **Funded Wallet**: Ensure your deployer wallet has sufficient QIE tokens for:
   - Contract deployment gas fees
   - Initial testing (optional)

## Deployment Scripts

### 1. Basic Deployment (`Deploy.s.sol`)
Simple deployment script with minimal configuration. Good for local testing.

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url $QIE_TESTNET_RPC_URL --broadcast
```

### 2. Testnet Deployment (`DeployTestnet.s.sol`)
Comprehensive testnet deployment with testing-friendly parameters:
- Lower minimum payout amounts (0.001 ETH)
- Shorter minimum coverage periods (1 hour)
- Lower maximum payout amounts (10 ETH)
- Full configuration and verification

```bash
forge script script/DeployTestnet.s.sol:DeployTestnet --rpc-url $QIE_TESTNET_RPC_URL --broadcast --verify
```

### 3. Mainnet Deployment (`DeployMainnet.s.sol`)
Production-grade deployment with strict validation:
- Production parameter limits
- Comprehensive verification checks
- Safety validations
- Detailed logging

```bash
# WARNING: This deploys to mainnet with real funds
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url $QIE_MAINNET_RPC_URL --broadcast --verify --slow
```

## Deployment Process

### Step 1: Prepare Environment

1. Create and configure `.env` file:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

2. Verify your configuration:
   ```bash
   # Check deployer address
   cast wallet address --private-key $PRIVATE_KEY
   
   # Check balance
   cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $QIE_TESTNET_RPC_URL
   ```

### Step 2: Deploy Contracts

For testnet:
```bash
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url $QIE_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

For mainnet:
```bash
# Double-check everything before running!
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url $QIE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  -vvvv
```

### Step 3: Save Contract Addresses

After deployment, the script will output contract addresses. Save them to your `.env` file:

```bash
LIQUIDITY_POOL_ADDRESS=0x...
ORACLE_CONSUMER_ADDRESS=0x...
POLICY_MANAGER_ADDRESS=0x...
```

### Step 4: Verify Contracts (if not done automatically)

If verification failed during deployment, use the verification script:

```bash
forge script script/VerifyContracts.s.sol:VerifyContracts --rpc-url $QIE_TESTNET_RPC_URL
```

Or manually verify each contract:

```bash
# LiquidityPool
forge verify-contract $LIQUIDITY_POOL_ADDRESS \
  src/LiquidityPool.sol:LiquidityPool \
  --chain-id $CHAIN_ID \
  --watch

# OracleConsumer
forge verify-contract $ORACLE_CONSUMER_ADDRESS \
  src/OracleConsumer.sol:OracleConsumer \
  --constructor-args $(cast abi-encode "constructor(address)" $ORACLE_ADDRESS) \
  --chain-id $CHAIN_ID \
  --watch

# PolicyManager
forge verify-contract $POLICY_MANAGER_ADDRESS \
  src/PolicyManager.sol:PolicyManager \
  --constructor-args $(cast abi-encode "constructor(address)" $LIQUIDITY_POOL_ADDRESS) \
  --chain-id $CHAIN_ID \
  --watch
```

## Post-Deployment Configuration

### Update Configuration Parameters

Use the `ConfigureContracts.s.sol` script to update parameters after deployment:

```bash
# Set environment variables for new configuration
export YIELD_PERCENTAGE=7000  # 70%
export BASE_PREMIUM_RATE=500  # 5%

# Run configuration script
forge script script/ConfigureContracts.s.sol:ConfigureContracts \
  --rpc-url $QIE_TESTNET_RPC_URL \
  --broadcast
```

### Initial Testing

1. **Test Policy Creation**:
   ```bash
   cast send $POLICY_MANAGER_ADDRESS \
     "createPolicy(uint256,uint256,string,uint8,int256,uint8,uint256)" \
     $(date -d "+1 hour" +%s) \
     $(date -d "+8 days" +%s) \
     "New York" \
     0 \
     25 \
     0 \
     1000000000000000000 \
     --value 0.1ether \
     --private-key $PRIVATE_KEY \
     --rpc-url $QIE_TESTNET_RPC_URL
   ```

2. **Test Liquidity Deposit**:
   ```bash
   cast send $LIQUIDITY_POOL_ADDRESS \
     "deposit()" \
     --value 1ether \
     --private-key $PRIVATE_KEY \
     --rpc-url $QIE_TESTNET_RPC_URL
   ```

3. **Check Pool Stats**:
   ```bash
   cast call $LIQUIDITY_POOL_ADDRESS \
     "getPoolStats()" \
     --rpc-url $QIE_TESTNET_RPC_URL
   ```

## Contract Interactions

### Read Operations (No Gas)

```bash
# Get policy details
cast call $POLICY_MANAGER_ADDRESS "getPolicy(uint256)" 0 --rpc-url $QIE_TESTNET_RPC_URL

# Get user policies
cast call $POLICY_MANAGER_ADDRESS "getUserPolicies(address)" $YOUR_ADDRESS --rpc-url $QIE_TESTNET_RPC_URL

# Get pool statistics
cast call $LIQUIDITY_POOL_ADDRESS "getPoolStats()" --rpc-url $QIE_TESTNET_RPC_URL

# Get LP token balance
cast call $LIQUIDITY_POOL_ADDRESS "lpTokenBalances(address)" $YOUR_ADDRESS --rpc-url $QIE_TESTNET_RPC_URL
```

### Write Operations (Requires Gas)

```bash
# Create policy from template
cast send $POLICY_MANAGER_ADDRESS \
  "createPolicyFromTemplate(uint8,string,uint256)" \
  0 \
  "Location" \
  0 \
  --value 0.1ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL

# Deposit liquidity
cast send $LIQUIDITY_POOL_ADDRESS \
  "deposit()" \
  --value 1ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL

# Withdraw liquidity
cast send $LIQUIDITY_POOL_ADDRESS \
  "withdraw(uint256)" \
  1000000000000000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL
```

## Admin Operations

### Update Oracle Address

```bash
cast send $ORACLE_CONSUMER_ADDRESS \
  "setOracleAddress(address)" \
  $NEW_ORACLE_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL
```

### Update Yield Percentage

```bash
cast send $LIQUIDITY_POOL_ADDRESS \
  "setYieldPercentage(uint256)" \
  7000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL
```

### Pause/Unpause System

```bash
# Pause
cast send $POLICY_MANAGER_ADDRESS \
  "pause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL

# Unpause
cast send $POLICY_MANAGER_ADDRESS \
  "unpause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $QIE_TESTNET_RPC_URL
```

## Troubleshooting

### Deployment Fails

1. **Insufficient Gas**: Increase gas limit
   ```bash
   --gas-limit 10000000
   ```

2. **Nonce Issues**: Reset nonce or wait for pending transactions
   ```bash
   cast nonce $DEPLOYER_ADDRESS --rpc-url $QIE_TESTNET_RPC_URL
   ```

3. **RPC Issues**: Try a different RPC endpoint or add retry logic
   ```bash
   --slow --retries 3
   ```

### Verification Fails

1. **Wait for block confirmations**: Some explorers need time
2. **Check constructor arguments**: Ensure they match deployment
3. **Flatten contracts**: If imports cause issues
   ```bash
   forge flatten src/LiquidityPool.sol > LiquidityPoolFlat.sol
   ```

### Configuration Issues

1. **Check ownership**: Ensure you're the owner
   ```bash
   cast call $LIQUIDITY_POOL_ADDRESS "owner()" --rpc-url $QIE_TESTNET_RPC_URL
   ```

2. **Check current values**: Before updating
   ```bash
   cast call $LIQUIDITY_POOL_ADDRESS "yieldPercentage()" --rpc-url $QIE_TESTNET_RPC_URL
   ```

## Security Considerations

### Before Mainnet Deployment

1. ✅ All tests passing
2. ✅ Security audit completed (recommended)
3. ✅ Testnet deployment tested thoroughly
4. ✅ Oracle address verified and trusted
5. ✅ Parameter limits reviewed
6. ✅ Emergency procedures documented
7. ✅ Multisig wallet prepared for ownership transfer

### After Mainnet Deployment

1. **Transfer Ownership**: Consider using a multisig wallet
   ```bash
   cast send $LIQUIDITY_POOL_ADDRESS \
     "transferOwnership(address)" \
     $MULTISIG_ADDRESS \
     --private-key $PRIVATE_KEY \
     --rpc-url $QIE_MAINNET_RPC_URL
   ```

2. **Monitor Events**: Set up event monitoring
3. **Test with Small Amounts**: Before announcing publicly
4. **Document Addresses**: Keep secure backup of all addresses
5. **Set Up Alerts**: For unusual activity

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Deployer wallet funded
- [ ] Oracle address verified
- [ ] Testnet deployment successful
- [ ] Contracts verified on explorer
- [ ] Basic functionality tested
- [ ] Configuration parameters set
- [ ] Admin functions tested
- [ ] Documentation updated with addresses
- [ ] Frontend configuration updated
- [ ] Monitoring set up
- [ ] Security review completed (for mainnet)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review contract events for error details
3. Consult the design document for expected behavior
4. Check Foundry documentation for tooling issues

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Cast Documentation](https://book.getfoundry.sh/cast/)
- [QIE Network Documentation](https://docs.qie.network)
- Project Design Document: `.kiro/specs/weather-insurance-dapp/design.md`
- Project Requirements: `.kiro/specs/weather-insurance-dapp/requirements.md`
