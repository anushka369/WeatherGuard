# Setup Guide

This guide will help you set up the Weather Insurance dApp development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Foundry** - Smart contract development toolkit
2. **Node.js** (v18 or higher) - For frontend development
3. **Git** - Version control

## Step 1: Install Foundry

Foundry is required for smart contract development, testing, and deployment.

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Run foundryup to install forge, cast, anvil, and chisel
foundryup
```

Verify installation:
```bash
forge --version
```

## Step 2: Install OpenZeppelin Contracts

OpenZeppelin provides secure, audited smart contract libraries.

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Step 3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Add your private key, RPC URLs, and other settings
```

**Important**: Never commit your `.env` file with real private keys!

## Step 4: Build Smart Contracts

```bash
# Compile all contracts
forge build
```

If successful, you should see compiled contracts in the `out/` directory.

## Step 5: Run Smart Contract Tests

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv
```

## Step 6: Set Up Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Return to root directory
cd ..
```

## Step 7: Start Development

### Smart Contract Development

```bash
# Watch for changes and rebuild
forge build --watch

# Run tests continuously
forge test --watch
```

### Frontend Development

```bash
# Start React development server
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000`

## Step 8: Deploy to QIE Testnet (Optional)

Before deploying, ensure you have:
- QIE testnet tokens in your wallet
- Configured `QIE_TESTNET_RPC_URL` in `.env`
- Set your `PRIVATE_KEY` in `.env`

```bash
# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url qie_testnet --broadcast
```

## Troubleshooting

### Foundry Not Found

If you get "command not found: forge", ensure Foundry is in your PATH:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### OpenZeppelin Import Errors

If you see import errors for OpenZeppelin contracts:
```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge remappings > remappings.txt
```

### Frontend Build Errors

If npm install fails:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Review the requirements document: `.kiro/specs/weather-insurance-dapp/requirements.md`
2. Review the design document: `.kiro/specs/weather-insurance-dapp/design.md`
3. Check the task list: `.kiro/specs/weather-insurance-dapp/tasks.md`
4. Start implementing tasks in order

## Useful Commands

```bash
# Smart Contracts
forge build                    # Compile contracts
forge test                     # Run tests
forge test -vvv               # Run tests with verbose output
forge coverage                # Generate coverage report
forge fmt                     # Format Solidity code

# Frontend
npm start                     # Start dev server
npm test                      # Run tests
npm run build                 # Build for production

# Both
npm run build                 # Build contracts
npm run test                  # Run contract tests
```

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [React Documentation](https://react.dev/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)
