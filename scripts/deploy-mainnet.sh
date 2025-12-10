#!/bin/bash

# Weather Insurance dApp - Mainnet Deployment Script
# This script deploys all contracts to QIE mainnet with safety checks

set -e

echo "========================================="
echo "Weather Insurance dApp Deployment"
echo "Target: QIE MAINNET"
echo "WARNING: This is a PRODUCTION deployment"
echo "========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$ORACLE_ADDRESS" ]; then
    echo "Error: ORACLE_ADDRESS not set in .env"
    exit 1
fi

if [ -z "$QIE_MAINNET_RPC_URL" ]; then
    echo "Error: QIE_MAINNET_RPC_URL not set in .env"
    exit 1
fi

# Display deployer info
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer Address: $DEPLOYER_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $QIE_MAINNET_RPC_URL)
BALANCE_ETH=$(cast --to-unit $BALANCE ether)
echo "Deployer Balance: $BALANCE_ETH ETH"
echo ""

# Display configuration
echo "Configuration:"
echo "  Oracle Address: $ORACLE_ADDRESS"
echo ""

# Safety checks
echo "Pre-deployment Safety Checks:"
echo ""

# Check if oracle address is valid
if [ "$ORACLE_ADDRESS" == "0x0000000000000000000000000000000000000000" ]; then
    echo "❌ Error: Oracle address is zero address!"
    exit 1
fi
echo "✓ Oracle address is valid"

# Check if deployer has sufficient balance (at least 0.1 ETH)
MIN_BALANCE=100000000000000000  # 0.1 ETH in wei
if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo "❌ Error: Insufficient balance for deployment!"
    echo "   Minimum required: 0.1 ETH"
    exit 1
fi
echo "✓ Deployer has sufficient balance"

# Check if all tests pass
echo ""
echo "Running tests before deployment..."
if forge test; then
    echo "✓ All tests passed"
else
    echo "❌ Error: Tests failed!"
    echo "   Fix failing tests before deploying to mainnet."
    exit 1
fi

echo ""
echo "========================================="
echo "FINAL CONFIRMATION"
echo "========================================="
echo ""
echo "You are about to deploy to MAINNET with:"
echo "  Deployer: $DEPLOYER_ADDRESS"
echo "  Balance: $BALANCE_ETH ETH"
echo "  Oracle: $ORACLE_ADDRESS"
echo ""
echo "This action cannot be undone!"
echo ""

# Triple confirmation for mainnet
read -p "Type 'DEPLOY TO MAINNET' to continue: " CONFIRMATION
if [ "$CONFIRMATION" != "DEPLOY TO MAINNET" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Starting mainnet deployment..."
echo ""

# Run deployment script with extra safety
forge script script/DeployMainnet.s.sol:DeployMainnet \
    --rpc-url $QIE_MAINNET_RPC_URL \
    --broadcast \
    --verify \
    --slow \
    -vvvv

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "IMPORTANT: Next steps:"
echo "1. IMMEDIATELY save the contract addresses securely"
echo "2. Verify contracts on block explorer"
echo "3. Test with small amounts before announcing"
echo "4. Consider transferring ownership to multisig"
echo "5. Set up monitoring and alerts"
echo "6. Update frontend configuration"
echo "7. Document deployment in your records"
