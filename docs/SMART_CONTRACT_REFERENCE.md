# Smart Contract Reference

Complete reference documentation for all smart contract functions.

## Table of Contents

- [PolicyManager](#policymanager)
- [LiquidityPool](#liquiditypool)
- [OracleConsumer](#oracleconsumer)

---

## PolicyManager

The PolicyManager contract handles insurance policy creation, management, and claim processing.

### State Variables

#### Policy Parameters

```solidity
uint256 public minCoveragePeriod    // Minimum coverage duration (default: 1 day)
uint256 public maxCoveragePeriod    // Maximum coverage duration (default: 365 days)
uint256 public minPayoutAmount      // Minimum payout (default: 0.01 ether)
uint256 public maxPayoutAmount      // Maximum payout (default: 100 ether)
uint256 public basePremiumRate      // Base premium rate in basis points (default: 500 = 5%)
```

#### Counters and Mappings

```solidity
uint256 public policyCounter                        // Total policies created
mapping(uint256 => Policy) public policies          // Policy ID to Policy
mapping(address => uint256[]) public userPolicies   // User to policy IDs
mapping(uint256 => bool) public claimedPolicies     // Policy ID to claimed status
mapping(address => Claim[]) public userClaims       // User to claims
```

### Data Structures

#### Policy Struct

```solidity
struct Policy {
    address holder;                 // Policy owner address
    uint256 coveragePeriodStart;    // Coverage start timestamp
    uint256 coveragePeriodEnd;      // Coverage end timestamp
    string location;                // Geographic location
    WeatherParameter parameterType; // Weather parameter type
    int256 triggerValue;            // Trigger threshold value
    ComparisonOperator operator;    // Comparison operator
    uint256 premium;                // Premium paid
    uint256 payoutAmount;           // Payout amount if triggered
    PolicyStatus status;            // Current policy status
    uint256 createdAt;              // Creation timestamp
}
```

#### Enums

```solidity
enum WeatherParameter {
    TEMPERATURE,  // Temperature in Celsius
    RAINFALL,     // Rainfall in mm
    WIND_SPEED,   // Wind speed in km/h
    HUMIDITY      // Humidity percentage
}

enum ComparisonOperator {
    GREATER_THAN,  // Trigger if actual > threshold
    LESS_THAN,     // Trigger if actual < threshold
    EQUAL_TO       // Trigger if actual == threshold
}

enum PolicyStatus {
    ACTIVE,     // Policy is active and monitoring
    CLAIMED,    // Payout has been made
    EXPIRED,    // Coverage period ended without trigger
    CANCELLED   // Policy was cancelled
}

enum PolicyTemplate {
    CROP_INSURANCE,    // Crop protection template
    EVENT_INSURANCE,   // Event coverage template
    TRAVEL_INSURANCE   // Travel protection template
}
```

### Public Functions

#### createPolicy

Create a new insurance policy with custom parameters.

```solidity
function createPolicy(
    uint256 coveragePeriodStart,
    uint256 coveragePeriodEnd,
    string memory location,
    WeatherParameter parameterType,
    int256 triggerValue,
    ComparisonOperator operator,
    uint256 payoutAmount
) external payable whenNotPaused nonReentrant returns (uint256 policyId)
```

**Parameters:**
- `coveragePeriodStart`: Unix timestamp when coverage begins
- `coveragePeriodEnd`: Unix timestamp when coverage ends
- `location`: Geographic identifier (e.g., "New York, NY")
- `parameterType`: Type of weather parameter to monitor
- `triggerValue`: Threshold value that triggers payout
- `operator`: Comparison operator for trigger condition
- `payoutAmount`: Amount to pay out if triggered

**Returns:**
- `policyId`: Unique identifier for the created policy

**Requirements:**
- Must send sufficient premium (calculated automatically)
- Coverage period must be in future and within limits
- Payout amount must be within limits
- System must not be paused

**Events Emitted:**
- `PolicyCreated(policyId, holder, premium, payoutAmount, coveragePeriodStart, coveragePeriodEnd)`

**Example:**
```solidity
// Create policy for rainfall < 50mm over next 90 days
uint256 policyId = policyManager.createPolicy{value: premium}(
    block.timestamp + 1 days,           // Start in 1 day
    block.timestamp + 91 days,          // End in 91 days
    "Iowa, USA",                        // Location
    WeatherParameter.RAINFALL,          // Monitor rainfall
    50,                                 // 50mm threshold
    ComparisonOperator.LESS_THAN,       // Trigger if less than
    5 ether                             // 5 ETH payout
);
```

#### createPolicyFromTemplate

Create a policy using a predefined template.

```solidity
function createPolicyFromTemplate(
    PolicyTemplate template,
    string memory location,
    uint256 coveragePeriodStart
) external payable whenNotPaused nonReentrant returns (uint256 policyId)
```

**Parameters:**
- `template`: Template type (CROP_INSURANCE, EVENT_INSURANCE, or TRAVEL_INSURANCE)
- `location`: Geographic identifier
- `coveragePeriodStart`: Start timestamp (0 for default = 1 hour from now)

**Returns:**
- `policyId`: Unique identifier for the created policy

**Template Defaults:**

**Crop Insurance:**
- Parameter: Rainfall
- Operator: Less Than
- Trigger: 50mm
- Duration: 90 days
- Payout: 5 ETH

**Event Insurance:**
- Parameter: Rainfall
- Operator: Greater Than
- Trigger: 10mm
- Duration: 7 days
- Payout: 2 ETH

**Travel Insurance:**
- Parameter: Temperature
- Operator: Less Than
- Trigger: 0°C
- Duration: 14 days
- Payout: 1 ETH

**Example:**
```solidity
// Create crop insurance policy
uint256 policyId = policyManager.createPolicyFromTemplate{value: premium}(
    PolicyTemplate.CROP_INSURANCE,
    "Iowa, USA",
    0  // Use default start time
);
```

#### calculatePremium

Calculate required premium for policy parameters.

```solidity
function calculatePremium(
    uint256 payoutAmount,
    uint256 coverageDuration,
    WeatherParameter parameterType,
    ComparisonOperator operator
) public view returns (uint256 premium)
```

**Parameters:**
- `payoutAmount`: Desired payout amount
- `coverageDuration`: Coverage duration in seconds
- `parameterType`: Weather parameter type
- `operator`: Comparison operator

**Returns:**
- `premium`: Required premium amount in wei

**Calculation:**
1. Base premium = payoutAmount × basePremiumRate / 10000
2. Adjust for duration = base × (duration / 30 days)
3. Minimum premium = 0.001 ether

**Example:**
```solidity
uint256 premium = policyManager.calculatePremium(
    5 ether,                        // 5 ETH payout
    90 days,                        // 90 day coverage
    WeatherParameter.RAINFALL,
    ComparisonOperator.LESS_THAN
);
```

#### getPolicy

Get policy details by ID.

```solidity
function getPolicy(uint256 policyId) external view returns (Policy memory)
```

**Parameters:**
- `policyId`: Policy identifier

**Returns:**
- `policy`: Complete policy struct

**Example:**
```solidity
Policy memory policy = policyManager.getPolicy(123);
console.log("Holder:", policy.holder);
console.log("Status:", uint(policy.status));
```

#### getUserPolicies

Get all policy IDs for a user.

```solidity
function getUserPolicies(address user) external view returns (uint256[] memory)
```

**Parameters:**
- `user`: User address

**Returns:**
- Array of policy IDs owned by user

**Example:**
```solidity
uint256[] memory policyIds = policyManager.getUserPolicies(msg.sender);
for (uint i = 0; i < policyIds.length; i++) {
    Policy memory policy = policyManager.getPolicy(policyIds[i]);
    // Process policy
}
```

#### getUserActivePolicies

Get only active policy IDs for a user.

```solidity
function getUserActivePolicies(address user) external view returns (uint256[] memory)
```

**Parameters:**
- `user`: User address

**Returns:**
- Array of active policy IDs

**Note:** Only returns policies with ACTIVE status and current time within coverage period.

#### getPolicyStatus

Get current status of a policy.

```solidity
function getPolicyStatus(uint256 policyId) external view returns (PolicyStatus)
```

**Parameters:**
- `policyId`: Policy identifier

**Returns:**
- Current policy status (automatically updates ACTIVE to EXPIRED if past coverage period)

#### getUserClaims

Get claim history for a user.

```solidity
function getUserClaims(address user) external view returns (Claim[] memory)
```

**Parameters:**
- `user`: User address

**Returns:**
- Array of Claim structs

**Claim Struct:**
```solidity
struct Claim {
    uint256 policyId;       // Policy that was claimed
    uint256 timestamp;      // When claim was processed
    uint256 payoutAmount;   // Amount paid out
    int256 weatherValue;    // Weather value that triggered claim
}
```

#### getTemplate

Get configuration for a policy template.

```solidity
function getTemplate(PolicyTemplate template) external view returns (TemplateConfig memory)
```

**Parameters:**
- `template`: Template type

**Returns:**
- Template configuration struct

#### getAllTemplates

Get all template configurations.

```solidity
function getAllTemplates() external view returns (
    TemplateConfig memory cropConfig,
    TemplateConfig memory eventConfig,
    TemplateConfig memory travelConfig
)
```

**Returns:**
- All three template configurations

### Admin Functions

#### setOracleConsumer

Set the oracle consumer contract address.

```solidity
function setOracleConsumer(address _oracleConsumer) external onlyOwner
```

**Parameters:**
- `_oracleConsumer`: OracleConsumer contract address

**Requirements:**
- Caller must be contract owner
- Address must not be zero

#### setParameterLimits

Update policy parameter limits.

```solidity
function setParameterLimits(
    uint256 _minCoveragePeriod,
    uint256 _maxCoveragePeriod,
    uint256 _minPayoutAmount,
    uint256 _maxPayoutAmount
) external onlyOwner
```

**Parameters:**
- `_minCoveragePeriod`: Minimum coverage duration in seconds
- `_maxCoveragePeriod`: Maximum coverage duration in seconds
- `_minPayoutAmount`: Minimum payout in wei
- `_maxPayoutAmount`: Maximum payout in wei

**Events Emitted:**
- `ParameterLimitsUpdated(minCoveragePeriod, maxCoveragePeriod, minPayoutAmount, maxPayoutAmount)`

#### setBasePremiumRate

Update base premium calculation rate.

```solidity
function setBasePremiumRate(uint256 _basePremiumRate) external onlyOwner
```

**Parameters:**
- `_basePremiumRate`: New rate in basis points (e.g., 500 = 5%)

**Requirements:**
- Rate must be ≤ 10000 (100%)

**Events Emitted:**
- `PremiumRateUpdated(oldRate, newRate)`

#### pause / unpause

Pause or unpause the contract.

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
```

**Effects:**
- When paused, new policy creation is blocked
- Existing policies and claims continue to function

### Oracle Functions

#### evaluatePolicies

Process oracle weather data and evaluate policies.

```solidity
function evaluatePolicies(
    string memory location,
    uint8 parameterType,
    int256 value,
    uint256 timestamp
) external onlyOracleConsumer
```

**Parameters:**
- `location`: Geographic location
- `parameterType`: Weather parameter type (as uint8)
- `value`: Weather data value
- `timestamp`: Data timestamp

**Requirements:**
- Caller must be oracle consumer contract

**Process:**
1. Iterates through all policies
2. Matches location and parameter type
3. Checks if timestamp within coverage period
4. Evaluates trigger condition
5. Processes claim if triggered

---

## LiquidityPool

The LiquidityPool contract manages liquidity provider deposits, withdrawals, and fund backing.

### State Variables

```solidity
uint256 public totalPoolValue           // Total value in pool
uint256 public totalLPTokens            // Total LP tokens minted
uint256 public totalPremiumsCollected   // Cumulative premiums
uint256 public totalPayoutsMade         // Cumulative payouts
uint256 public yieldPercentage          // LP yield percentage (basis points)
uint256 public totalLiability           // Total potential payouts
address public policyManager            // PolicyManager contract address
```

### Public Functions

#### deposit

Deposit funds into the liquidity pool.

```solidity
function deposit() external payable nonReentrant returns (uint256 lpTokens)
```

**Parameters:**
- Send ETH with transaction

**Returns:**
- `lpTokens`: Amount of LP tokens minted

**Calculation:**
- First deposit: 1:1 ratio (1 ETH = 1 LP token)
- Subsequent: lpTokens = (depositAmount × totalLPTokens) / totalPoolValue

**Requirements:**
- Deposit amount must be > 0

**Events Emitted:**
- `LiquidityDeposited(provider, amount, lpTokens)`

**Example:**
```solidity
// Deposit 10 ETH
uint256 lpTokens = liquidityPool.deposit{value: 10 ether}();
```

#### withdraw

Withdraw funds from the liquidity pool.

```solidity
function withdraw(uint256 lpTokens) external nonReentrant returns (uint256 amount)
```

**Parameters:**
- `lpTokens`: Amount of LP tokens to burn

**Returns:**
- `amount`: Amount of ETH returned

**Calculation:**
- amount = (lpTokens × totalPoolValue) / totalLPTokens

**Requirements:**
- Must have sufficient LP tokens
- Pool must have available liquidity (after liabilities)

**Events Emitted:**
- `LiquidityWithdrawn(provider, lpTokens, amount)`

**Example:**
```solidity
// Withdraw all LP tokens
uint256 myTokens = liquidityPool.lpTokenBalances(msg.sender);
uint256 amount = liquidityPool.withdraw(myTokens);
```

#### calculateYield

Calculate accumulated yield for a provider.

```solidity
function calculateYield(address provider) external view returns (uint256)
```

**Parameters:**
- `provider`: Provider address

**Returns:**
- Accumulated yield amount in wei

**Calculation:**
1. premiumsSinceDeposit = totalPremiums - premiumsAtDeposit
2. payoutsSinceDeposit = totalPayouts - payoutsAtDeposit
3. netIncome = premiumsSinceDeposit - payoutsSinceDeposit
4. providerShare = (netIncome × lpTokens) / totalLPTokens
5. yield = (providerShare × yieldPercentage) / 10000

**Example:**
```solidity
uint256 yield = liquidityPool.calculateYield(msg.sender);
console.log("Accumulated yield:", yield);
```

#### getPoolStats

Get comprehensive pool statistics.

```solidity
function getPoolStats() external view returns (
    uint256 totalValue,
    uint256 liability,
    uint256 utilizationRate,
    uint256 totalPremiums,
    uint256 totalPayouts
)
```

**Returns:**
- `totalValue`: Total pool value in wei
- `liability`: Total potential payouts from active policies
- `utilizationRate`: Utilization percentage in basis points (e.g., 5000 = 50%)
- `totalPremiums`: Cumulative premiums collected
- `totalPayouts`: Cumulative payouts made

**Utilization Calculation:**
- utilizationRate = (liability × 10000) / totalValue

**Example:**
```solidity
(
    uint256 value,
    uint256 liability,
    uint256 utilization,
    uint256 premiums,
    uint256 payouts
) = liquidityPool.getPoolStats();

console.log("Utilization:", utilization / 100, "%");
```

### Admin Functions

#### setPolicyManager

Set the policy manager contract address.

```solidity
function setPolicyManager(address _policyManager) external onlyOwner
```

**Parameters:**
- `_policyManager`: PolicyManager contract address

**Requirements:**
- Address must not be zero

**Events Emitted:**
- `PolicyManagerUpdated(oldManager, newManager)`

#### setYieldPercentage

Update yield percentage for liquidity providers.

```solidity
function setYieldPercentage(uint256 _yieldPercentage) external onlyOwner
```

**Parameters:**
- `_yieldPercentage`: New percentage in basis points (e.g., 7000 = 70%)

**Requirements:**
- Percentage must be ≤ 10000 (100%)

**Events Emitted:**
- `YieldPercentageUpdated(oldPercentage, newPercentage)`

### PolicyManager Functions

These functions can only be called by the PolicyManager contract.

#### transferPremium

Transfer premium from policy purchase to pool.

```solidity
function transferPremium(uint256 amount) external onlyPolicyManager
```

#### transferPayout

Transfer payout from pool to policy holder.

```solidity
function transferPayout(address recipient, uint256 amount) external onlyPolicyManager
```

#### updateLiability

Update total liability from active policies.

```solidity
function updateLiability(uint256 newLiability) external onlyPolicyManager
```

---

## OracleConsumer

The OracleConsumer contract interfaces with weather oracles to receive and verify weather data.

### State Variables

```solidity
address public oracleAddress    // Authorized oracle address
address public policyManager    // PolicyManager contract address
```

### Public Functions

#### requestWeatherData

Request weather data from the oracle.

```solidity
function requestWeatherData(
    string memory location,
    WeatherParameter parameterType
) external returns (bytes32 requestId)
```

**Parameters:**
- `location`: Geographic location identifier
- `parameterType`: Type of weather parameter

**Returns:**
- `requestId`: Unique request identifier

**Events Emitted:**
- `WeatherDataRequested(requestId, requester, location, parameterType, timestamp)`

**Example:**
```solidity
bytes32 requestId = oracleConsumer.requestWeatherData(
    "New York, NY",
    WeatherParameter.TEMPERATURE
);
```

#### getRequest

Get request details.

```solidity
function getRequest(bytes32 requestId) external view returns (WeatherDataRequest memory)
```

**Parameters:**
- `requestId`: Request identifier

**Returns:**
- Request details struct

#### isPending

Check if a request is pending.

```solidity
function isPending(bytes32 requestId) external view returns (bool)
```

**Parameters:**
- `requestId`: Request identifier

**Returns:**
- True if request is pending fulfillment

#### verifyOracleSignature

Verify oracle signature on weather data.

```solidity
function verifyOracleSignature(
    bytes32 requestId,
    string memory location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp,
    bytes memory signature
) public view returns (bool)
```

**Parameters:**
- `requestId`: Request identifier
- `location`: Geographic location
- `parameterType`: Weather parameter type
- `value`: Weather data value
- `timestamp`: Data timestamp
- `signature`: Oracle signature

**Returns:**
- True if signature is valid

### Oracle Functions

#### fulfillWeatherData

Fulfill a weather data request (oracle only).

```solidity
function fulfillWeatherData(
    bytes32 requestId,
    string memory location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp
) external onlyOracle
```

**Parameters:**
- `requestId`: Request identifier
- `location`: Geographic location
- `parameterType`: Weather parameter type
- `value`: Weather data value
- `timestamp`: Data timestamp

**Requirements:**
- Caller must be authorized oracle
- Request must be pending
- Request must not be already fulfilled

**Events Emitted:**
- `WeatherDataFulfilled(requestId, location, parameterType, value, timestamp)`

**Process:**
1. Validates request
2. Marks as fulfilled
3. Forwards data to PolicyManager
4. PolicyManager evaluates policies

#### fulfillWeatherDataWithSignature

Fulfill request with signature verification.

```solidity
function fulfillWeatherDataWithSignature(
    bytes32 requestId,
    string memory location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp,
    bytes memory signature
) external
```

**Parameters:**
- Same as fulfillWeatherData plus:
- `signature`: Oracle signature for verification

**Requirements:**
- Signature must be valid
- Other requirements same as fulfillWeatherData

### Admin Functions

#### setOracleAddress

Update authorized oracle address.

```solidity
function setOracleAddress(address newOracle) external onlyOwner
```

**Parameters:**
- `newOracle`: New oracle address

**Requirements:**
- Address must not be zero

**Events Emitted:**
- `OracleAddressUpdated(oldOracle, newOracle)`

#### setPolicyManager

Set policy manager contract address.

```solidity
function setPolicyManager(address _policyManager) external onlyOwner
```

**Parameters:**
- `_policyManager`: PolicyManager contract address

**Requirements:**
- Address must not be zero

**Events Emitted:**
- `PolicyManagerUpdated(oldManager, newManager)`

---

## Events Reference

### PolicyManager Events

```solidity
event PolicyCreated(
    uint256 indexed policyId,
    address indexed holder,
    uint256 premium,
    uint256 payoutAmount,
    uint256 coveragePeriodStart,
    uint256 coveragePeriodEnd
)

event ClaimProcessed(
    uint256 indexed policyId,
    address indexed holder,
    uint256 payoutAmount,
    uint256 timestamp
)

event PolicyStatusUpdated(
    uint256 indexed policyId,
    PolicyStatus oldStatus,
    PolicyStatus newStatus
)

event ParameterLimitsUpdated(
    uint256 minCoveragePeriod,
    uint256 maxCoveragePeriod,
    uint256 minPayoutAmount,
    uint256 maxPayoutAmount
)

event PremiumRateUpdated(uint256 oldRate, uint256 newRate)
```

### LiquidityPool Events

```solidity
event LiquidityDeposited(address indexed provider, uint256 amount, uint256 lpTokens)
event LiquidityWithdrawn(address indexed provider, uint256 lpTokens, uint256 amount)
event PremiumTransferred(uint256 amount)
event PayoutTransferred(address indexed recipient, uint256 amount)
event YieldPercentageUpdated(uint256 oldPercentage, uint256 newPercentage)
event PolicyManagerUpdated(address indexed oldManager, address indexed newManager)
```

### OracleConsumer Events

```solidity
event WeatherDataRequested(
    bytes32 indexed requestId,
    address indexed requester,
    string location,
    WeatherParameter parameterType,
    uint256 timestamp
)

event WeatherDataFulfilled(
    bytes32 indexed requestId,
    string location,
    WeatherParameter parameterType,
    int256 value,
    uint256 timestamp
)

event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle)
event PolicyManagerUpdated(address indexed oldManager, address indexed newManager)
```

---

## Error Reference

### PolicyManager Errors

```solidity
error InvalidLiquidityPool()        // Liquidity pool address is zero
error InvalidOracleConsumer()       // Oracle consumer address is zero
error InvalidCoveragePeriod()       // Coverage period is invalid
error InvalidPayoutAmount()         // Payout amount outside limits
error InvalidTriggerValue()         // Trigger value is invalid
error InsufficientPremium()         // Premium payment too low
error PolicyNotActive()             // Policy is not active
error PolicyAlreadyClaimed()        // Policy already claimed
error OnlyOracleConsumer()          // Caller is not oracle consumer
error InvalidPremiumRate()          // Premium rate > 100%
```

### LiquidityPool Errors

```solidity
error ZeroDeposit()                 // Deposit amount is zero
error InsufficientLPTokens()        // Not enough LP tokens
error InsufficientLiquidity()       // Pool lacks available funds
error OnlyPolicyManager()           // Caller is not policy manager
error InvalidYieldPercentage()      // Yield percentage > 100%
error InvalidPolicyManager()        // Policy manager address is zero
```

### OracleConsumer Errors

```solidity
error InvalidOracleAddress()        // Oracle address is zero
error InvalidPolicyManager()        // Policy manager address is zero
error OnlyOracle()                  // Caller is not authorized oracle
error RequestNotPending()           // Request is not pending
error InvalidSignature()            // Signature verification failed
error RequestAlreadyFulfilled()     // Request already fulfilled
```
