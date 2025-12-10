#!/bin/bash

# Weather Insurance dApp - Testnet Deployment Script
# This script deploys all contracts to QIE testnet

set -e

echo "==================================="
echo "Weather Insurance dApp Deployment"
echo "Target: QIE Testnet"
echo "==================================="
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

if [ -z "$QIE_TESTNET_RPC_URL" ]; then
    echo "Error: QIE_TESTNET_RPC_URL not set in .env"
    exit 1
fi

# Display deployer info
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer Address: $DEPLOYER_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $QIE_TESTNET_RPC_URL)
echo "Deployer Balance: $BALANCE wei"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Starting deployment..."
echo ""

# Run deployment script
forge script script/DeployTestnet.s.sol:DeployTestnet \
    --rpc-url $QIE_TESTNET_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "==================================="
echo "Deployment Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Save the contract addresses to your .env file"
echo "2. Update frontend configuration"
echo "3. Test basic functionality"
echo "4. Verify contracts on block explorer"
