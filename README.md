# WeatherGuard

The Decentralized Weather Insurance dApp is a blockchain-based parametric weather insurance platform built on QIE blochchain that enables users to purchase parametric weather insurance policies. The system leverages oracle-provided weather data to automatically execute insurance payouts when predefined conditions are met. This eliminates traditional insurance friction, reduces costs, and provides instant, trustless claim settlements. 

Target users include farmers protecting crops, event organizers hedging against weather disruptions, and travelers seeking weather-related coverage. The system consists of three main smart contracts: the PolicyManager for handling insurance policies, the LiquidityPool for managing funds and liquidity providers, and the OracleConsumer for integrating weather data. 

A React-based web interface provides user-friendly access to all functionality. The architecture takes advantage of QIE's high throughput (25,000+ TPS), near-zero fees, and 3-second finality to enable instant policy purchases and claim settlements. The system uses a liquidity pool model where providers deposit funds to back policies and earn yields from premiums, creating a sustainable insurance marketplace.

---

## Features

- **Parametric Insurance**: Purchase weather insurance with customizable trigger conditions
- **Automatic Claims**: Instant payouts when weather conditions are met
- **Liquidity Pool**: Earn yields by providing insurance capacity
- **QIE Blockchain**: Leverages 25,000+ TPS, near-zero fees, and 3-second finality

---

## Project Structure

```
.
├── src/                    # Smart contracts
│   ├── PolicyManager.sol
│   ├── LiquidityPool.sol
│   └── OracleConsumer.sol
├── test/                   # Contract tests
├── script/                 # Deployment scripts
├── frontend/               # React web interface
│   └── src/
│       ├── components/     # React components
│       ├── hooks/          # Custom React hooks
│       ├── utils/          # Utility functions
│       ├── contexts/       # React contexts
│       └── types/          # TypeScript types
└── foundry.toml           # Foundry configuration

```
---

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) - Smart contract development toolkit
- [Node.js](https://nodejs.org/) (v18+) - For frontend development
- [Git](https://git-scm.com/) - Version control

---

## Installation

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Install Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Install frontend dependencies
cd frontend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## Smart Contract Development

### Build Contracts

```bash
forge build
```

### Run Tests

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testPolicyCreation
```

### Deploy Contracts

```bash
# Deploy to QIE testnet
forge script script/Deploy.s.sol --rpc-url qie_testnet --broadcast

# Deploy to QIE mainnet
forge script script/Deploy.s.sol --rpc-url qie_mainnet --broadcast
```

---

## Frontend Development

```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

---

## QIE Network Configuration

### Testnet
- RPC URL: https://rpc-testnet.qie.network
- Chain ID: [To be configured]
- Explorer: https://explorer-testnet.qie.network

### Mainnet
- RPC URL: https://rpc.qie.network
- Chain ID: [To be configured]
- Explorer: https://explorer.qie.network

---

## Architecture

The system consists of three main smart contracts:

1. **PolicyManager**: Handles insurance policy creation and management
2. **LiquidityPool**: Manages funds and liquidity provider operations
3. **OracleConsumer**: Integrates with weather oracles for data verification

---

## Testing Strategy

- **Unit Tests**: Test individual contract functions
- **Property-Based Tests**: Verify correctness properties across random inputs (100+ iterations)
- **Integration Tests**: Test complete user flows end-to-end

---

## Security

- Reentrancy guards on all external calls
- Access control with OpenZeppelin's Ownable/AccessControl
- Oracle signature verification
- Emergency pause functionality

---

## License

MIT

---
