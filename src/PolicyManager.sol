// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LiquidityPool.sol";

/**
 * @title PolicyManager
 * @notice Manages weather insurance policies, creation, and claim processing
 * @dev Integrates with LiquidityPool for fund management and OracleConsumer for weather data
 */
contract PolicyManager is Ownable, ReentrancyGuard, Pausable {
    // Enums
    enum WeatherParameter {
        TEMPERATURE,
        RAINFALL,
        WIND_SPEED,
        HUMIDITY
    }

    enum ComparisonOperator {
        GREATER_THAN,
        LESS_THAN,
        EQUAL_TO
    }

    enum PolicyStatus {
        ACTIVE,
        CLAIMED,
        EXPIRED,
        CANCELLED
    }

    enum PolicyTemplate {
        CROP_INSURANCE,
        EVENT_INSURANCE,
        TRAVEL_INSURANCE
    }

    // Structs
    struct TemplateConfig {
        string name;
        string description;
        WeatherParameter defaultParameterType;
        ComparisonOperator defaultOperator;
        int256 defaultTriggerValue;
        uint256 defaultCoverageDuration;
        uint256 defaultPayoutAmount;
    }

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

    struct Claim {
        uint256 policyId;
        uint256 timestamp;
        uint256 payoutAmount;
        int256 weatherValue;
    }

    // State variables
    LiquidityPool public liquidityPool;
    address public oracleConsumer;

    uint256 public policyCounter;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    mapping(uint256 => bool) public claimedPolicies;
    mapping(address => Claim[]) public userClaims;

    // Policy parameter limits
    uint256 public minCoveragePeriod = 1 days;
    uint256 public maxCoveragePeriod = 365 days;
    uint256 public minPayoutAmount = 0.01 ether;
    uint256 public maxPayoutAmount = 100 ether;

    // Premium calculation parameters (basis points)
    uint256 public basePremiumRate = 500; // 5% of payout amount

    // Policy templates
    mapping(PolicyTemplate => TemplateConfig) public templates;

    // Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed holder,
        uint256 premium,
        uint256 payoutAmount,
        uint256 coveragePeriodStart,
        uint256 coveragePeriodEnd
    );

    event ClaimProcessed(
        uint256 indexed policyId,
        address indexed holder,
        uint256 payoutAmount,
        uint256 timestamp
    );

    event PolicyStatusUpdated(
        uint256 indexed policyId,
        PolicyStatus oldStatus,
        PolicyStatus newStatus
    );

    event ParameterLimitsUpdated(
        uint256 minCoveragePeriod,
        uint256 maxCoveragePeriod,
        uint256 minPayoutAmount,
        uint256 maxPayoutAmount
    );

    event PremiumRateUpdated(uint256 oldRate, uint256 newRate);

    // Errors
    error InvalidLiquidityPool();
    error InvalidOracleConsumer();
    error InvalidCoveragePeriod();
    error InvalidPayoutAmount();
    error InvalidTriggerValue();
    error InsufficientPremium();
    error PolicyNotActive();
    error PolicyAlreadyClaimed();
    error OnlyOracleConsumer();
    error InvalidPremiumRate();

    /**
     * @notice Constructor to initialize the PolicyManager
     * @param _liquidityPool Address of the LiquidityPool contract
     */
    constructor(address _liquidityPool) Ownable(msg.sender) {
        if (_liquidityPool == address(0)) revert InvalidLiquidityPool();
        liquidityPool = LiquidityPool(payable(_liquidityPool));
        
        // Initialize policy templates
        _initializeTemplates();
    }

    /**
     * @notice Initialize default policy templates
     */
    function _initializeTemplates() private {
        // Crop Insurance Template
        templates[PolicyTemplate.CROP_INSURANCE] = TemplateConfig({
            name: "Crop Insurance",
            description: "Protection against adverse weather conditions affecting crops",
            defaultParameterType: WeatherParameter.RAINFALL,
            defaultOperator: ComparisonOperator.LESS_THAN,
            defaultTriggerValue: 50, // mm of rainfall
            defaultCoverageDuration: 90 days,
            defaultPayoutAmount: 5 ether
        });

        // Event Insurance Template
        templates[PolicyTemplate.EVENT_INSURANCE] = TemplateConfig({
            name: "Event Insurance",
            description: "Coverage for outdoor events against rain or extreme weather",
            defaultParameterType: WeatherParameter.RAINFALL,
            defaultOperator: ComparisonOperator.GREATER_THAN,
            defaultTriggerValue: 10, // mm of rainfall
            defaultCoverageDuration: 7 days,
            defaultPayoutAmount: 2 ether
        });

        // Travel Insurance Template
        templates[PolicyTemplate.TRAVEL_INSURANCE] = TemplateConfig({
            name: "Travel Insurance",
            description: "Protection for travel plans against extreme weather conditions",
            defaultParameterType: WeatherParameter.TEMPERATURE,
            defaultOperator: ComparisonOperator.LESS_THAN,
            defaultTriggerValue: 0, // degrees Celsius
            defaultCoverageDuration: 14 days,
            defaultPayoutAmount: 1 ether
        });
    }

    /**
     * @notice Create a new insurance policy from a template
     * @param template The policy template to use
     * @param location Geographic location identifier
     * @param coveragePeriodStart Start timestamp of coverage period (optional, 0 for default)
     * @return policyId The ID of the created policy
     */
    function createPolicyFromTemplate(
        PolicyTemplate template,
        string memory location,
        uint256 coveragePeriodStart
    ) external payable whenNotPaused nonReentrant returns (uint256 policyId) {
        TemplateConfig memory config = templates[template];
        
        // Use default start time if not provided
        if (coveragePeriodStart == 0) {
            coveragePeriodStart = block.timestamp + 1 hours;
        }
        
        uint256 coveragePeriodEnd = coveragePeriodStart + config.defaultCoverageDuration;
        
        return _createPolicy(
            coveragePeriodStart,
            coveragePeriodEnd,
            location,
            config.defaultParameterType,
            config.defaultTriggerValue,
            config.defaultOperator,
            config.defaultPayoutAmount
        );
    }

    /**
     * @notice Create a new insurance policy
     * @param coveragePeriodStart Start timestamp of coverage period
     * @param coveragePeriodEnd End timestamp of coverage period
     * @param location Geographic location identifier
     * @param parameterType Type of weather parameter
     * @param triggerValue Weather value that triggers payout
     * @param operator Comparison operator for trigger condition
     * @param payoutAmount Amount to be paid out if triggered
     * @return policyId The ID of the created policy
     */
    function createPolicy(
        uint256 coveragePeriodStart,
        uint256 coveragePeriodEnd,
        string memory location,
        WeatherParameter parameterType,
        int256 triggerValue,
        ComparisonOperator operator,
        uint256 payoutAmount
    ) external payable whenNotPaused nonReentrant returns (uint256 policyId) {
        return _createPolicy(
            coveragePeriodStart,
            coveragePeriodEnd,
            location,
            parameterType,
            triggerValue,
            operator,
            payoutAmount
        );
    }

    /**
     * @notice Internal function to create a new insurance policy
     * @param coveragePeriodStart Start timestamp of coverage period
     * @param coveragePeriodEnd End timestamp of coverage period
     * @param location Geographic location identifier
     * @param parameterType Type of weather parameter
     * @param triggerValue Weather value that triggers payout
     * @param operator Comparison operator for trigger condition
     * @param payoutAmount Amount to be paid out if triggered
     * @return policyId The ID of the created policy
     */
    function _createPolicy(
        uint256 coveragePeriodStart,
        uint256 coveragePeriodEnd,
        string memory location,
        WeatherParameter parameterType,
        int256 triggerValue,
        ComparisonOperator operator,
        uint256 payoutAmount
    ) internal returns (uint256 policyId) {
        // Validate coverage period
        if (coveragePeriodStart < block.timestamp) revert InvalidCoveragePeriod();
        if (coveragePeriodEnd <= coveragePeriodStart) revert InvalidCoveragePeriod();
        
        uint256 coverageDuration = coveragePeriodEnd - coveragePeriodStart;
        if (coverageDuration < minCoveragePeriod || coverageDuration > maxCoveragePeriod) {
            revert InvalidCoveragePeriod();
        }

        // Validate payout amount
        if (payoutAmount < minPayoutAmount || payoutAmount > maxPayoutAmount) {
            revert InvalidPayoutAmount();
        }

        // Calculate required premium
        uint256 requiredPremium = calculatePremium(
            payoutAmount,
            coverageDuration,
            parameterType,
            operator
        );

        // Validate premium payment
        if (msg.value < requiredPremium) revert InsufficientPremium();

        // Create policy
        policyId = policyCounter++;
        
        policies[policyId] = Policy({
            holder: msg.sender,
            coveragePeriodStart: coveragePeriodStart,
            coveragePeriodEnd: coveragePeriodEnd,
            location: location,
            parameterType: parameterType,
            triggerValue: triggerValue,
            operator: operator,
            premium: requiredPremium,
            payoutAmount: payoutAmount,
            status: PolicyStatus.ACTIVE,
            createdAt: block.timestamp
        });

        userPolicies[msg.sender].push(policyId);

        // Transfer premium to liquidity pool
        (bool success, ) = address(liquidityPool).call{value: requiredPremium}("");
        require(success, "Premium transfer failed");
        liquidityPool.transferPremium(requiredPremium);

        // Update pool liability
        updatePoolLiability();

        // Refund excess payment
        if (msg.value > requiredPremium) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - requiredPremium}("");
            require(refundSuccess, "Refund failed");
        }

        emit PolicyCreated(
            policyId,
            msg.sender,
            requiredPremium,
            payoutAmount,
            coveragePeriodStart,
            coveragePeriodEnd
        );

        return policyId;
    }

    /**
     * @notice Calculate premium for a policy
     * @param payoutAmount The payout amount
     * @param coverageDuration Duration of coverage in seconds
     * @param parameterType Type of weather parameter
     * @param operator Comparison operator
     * @return premium The calculated premium amount
     */
    function calculatePremium(
        uint256 payoutAmount,
        uint256 coverageDuration,
        WeatherParameter parameterType,
        ComparisonOperator operator
    ) public view returns (uint256 premium) {
        // Base premium calculation: percentage of payout amount
        premium = (payoutAmount * basePremiumRate) / 10000;

        // Adjust for coverage duration (longer = higher premium)
        uint256 durationMultiplier = (coverageDuration * 10000) / 30 days;
        premium = (premium * durationMultiplier) / 10000;

        // Minimum premium of 0.001 ether
        if (premium < 0.001 ether) {
            premium = 0.001 ether;
        }

        return premium;
    }

    /**
     * @notice Evaluate policies based on oracle weather data
     * @param location Geographic location
     * @param parameterType Weather parameter type
     * @param value Weather data value
     * @param timestamp Timestamp of weather data
     */
    function evaluatePolicies(
        string memory location,
        uint8 parameterType,
        int256 value,
        uint256 timestamp
    ) external onlyOracleConsumer {
        // Iterate through all policies and check for triggers
        for (uint256 i = 0; i < policyCounter; i++) {
            Policy storage policy = policies[i];

            // Skip if not active
            if (policy.status != PolicyStatus.ACTIVE) continue;

            // Check if policy matches location and parameter type
            if (
                keccak256(bytes(policy.location)) != keccak256(bytes(location)) ||
                uint8(policy.parameterType) != parameterType
            ) continue;

            // Check if timestamp is within coverage period
            if (timestamp < policy.coveragePeriodStart || timestamp > policy.coveragePeriodEnd) {
                continue;
            }

            // Evaluate trigger condition
            bool triggered = evaluateTrigger(policy.operator, value, policy.triggerValue);

            if (triggered) {
                processClaim(i, value, timestamp);
            }
        }

        // Update pool liability after processing claims
        updatePoolLiability();
    }

    /**
     * @notice Evaluate if trigger condition is met
     * @param operator Comparison operator
     * @param actualValue Actual weather value
     * @param triggerValue Trigger threshold value
     * @return bool True if trigger condition is met
     */
    function evaluateTrigger(
        ComparisonOperator operator,
        int256 actualValue,
        int256 triggerValue
    ) public pure returns (bool) {
        if (operator == ComparisonOperator.GREATER_THAN) {
            return actualValue > triggerValue;
        } else if (operator == ComparisonOperator.LESS_THAN) {
            return actualValue < triggerValue;
        } else if (operator == ComparisonOperator.EQUAL_TO) {
            return actualValue == triggerValue;
        }
        return false;
    }

    /**
     * @notice Process a claim for a triggered policy
     * @param policyId The policy ID
     * @param weatherValue The weather value that triggered the claim
     * @param timestamp Timestamp of the trigger
     */
    function processClaim(
        uint256 policyId,
        int256 weatherValue,
        uint256 timestamp
    ) internal {
        Policy storage policy = policies[policyId];

        // Check if already claimed
        if (claimedPolicies[policyId]) return;

        // Mark as claimed
        claimedPolicies[policyId] = true;
        PolicyStatus oldStatus = policy.status;
        policy.status = PolicyStatus.CLAIMED;

        // Record claim
        userClaims[policy.holder].push(
            Claim({
                policyId: policyId,
                timestamp: timestamp,
                payoutAmount: policy.payoutAmount,
                weatherValue: weatherValue
            })
        );

        // Transfer payout from liquidity pool
        liquidityPool.transferPayout(policy.holder, policy.payoutAmount);

        emit PolicyStatusUpdated(policyId, oldStatus, PolicyStatus.CLAIMED);
        emit ClaimProcessed(policyId, policy.holder, policy.payoutAmount, timestamp);
    }

    /**
     * @notice Get template configuration
     * @param template The template type
     * @return config The template configuration
     */
    function getTemplate(PolicyTemplate template) external view returns (TemplateConfig memory) {
        return templates[template];
    }

    /**
     * @notice Get all template configurations
     * @return cropConfig Crop insurance template
     * @return eventConfig Event insurance template
     * @return travelConfig Travel insurance template
     */
    function getAllTemplates() external view returns (
        TemplateConfig memory cropConfig,
        TemplateConfig memory eventConfig,
        TemplateConfig memory travelConfig
    ) {
        cropConfig = templates[PolicyTemplate.CROP_INSURANCE];
        eventConfig = templates[PolicyTemplate.EVENT_INSURANCE];
        travelConfig = templates[PolicyTemplate.TRAVEL_INSURANCE];
    }

    /**
     * @notice Get policy by ID
     * @param policyId The policy ID
     * @return policy The policy details
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @notice Get all policies for a user
     * @param user The user address
     * @return policyIds Array of policy IDs
     */
    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    /**
     * @notice Get active policies for a user
     * @param user The user address
     * @return activePolicyIds Array of active policy IDs
     */
    function getUserActivePolicies(address user) external view returns (uint256[] memory) {
        uint256[] memory allPolicies = userPolicies[user];
        uint256 activeCount = 0;

        // Count active policies
        for (uint256 i = 0; i < allPolicies.length; i++) {
            if (policies[allPolicies[i]].status == PolicyStatus.ACTIVE) {
                // Check if still within coverage period
                if (block.timestamp <= policies[allPolicies[i]].coveragePeriodEnd) {
                    activeCount++;
                }
            }
        }

        // Create array of active policy IDs
        uint256[] memory activePolicies = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allPolicies.length; i++) {
            if (policies[allPolicies[i]].status == PolicyStatus.ACTIVE) {
                if (block.timestamp <= policies[allPolicies[i]].coveragePeriodEnd) {
                    activePolicies[index] = allPolicies[i];
                    index++;
                }
            }
        }

        return activePolicies;
    }

    /**
     * @notice Get policy status
     * @param policyId The policy ID
     * @return status The policy status
     */
    function getPolicyStatus(uint256 policyId) external view returns (PolicyStatus) {
        Policy memory policy = policies[policyId];
        
        // Update status if expired
        if (policy.status == PolicyStatus.ACTIVE && block.timestamp > policy.coveragePeriodEnd) {
            return PolicyStatus.EXPIRED;
        }
        
        return policy.status;
    }

    /**
     * @notice Get claim history for a user
     * @param user The user address
     * @return claims Array of claims
     */
    function getUserClaims(address user) external view returns (Claim[] memory) {
        return userClaims[user];
    }

    /**
     * @notice Update expired policies
     * @param policyIds Array of policy IDs to check and update
     */
    function updateExpiredPolicies(uint256[] calldata policyIds) external {
        for (uint256 i = 0; i < policyIds.length; i++) {
            uint256 policyId = policyIds[i];
            Policy storage policy = policies[policyId];

            if (
                policy.status == PolicyStatus.ACTIVE &&
                block.timestamp > policy.coveragePeriodEnd
            ) {
                PolicyStatus oldStatus = policy.status;
                policy.status = PolicyStatus.EXPIRED;
                emit PolicyStatusUpdated(policyId, oldStatus, PolicyStatus.EXPIRED);
            }
        }

        // Update pool liability
        updatePoolLiability();
    }

    /**
     * @notice Update total liability in the liquidity pool
     */
    function updatePoolLiability() internal {
        uint256 totalLiability = 0;

        for (uint256 i = 0; i < policyCounter; i++) {
            if (policies[i].status == PolicyStatus.ACTIVE) {
                // Only count if still within coverage period
                if (block.timestamp <= policies[i].coveragePeriodEnd) {
                    totalLiability += policies[i].payoutAmount;
                }
            }
        }

        liquidityPool.updateLiability(totalLiability);
    }

    /**
     * @notice Set oracle consumer address
     * @param _oracleConsumer Address of the OracleConsumer contract
     */
    function setOracleConsumer(address _oracleConsumer) external onlyOwner {
        if (_oracleConsumer == address(0)) revert InvalidOracleConsumer();
        oracleConsumer = _oracleConsumer;
    }

    /**
     * @notice Set policy parameter limits
     * @param _minCoveragePeriod Minimum coverage period
     * @param _maxCoveragePeriod Maximum coverage period
     * @param _minPayoutAmount Minimum payout amount
     * @param _maxPayoutAmount Maximum payout amount
     */
    function setParameterLimits(
        uint256 _minCoveragePeriod,
        uint256 _maxCoveragePeriod,
        uint256 _minPayoutAmount,
        uint256 _maxPayoutAmount
    ) external onlyOwner {
        minCoveragePeriod = _minCoveragePeriod;
        maxCoveragePeriod = _maxCoveragePeriod;
        minPayoutAmount = _minPayoutAmount;
        maxPayoutAmount = _maxPayoutAmount;

        emit ParameterLimitsUpdated(
            _minCoveragePeriod,
            _maxCoveragePeriod,
            _minPayoutAmount,
            _maxPayoutAmount
        );
    }

    /**
     * @notice Set base premium rate
     * @param _basePremiumRate New base premium rate in basis points
     */
    function setBasePremiumRate(uint256 _basePremiumRate) external onlyOwner {
        if (_basePremiumRate > 10000) revert InvalidPremiumRate();
        
        uint256 oldRate = basePremiumRate;
        basePremiumRate = _basePremiumRate;

        emit PremiumRateUpdated(oldRate, _basePremiumRate);
    }

    /**
     * @notice Pause the contract (prevents new policy creation)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Modifier to restrict access to oracle consumer only
     */
    modifier onlyOracleConsumer() {
        if (msg.sender != oracleConsumer) revert OnlyOracleConsumer();
        _;
    }

    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}
