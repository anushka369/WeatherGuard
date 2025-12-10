# Design Document

## Overview

The Decentralized Weather Insurance dApp is a parametric insurance platform built on the QIE blockchain that leverages oracle-provided weather data to automatically execute insurance payouts. The system consists of three main smart contracts: the PolicyManager for handling insurance policies, the LiquidityPool for managing funds and liquidity providers, and the OracleConsumer for integrating weather data. A React-based web interface provides user-friendly access to all functionality.

The architecture takes advantage of QIE's high throughput (25,000+ TPS), near-zero fees, and 3-second finality to enable instant policy purchases and claim settlements. The system uses a liquidity pool model where providers deposit funds to back policies and earn yields from premiums, creating a sustainable insurance marketplace.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Frontend                          │
│                    (React + Web3.js/Ethers)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ JSON-RPC
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     QIE Blockchain                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Policy     │  │  Liquidity   │  │   Oracle     │     │
│  │   Manager    │◄─┤     Pool     │◄─┤   Consumer   │     │
│  └──────────────┘  └──────────────┘  └──────┬───────┘     │
│                                               │              │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                                │
                                    ┌───────────▼──────────┐
                                    │  Weather Oracle      │
                                    │  (External Service)  │
                                    └──────────────────────┘
```

### Contract Interactions

1. **Policy Purchase Flow**: User → Frontend → PolicyManager → LiquidityPool (transfer premium)
2. **Claim Processing Flow**: WeatherOracle → OracleConsumer → PolicyManager → LiquidityPool (transfer payout)
3. **Liquidity Management Flow**: Provider → Frontend → LiquidityPool (deposit/withdraw)

## Components and Interfaces

### Smart Contracts

#### PolicyManager Contract

**Responsibilities:**
- Create and manage insurance policies
- Validate policy parameters
- Process claims based on oracle data
- Track policy states (active, claimed, expired)

**Key Functions:**
```solidity
function createPolicy(
    uint256 coveragePeriodStart,
    uint256 coveragePeriodEnd,
    string memory location,
    WeatherParameter parameterType,
    int256 triggerValue,
    ComparisonOperator operator,
    uint256 payoutAmount
) external payable returns (uint256 policyId)

function evaluatePolicies(
    string memory location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp
) external onlyOracle

function getPolicy(uint256 policyId) external view returns (Policy memory)

function getUserPolicies(address user) external view returns (uint256[] memory)

function getPolicyStatus(uint256 policyId) external view returns (PolicyStatus)
```

**State Variables:**
```solidity
struct Policy {
    address holder;
    uint256 coveragePeriodStart;
    uint256 coveragePeriodEnd;
    string location;
    WeatherParameter parameterType;
    int256 triggerValue;
    ComparisonOperator operator;
    uint256 premium;
    uint256 payoutAmount;
    PolicyStatus status;
    uint256 createdAt;
}

enum WeatherParameter { TEMPERATURE, RAINFALL, WIND_SPEED, HUMIDITY }
enum ComparisonOperator { GREATER_THAN, LESS_THAN, EQUAL_TO }
enum PolicyStatus { ACTIVE, CLAIMED, EXPIRED, CANCELLED }

mapping(uint256 => Policy) public policies;
mapping(address => uint256[]) public userPolicies;
uint256 public policyCounter;
```

#### LiquidityPool Contract

**Responsibilities:**
- Manage liquidity provider deposits and withdrawals
- Hold funds backing insurance policies
- Calculate and distribute yields to providers
- Execute payouts for valid claims

**Key Functions:**
```solidity
function deposit() external payable returns (uint256 lpTokens)

function withdraw(uint256 lpTokens) external returns (uint256 amount)

function transferPremium(uint256 amount) external onlyPolicyManager

function transferPayout(address recipient, uint256 amount) external onlyPolicyManager

function calculateYield(address provider) external view returns (uint256)

function getPoolStats() external view returns (
    uint256 totalValue,
    uint256 totalLiability,
    uint256 utilizationRate,
    uint256 totalPremiums,
    uint256 totalPayouts
)
```

**State Variables:**
```solidity
uint256 public totalPoolValue;
uint256 public totalLPTokens;
uint256 public totalPremiumsCollected;
uint256 public totalPayoutsMade;
uint256 public yieldPercentage; // Percentage of premiums distributed to LPs

mapping(address => uint256) public lpTokenBalances;
mapping(address => uint256) public depositTimestamps;
```

#### OracleConsumer Contract

**Responsibilities:**
- Interface with QIE weather oracles
- Validate oracle data signatures
- Forward verified weather data to PolicyManager
- Handle oracle callback functions

**Key Functions:**
```solidity
function requestWeatherData(
    string memory location,
    WeatherParameter parameterType
) external returns (bytes32 requestId)

function fulfillWeatherData(
    bytes32 requestId,
    string memory location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp
) external onlyOracle

function setOracleAddress(address newOracle) external onlyAdmin

function verifyOracleSignature(
    bytes memory data,
    bytes memory signature
) internal view returns (bool)
```

**State Variables:**
```solidity
address public oracleAddress;
mapping(bytes32 => bool) public pendingRequests;
mapping(bytes32 => WeatherDataRequest) public requests;

struct WeatherDataRequest {
    address requester;
    string location;
    WeatherParameter parameterType;
    uint256 timestamp;
    bool fulfilled;
}
```

### Frontend Components

#### PolicyPurchase Component
- Form for selecting policy parameters
- Real-time premium calculation
- Policy template selection
- Transaction confirmation

#### Dashboard Component
- Display active policies
- Show claim history
- Account balance and statistics
- Notification system for claims

#### LiquidityProvider Component
- Deposit/withdraw interface
- Pool statistics display
- Earnings calculator
- Position management

#### Admin Panel Component
- Oracle configuration
- System parameters adjustment
- Emergency pause functionality
- Analytics dashboard

## Data Models

### Policy Data Structure
```typescript
interface Policy {
  policyId: number;
  holder: string; // Ethereum address
  coveragePeriodStart: number; // Unix timestamp
  coveragePeriodEnd: number; // Unix timestamp
  location: string; // Geographic identifier
  parameterType: WeatherParameter;
  triggerValue: number;
  operator: ComparisonOperator;
  premium: bigint; // Wei amount
  payoutAmount: bigint; // Wei amount
  status: PolicyStatus;
  createdAt: number; // Unix timestamp
}

enum WeatherParameter {
  TEMPERATURE = 0,
  RAINFALL = 1,
  WIND_SPEED = 2,
  HUMIDITY = 3
}

enum ComparisonOperator {
  GREATER_THAN = 0,
  LESS_THAN = 1,
  EQUAL_TO = 2
}

enum PolicyStatus {
  ACTIVE = 0,
  CLAIMED = 1,
  EXPIRED = 2,
  CANCELLED = 3
}
```

### Liquidity Pool Data Structure
```typescript
interface PoolStats {
  totalValue: bigint;
  totalLiability: bigint;
  utilizationRate: number; // Percentage
  totalPremiums: bigint;
  totalPayouts: bigint;
  lpTokenSupply: bigint;
}

interface ProviderPosition {
  lpTokens: bigint;
  depositedAmount: bigint;
  poolShare: number; // Percentage
  accumulatedYield: bigint;
  depositTimestamp: number;
}
```

### Weather Data Structure
```typescript
interface WeatherData {
  location: string;
  parameterType: WeatherParameter;
  value: number;
  timestamp: number;
  oracleSignature: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Policy creation with premium transfer is atomic
*For any* valid policy purchase with correct premium payment, the system should create a new policy assigned to the user AND transfer the premium to the liquidity pool in a single atomic transaction, increasing the user's policy count by exactly one.
**Validates: Requirements 1.1, 1.5**

### Property 2: Invalid parameters are rejected
*For any* policy creation request with parameters outside acceptable ranges (invalid coverage periods, out-of-range trigger values, insufficient premium), the system should reject the request and not create a policy.
**Validates: Requirements 1.2**

### Property 3: Policy records contain all required data
*For any* created policy, querying the policy should return all specified parameters including coverage period, trigger conditions, premium amount, payout amount, and current status.
**Validates: Requirements 1.3, 4.2**

### Property 4: Trigger condition evaluation is deterministic
*For any* weather data point and policy with specific trigger conditions, evaluating whether the trigger is met should always produce the same result given the same inputs.
**Validates: Requirements 2.1**

### Property 5: Payout execution is complete and idempotent
*For any* policy with met trigger conditions, the system should transfer the payout amount from the liquidity pool to the policy holder's wallet and mark the policy as claimed, and any subsequent claim attempt on the same policy should be rejected.
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 6: Oracle signature verification prevents unauthorized data
*For any* weather data submission without a valid oracle signature, the system should reject the data and not process any policy evaluations based on it.
**Validates: Requirements 2.5**

### Property 7: LP token minting is proportional to deposit
*For any* liquidity deposit amount, the number of LP tokens minted should equal (deposit amount × total LP tokens) / total pool value, maintaining proportional ownership.
**Validates: Requirements 3.1**

### Property 8: Withdrawal returns proportional pool share
*For any* LP token burn during withdrawal, the amount returned should equal (LP tokens burned × total pool value) / total LP tokens, ensuring fair proportional distribution.
**Validates: Requirements 3.3**

### Property 9: Insufficient liquidity prevents withdrawal
*For any* withdrawal request where the pool's available funds (after accounting for active policy liabilities) are less than the requested amount, the system should reject the withdrawal and maintain the provider's LP tokens unchanged.
**Validates: Requirements 3.4**

### Property 10: Yield calculation accounts for premiums and payouts
*For any* liquidity provider's position, the accumulated yield should equal their proportional share of (total premiums collected - total payouts made) during their participation period, multiplied by the yield percentage.
**Validates: Requirements 3.2, 3.5**

### Property 11: User policy query returns only owned policies
*For any* user address, querying their policies should return all and only policies where that address is the holder, excluding policies owned by other addresses.
**Validates: Requirements 4.1**

### Property 12: Policy status filtering is accurate
*For any* policy list query, active policies should include only those with ACTIVE status and current time within coverage period, while expired and claimed policies should be correctly filtered out based on their status and timestamps.
**Validates: Requirements 4.4, 4.5**

### Property 13: Claim history retrieval is complete
*For any* policy holder address, querying claim history should return all processed claims with their timestamps and payout amounts, ordered chronologically.
**Validates: Requirements 4.3**

### Property 14: Configuration updates are restricted to admin
*For any* configuration change attempt (oracle address, parameter limits, yield percentage, system pause) by a non-admin address, the system should reject the change and maintain the current configuration unchanged.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 15: System pause prevents new policies but allows claims
*For any* system state where pause is active, new policy creation attempts should be rejected while existing policy claim processing should continue to function normally.
**Validates: Requirements 5.4**

### Property 16: Configuration changes emit events
*For any* successful configuration update by an admin, the system should emit an event containing the configuration parameter changed, old value, new value, and timestamp.
**Validates: Requirements 5.5**

### Property 17: Pool utilization calculation is accurate
*For any* pool state, the utilization rate should equal (sum of all active policy payout amounts) / (total pool value) × 100, representing the percentage of pool funds committed to potential payouts.
**Validates: Requirements 7.3**

### Property 18: Premium calculation is consistent
*For any* policy parameters (coverage period, payout amount, trigger conditions), calculating the required premium should always produce the same result given the same inputs and risk parameters.
**Validates: Requirements 6.2**

## Error Handling

### Smart Contract Error Handling

**Policy Creation Errors:**
- `InvalidCoveragePeriod`: Coverage start time is in the past or end time is before start time
- `InvalidTriggerValue`: Trigger value is outside acceptable parameter ranges
- `InsufficientPremium`: Provided premium is less than calculated required amount
- `SystemPaused`: New policy creation attempted while system is paused

**Claim Processing Errors:**
- `PolicyNotActive`: Claim attempted on expired, claimed, or cancelled policy
- `InvalidOracleSignature`: Weather data signature verification failed
- `InsufficientPoolFunds`: Pool lacks funds to execute payout
- `UnauthorizedOracle`: Weather data submitted by non-authorized oracle address

**Liquidity Pool Errors:**
- `ZeroDeposit`: Attempted deposit with zero value
- `InsufficientLPTokens`: Withdrawal requested exceeds user's LP token balance
- `InsufficientLiquidity`: Pool cannot fulfill withdrawal request
- `WithdrawalLocked`: Attempted withdrawal during lock period (if implemented)

**Access Control Errors:**
- `OnlyAdmin`: Function called by non-admin address
- `OnlyPolicyManager`: LiquidityPool function called by unauthorized contract
- `OnlyOracle`: OracleConsumer function called by non-oracle address

### Frontend Error Handling

**Network Errors:**
- Display user-friendly messages for RPC connection failures
- Implement retry logic with exponential backoff
- Show network status indicator

**Transaction Errors:**
- Parse revert reasons from failed transactions
- Display specific error messages to users
- Provide transaction hash for debugging

**Validation Errors:**
- Real-time form validation with clear error messages
- Prevent submission of invalid data
- Highlight problematic fields

**Wallet Errors:**
- Handle wallet connection failures gracefully
- Detect and prompt for network switching to QIE
- Handle insufficient balance scenarios

## Testing Strategy

### Unit Testing

**Smart Contract Unit Tests:**
- Test policy creation with valid and invalid parameters
- Test claim processing logic with various weather data scenarios
- Test liquidity deposit and withdrawal calculations
- Test access control restrictions on admin functions
- Test edge cases: zero values, boundary conditions, expired policies
- Test event emissions for all state-changing functions

**Frontend Unit Tests:**
- Test component rendering with various props
- Test form validation logic
- Test utility functions for calculations and formatting
- Test state management and data flow

### Property-Based Testing

The system will use **Foundry's property-based testing framework** for Solidity smart contracts. Each property test will run a minimum of 100 iterations with randomly generated inputs.

**Property Test Requirements:**
- Each test must be tagged with a comment referencing the design document property
- Tag format: `// Feature: weather-insurance-dapp, Property {number}: {property_text}`
- Each correctness property must be implemented by a single property-based test
- Tests should use Foundry's fuzzing capabilities to generate diverse inputs

**Property Test Coverage:**
- Policy creation and state transitions (Properties 1-4)
- Claim evaluation and payout logic (Properties 5-7)
- Liquidity pool token economics (Properties 8-10)
- Query and filtering logic (Properties 11-12)
- Access control and authorization (Properties 13-14)
- Mathematical calculations (Property 15)

### Integration Testing

**Contract Integration Tests:**
- Test complete policy purchase flow from user to liquidity pool
- Test end-to-end claim processing from oracle data to payout
- Test liquidity provider deposit, yield accumulation, and withdrawal cycle
- Test admin configuration changes and their effects on system behavior

**Frontend Integration Tests:**
- Test wallet connection and transaction signing
- Test policy purchase flow through UI
- Test real-time data updates from blockchain events
- Test error handling and user feedback

### Testing Tools and Frameworks

**Smart Contracts:**
- Foundry for Solidity testing and property-based testing
- Hardhat for deployment scripts and additional testing
- Slither for static analysis and security checks

**Frontend:**
- Jest for unit testing React components
- React Testing Library for component integration tests
- Cypress for end-to-end testing

**Test Coverage Goals:**
- Smart contracts: >95% line coverage, 100% critical path coverage
- Frontend: >80% line coverage for business logic

## Deployment and Configuration

### Smart Contract Deployment Sequence

1. Deploy LiquidityPool contract
2. Deploy OracleConsumer contract with oracle address
3. Deploy PolicyManager contract with LiquidityPool and OracleConsumer addresses
4. Configure LiquidityPool to accept calls from PolicyManager
5. Configure OracleConsumer to forward data to PolicyManager
6. Set initial system parameters (yield percentage, parameter limits)

### QIE-Specific Configuration

**Network Parameters:**
- Chain ID: [QIE mainnet/testnet chain ID]
- RPC Endpoint: [QIE RPC URL]
- Block Explorer: [QIE explorer URL]
- Gas Price: Near-zero (leverage QIE's low fee advantage)

**Oracle Integration:**
- Oracle Contract Address: [QIE weather oracle address]
- Supported Weather Parameters: Temperature, Rainfall, Wind Speed, Humidity
- Data Update Frequency: [Based on oracle specifications]
- Oracle Fee: [If applicable]

### Frontend Deployment

- Host on decentralized storage (IPFS) or traditional hosting
- Configure Web3 provider for QIE network
- Set contract addresses in environment variables
- Enable wallet connection (MetaMask, WalletConnect)

## Security Considerations

**Smart Contract Security:**
- Implement reentrancy guards on all external calls
- Use SafeMath or Solidity 0.8+ overflow protection
- Implement access control with OpenZeppelin's Ownable/AccessControl
- Add emergency pause functionality for critical bugs
- Conduct thorough testing before mainnet deployment

**Oracle Security:**
- Verify oracle signatures on all data submissions
- Implement oracle address whitelist
- Add timestamp validation to prevent replay attacks
- Consider multi-oracle consensus for critical decisions

**Economic Security:**
- Set maximum policy payout limits to prevent pool drainage
- Implement minimum liquidity requirements
- Add withdrawal delays if needed for security
- Monitor pool utilization and adjust parameters

**Frontend Security:**
- Validate all user inputs before blockchain submission
- Display transaction details for user verification
- Implement rate limiting on API calls
- Use secure wallet connection libraries
