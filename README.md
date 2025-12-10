# Decentralized Weather Insurance dApp

A blockchain-based parametric weather insurance platform built on QIE that enables automatic payouts based on oracle-verified weather data. This system eliminates traditional insurance friction, reduces costs, and provides instant, trustless claim settlements.

## 🌟 Features

- **Parametric Insurance**: Purchase weather insurance with customizable trigger conditions
- **Automatic Claims**: Instant payouts when weather conditions are met, verified by oracles
- **Liquidity Pool**: Earn yields by providing insurance capacity to the pool
- **Policy Templates**: Pre-configured templates for common use cases (crop, event, travel insurance)
- **QIE Blockchain**: Leverages 25,000+ TPS, near-zero fees, and 3-second finality
- **Web Interface**: User-friendly React frontend for all operations
- **Real-time Updates**: Live notifications and dashboard updates via blockchain events

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [User Guides](#user-guides)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [License](#license)

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) - Smart contract development toolkit
- [Node.js](https://nodejs.org/) (v18+) - For frontend development
- [Git](https://git-scm.com/) - Version control
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd weather-insurance-dapp

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install smart contract dependencies
forge install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

### Build and Test

```bash
# Build smart contracts
forge build

# Run tests
forge test

# Start frontend development server
cd frontend
npm start
```

Visit `http://localhost:3000` to access the application.

## 📁 Project Structure

```
.
├── src/                        # Smart contracts
│   ├── PolicyManager.sol       # Policy creation and management
│   ├── LiquidityPool.sol       # Liquidity provider operations
│   └── OracleConsumer.sol      # Weather oracle integration
├── test/                       # Smart contract tests
│   ├── PolicyManager.t.sol     # Policy manager tests
│   ├── LiquidityPool.t.sol     # Liquidity pool tests
│   └── OracleConsumer.t.sol    # Oracle consumer tests
├── script/                     # Deployment scripts
│   ├── Deploy.s.sol            # Main deployment script
│   ├── DeployTestnet.s.sol     # Testnet deployment
│   ├── DeployMainnet.s.sol     # Mainnet deployment
│   └── ConfigureContracts.s.sol # Post-deployment configuration
├── frontend/                   # React web interface
│   └── src/
│       ├── components/         # React components
│       │   ├── WalletConnect.tsx
│       │   ├── PolicyPurchase.tsx
│       │   ├── Dashboard.tsx
│       │   ├── LiquidityProvider.tsx
│       │   └── AdminPanel.tsx
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Utility functions
│       ├── contexts/           # React contexts
│       └── types/              # TypeScript types
├── .kiro/specs/                # Specification documents
│   └── weather-insurance-dapp/
│       ├── requirements.md     # System requirements
│       ├── design.md           # Design document
│       └── tasks.md            # Implementation tasks
├── foundry.toml                # Foundry configuration
├── .env.example                # Environment variables template
├── SETUP.md                    # Detailed setup guide
└── DEPLOYMENT.md               # Deployment instructions
```

## 📜 Smart Contracts

### PolicyManager

Manages insurance policies, creation, and claim processing.

**Key Functions:**
- `createPolicy()` - Create a new insurance policy with custom parameters
- `createPolicyFromTemplate()` - Create a policy using a predefined template
- `evaluatePolicies()` - Process oracle weather data and trigger claims
- `getUserPolicies()` - Get all policies for a user
- `getUserClaims()` - Get claim history for a user

**Policy Templates:**
- **Crop Insurance**: Protection against low rainfall affecting crops
- **Event Insurance**: Coverage for outdoor events against rain
- **Travel Insurance**: Protection for travel plans against extreme cold

### LiquidityPool

Manages liquidity provider deposits, withdrawals, and fund backing.

**Key Functions:**
- `deposit()` - Deposit funds and receive LP tokens
- `withdraw()` - Burn LP tokens and withdraw proportional share
- `calculateYield()` - Calculate accumulated yield for a provider
- `getPoolStats()` - Get pool statistics (value, utilization, premiums, payouts)

**LP Token Economics:**
- LP tokens represent proportional ownership of the pool
- Yields are distributed from premiums collected (default 70%)
- Withdrawals are subject to available liquidity after liabilities

### OracleConsumer

Interfaces with weather oracles to receive and verify weather data.

**Key Functions:**
- `requestWeatherData()` - Request weather data from oracle
- `fulfillWeatherData()` - Receive and process oracle data (oracle only)
- `verifyOracleSignature()` - Verify oracle signature on data
- `setOracleAddress()` - Update authorized oracle address (admin only)

## 📖 User Guides

### For Policy Holders

#### Purchasing a Policy

1. **Connect Your Wallet**
   - Click "Connect Wallet" in the top right
   - Select MetaMask or your preferred wallet
   - Approve the connection request
   - Ensure you're on the QIE network

2. **Choose a Policy Template or Custom Parameters**
   - Navigate to "Purchase Policy" tab
   - Select a template (Crop, Event, or Travel) or choose "Custom"
   - Templates provide sensible defaults for common scenarios

3. **Configure Policy Parameters**
   - **Location**: Enter geographic identifier (e.g., "New York, NY")
   - **Weather Parameter**: Choose Temperature, Rainfall, Wind Speed, or Humidity
   - **Trigger Value**: Set the threshold that triggers payout
   - **Comparison**: Choose Greater Than, Less Than, or Equal To
   - **Coverage Period**: Set start and end dates
   - **Payout Amount**: Specify desired payout (0.01 - 100 ETH)

4. **Review and Purchase**
   - Review the calculated premium
   - Click "Purchase Policy"
   - Approve the transaction in your wallet
   - Wait for confirmation (typically 3 seconds on QIE)

5. **Track Your Policy**
   - View active policies in the Dashboard
   - Monitor weather conditions
   - Receive automatic notifications if triggered

#### Understanding Claims

Claims are **fully automatic**:
- Oracle submits weather data to the blockchain
- Smart contract evaluates all active policies
- If trigger conditions are met, payout is sent immediately
- You'll receive a notification and see the claim in your dashboard
- No manual claim submission required!

#### Policy Status

- **Active**: Policy is currently in effect and monitoring weather
- **Claimed**: Trigger conditions were met and payout was sent
- **Expired**: Coverage period ended without trigger
- **Cancelled**: Policy was cancelled (admin only)

### For Liquidity Providers

#### Providing Liquidity

1. **Connect Your Wallet**
   - Ensure you have QIE tokens to deposit

2. **Navigate to Liquidity Provider Tab**
   - View current pool statistics
   - Check utilization rate and historical performance

3. **Deposit Funds**
   - Enter deposit amount
   - Review LP tokens you'll receive
   - Click "Deposit"
   - Approve transaction

4. **Monitor Your Position**
   - View your LP token balance
   - Track your pool share percentage
   - Monitor accumulated yields
   - See projected earnings

5. **Withdraw Funds**
   - Enter LP tokens to burn
   - Review withdrawal amount
   - Click "Withdraw"
   - Funds returned to your wallet

#### Understanding Yields

- **Yield Source**: 70% of premiums collected (configurable by admin)
- **Calculation**: Proportional to your pool share
- **Risk**: Payouts reduce pool value and your share
- **Utilization**: Higher utilization = higher risk but potentially higher returns

#### Risk Management

**Key Metrics to Monitor:**
- **Pool Utilization**: Percentage of pool committed to potential payouts
- **Active Policies**: Number and total liability of active policies
- **Premium/Payout Ratio**: Historical performance indicator
- **Policies Near Trigger**: Policies close to payout conditions

**Risk Levels:**
- **Low Risk**: <30% utilization
- **Medium Risk**: 30-60% utilization
- **High Risk**: >60% utilization

**Best Practices:**
- Diversify across multiple pools if available
- Monitor utilization regularly
- Withdraw if utilization becomes uncomfortable
- Consider seasonal weather patterns

### For Administrators

#### Admin Panel Access

Only the contract owner can access admin functions.

#### Configuration Options

1. **Oracle Address**
   - Update the authorized weather oracle address
   - Ensures data comes from trusted source

2. **Policy Parameter Limits**
   - Set minimum/maximum coverage periods
   - Set minimum/maximum payout amounts
   - Prevents extreme or unreasonable policies

3. **Yield Percentage**
   - Adjust percentage of premiums distributed to LPs
   - Default: 70% (7000 basis points)
   - Range: 0-100%

4. **Premium Rate**
   - Adjust base premium calculation rate
   - Default: 5% of payout amount
   - Affects policy pricing

5. **Emergency Pause**
   - Pause new policy creation in emergencies
   - Existing policies and claims continue to function
   - Use for critical bugs or security issues

#### Monitoring System Health

**Key Metrics:**
- Total policies created
- Active policies count
- Total premiums collected
- Total payouts made
- Pool utilization rate
- Number of liquidity providers

**Event Logs:**
- Policy creation events
- Claim processing events
- Configuration changes
- Liquidity deposits/withdrawals

## 🛠 Development

### Building Contracts

```bash
# Compile all contracts
forge build

# Compile with optimization
forge build --optimize --optimizer-runs 200

# Watch for changes
forge build --watch
```

### Running Tests

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/PolicyManager.t.sol

# Run specific test function
forge test --match-test testPolicyCreation

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

### Frontend Development

```bash
cd frontend

# Start development server
npm start

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Build for production
npm run build

# Run linter
npm run lint
```

### Code Formatting

```bash
# Format Solidity code
forge fmt

# Check formatting
forge fmt --check

# Format TypeScript/JavaScript
cd frontend
npm run format
```

## 🚀 Deployment

### Testnet Deployment

```bash
# Configure environment
cp .env.example .env
# Edit .env with testnet RPC URL and private key

# Deploy contracts
forge script script/DeployTestnet.s.sol --rpc-url qie_testnet --broadcast --verify

# Or use the deployment script
./scripts/deploy-testnet.sh
```

### Mainnet Deployment

```bash
# Configure environment with mainnet settings
# IMPORTANT: Use a secure private key management solution

# Deploy contracts
forge script script/DeployMainnet.s.sol --rpc-url qie_mainnet --broadcast --verify

# Or use the deployment script
./scripts/deploy-mainnet.sh
```

### Post-Deployment Configuration

```bash
# Configure contracts
forge script script/ConfigureContracts.s.sol --rpc-url <network> --broadcast

# Verify contracts on block explorer
forge script script/VerifyContracts.s.sol --rpc-url <network>
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Testing

### Test Coverage

The project includes comprehensive testing:

- **Unit Tests**: Test individual contract functions
- **Property-Based Tests**: Verify correctness properties with 100+ random inputs
- **Integration Tests**: Test complete user flows end-to-end
- **Frontend Tests**: Component and integration tests

### Property-Based Testing

Each correctness property from the design document is tested:

- Property 1: Policy creation atomicity
- Property 2: Invalid parameter rejection
- Property 3: Policy data completeness
- Property 4: Deterministic trigger evaluation
- Property 5: Idempotent payout execution
- Property 6: Oracle signature verification
- Property 7-18: Additional correctness properties

### Running Specific Test Types

```bash
# Run property-based tests
forge test --match-test testProperty

# Run unit tests
forge test --match-test testUnit

# Run integration tests
forge test --match-test testIntegration
```

## 🔧 Troubleshooting

### Common Issues

#### Wallet Connection Issues

**Problem**: Wallet won't connect or shows wrong network

**Solutions:**
1. Ensure MetaMask is installed and unlocked
2. Check you're on the QIE network:
   - Open MetaMask
   - Click network dropdown
   - Select QIE or add custom network
3. Clear browser cache and reload
4. Try disconnecting and reconnecting wallet

**Adding QIE Network to MetaMask:**
1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Enter QIE network details:
   - Network Name: QIE Mainnet (or Testnet)
   - RPC URL: (from .env or docs)
   - Chain ID: (from .env or docs)
   - Currency Symbol: QIE
   - Block Explorer: (from .env or docs)

#### Transaction Failures

**Problem**: Transaction fails or reverts

**Common Causes:**
1. **Insufficient Balance**: Ensure you have enough QIE for premium + gas
2. **Invalid Parameters**: Check policy parameters are within limits
3. **Insufficient Liquidity**: Pool may not have enough funds
4. **Network Issues**: Try again or check network status

**Debugging:**
1. Check error message in MetaMask
2. View transaction on block explorer
3. Verify contract addresses are correct
4. Check gas limit is sufficient

#### Policy Not Triggering

**Problem**: Weather conditions met but no payout

**Possible Reasons:**
1. **Oracle Delay**: Weather data may not be submitted yet
2. **Coverage Period**: Ensure weather event occurred during coverage
3. **Trigger Conditions**: Verify exact trigger value and operator
4. **Policy Status**: Check policy is still active

**What to Do:**
1. Check policy status in dashboard
2. Verify coverage period includes the weather event
3. Review trigger conditions carefully
4. Wait for oracle to submit data (may take hours)
5. Contact support if issue persists

#### Liquidity Withdrawal Issues

**Problem**: Cannot withdraw liquidity

**Common Causes:**
1. **Insufficient LP Tokens**: Check your LP token balance
2. **High Utilization**: Pool may not have available liquidity
3. **Active Liabilities**: Too many active policies

**Solutions:**
1. Verify LP token balance
2. Check pool utilization rate
3. Wait for policies to expire or be claimed
4. Withdraw smaller amount

#### Frontend Not Loading

**Problem**: Frontend shows errors or won't load

**Solutions:**
1. Check console for errors (F12 in browser)
2. Verify contract addresses in environment
3. Ensure RPC endpoint is accessible
4. Clear browser cache
5. Rebuild frontend: `npm run build`

### Build Issues

#### Foundry Installation

**Problem**: `forge` command not found

**Solution:**
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Add to PATH
source ~/.bashrc  # or ~/.zshrc
```

#### OpenZeppelin Import Errors

**Problem**: Cannot find OpenZeppelin contracts

**Solution:**
```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Update remappings
forge remappings > remappings.txt
```

#### Frontend Build Errors

**Problem**: npm install fails or build errors

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Gas and Performance

#### High Gas Costs

**Problem**: Transactions cost too much gas

**Note**: QIE has near-zero fees, but if costs seem high:
1. Check you're on QIE network (not Ethereum)
2. Verify RPC endpoint is correct
3. Check network congestion

#### Slow Transactions

**Problem**: Transactions take too long

**Solutions:**
1. QIE has 3-second finality - if slower, check network status
2. Verify RPC endpoint is responsive
3. Try different RPC endpoint
4. Check block explorer for network issues

### Getting Help

If you encounter issues not covered here:

1. **Check Documentation**: Review SETUP.md and DEPLOYMENT.md
2. **Review Logs**: Check browser console and transaction logs
3. **Block Explorer**: View transaction details on QIE explorer
4. **GitHub Issues**: Search or create an issue
5. **Community**: Join community channels for support

## 🔒 Security

### Smart Contract Security

- **Reentrancy Protection**: All external calls protected with ReentrancyGuard
- **Access Control**: Admin functions restricted with Ownable pattern
- **Integer Overflow**: Solidity 0.8+ built-in overflow protection
- **Oracle Verification**: Signature verification on all oracle data
- **Emergency Pause**: System can be paused in emergencies
- **Audited Libraries**: Uses OpenZeppelin's audited contracts

### Best Practices

**For Users:**
- Never share your private key
- Verify contract addresses before interacting
- Start with small amounts to test
- Review transaction details before signing
- Use hardware wallet for large amounts

**For Developers:**
- Keep dependencies updated
- Run security analysis tools (Slither, Mythril)
- Conduct thorough testing before deployment
- Use testnet for initial testing
- Implement monitoring and alerting

**For Administrators:**
- Use multi-sig wallet for admin functions
- Implement timelock for critical changes
- Monitor system metrics regularly
- Have incident response plan
- Keep oracle address secure

### Audit Status

This project has not been formally audited. Use at your own risk, especially on mainnet.

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📚 Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [React Documentation](https://react.dev/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [QIE Network Documentation](https://docs.qie.network/)

## 📞 Support

- GitHub Issues: [Create an issue]
- Documentation: See docs/ folder
- Community: [Join our community]

---

Built with ❤️ for the QIE ecosystem
