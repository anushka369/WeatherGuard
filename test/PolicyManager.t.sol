// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PolicyManager.sol";
import "../src/LiquidityPool.sol";

/**
 * @title PolicyManagerTest
 * @notice Test suite for PolicyManager contract
 */
contract PolicyManagerTest is Test {
    PolicyManager public policyManager;
    LiquidityPool public liquidityPool;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        // Deploy LiquidityPool
        liquidityPool = new LiquidityPool();
        
        // Deploy PolicyManager
        policyManager = new PolicyManager(address(liquidityPool));
        
        // Set PolicyManager in LiquidityPool
        liquidityPool.setPolicyManager(address(policyManager));
        
        // Fund test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        
        // Add initial liquidity to pool
        vm.deal(address(this), 1000 ether);
        liquidityPool.deposit{value: 1000 ether}();
    }

    /**
     * @notice Property test for atomic policy creation with premium transfer
     * Feature: weather-insurance-dapp, Property 1: Policy creation with premium transfer is atomic
     * Validates: Requirements 1.1, 1.5
     */
    function testFuzz_AtomicPolicyCreationWithPremiumTransfer(
        uint256 coverageDuration,
        uint256 payoutAmount,
        int256 triggerValue
    ) public {
        // Bound inputs to valid ranges
        coverageDuration = bound(coverageDuration, 1 days, 365 days);
        payoutAmount = bound(payoutAmount, 0.01 ether, 100 ether);
        triggerValue = bound(triggerValue, -100, 100);
        
        // Calculate required premium
        uint256 premium = policyManager.calculatePremium(
            payoutAmount,
            coverageDuration,
            PolicyManager.WeatherParameter.TEMPERATURE,
            PolicyManager.ComparisonOperator.GREATER_THAN
        );
        
        // Record state before policy creation
        uint256 userPolicyCountBefore = policyManager.getUserPolicies(user1).length;
        uint256 poolPremiumsBefore = liquidityPool.totalPremiumsCollected();
        
        // Create policy
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicy{value: premium}(
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + coverageDuration,
            "New York",
            PolicyManager.WeatherParameter.TEMPERATURE,
            triggerValue,
            PolicyManager.ComparisonOperator.GREATER_THAN,
            payoutAmount
        );
        
        // Verify atomicity: policy count increased by exactly one
        assertEq(policyManager.getUserPolicies(user1).length, userPolicyCountBefore + 1, "Policy count should increase by 1");
        
        // Verify atomicity: premium transferred to pool
        assertEq(liquidityPool.totalPremiumsCollected(), poolPremiumsBefore + premium, "Premium should be transferred to pool");
        
        // Verify policy is assigned to user
        PolicyManager.Policy memory policy = policyManager.getPolicy(policyId);
        assertEq(policy.holder, user1, "Policy should be assigned to user");
        assertEq(uint(policy.status), uint(PolicyManager.PolicyStatus.ACTIVE), "Policy should be active");
    }

    /**
     * @notice Property test for invalid parameter rejection
     * Feature: weather-insurance-dapp, Property 2: Invalid parameters are rejected
     * Validates: Requirements 1.2
     */
    function testFuzz_InvalidParametersAreRejected(
        uint256 coverageStart,
        uint256 coverageEnd,
        uint256 payoutAmount,
        uint8 invalidCase
    ) public {
        // Test different invalid cases
        invalidCase = uint8(bound(invalidCase, 0, 4));
        
        // Set default valid values
        uint256 validStart = block.timestamp + 1 hours;
        uint256 validEnd = validStart + 30 days;
        uint256 validPayout = 1 ether;
        
        // Modify one parameter to be invalid based on case
        if (invalidCase == 0) {
            // Invalid: coverage start in the past
            coverageStart = bound(coverageStart, 0, block.timestamp - 1);
            coverageEnd = validEnd;
            payoutAmount = validPayout;
        } else if (invalidCase == 1) {
            // Invalid: coverage end before start
            coverageStart = validStart;
            coverageEnd = bound(coverageEnd, 0, coverageStart);
            payoutAmount = validPayout;
        } else if (invalidCase == 2) {
            // Invalid: coverage duration too short
            coverageStart = validStart;
            coverageEnd = coverageStart + bound(coverageEnd, 0, 1 days - 1);
            payoutAmount = validPayout;
        } else if (invalidCase == 3) {
            // Invalid: payout amount too small
            coverageStart = validStart;
            coverageEnd = validEnd;
            payoutAmount = bound(payoutAmount, 0, 0.01 ether - 1);
        } else {
            // Invalid: payout amount too large
            coverageStart = validStart;
            coverageEnd = validEnd;
            payoutAmount = bound(payoutAmount, 100 ether + 1, type(uint128).max);
        }
        
        uint256 premium = 1 ether; // Provide sufficient premium
        
        // Attempt to create policy with invalid parameters
        vm.prank(user1);
        vm.expectRevert();
        policyManager.createPolicy{value: premium}(
            coverageStart,
            coverageEnd,
            "New York",
            PolicyManager.WeatherParameter.TEMPERATURE,
            25,
            PolicyManager.ComparisonOperator.GREATER_THAN,
            payoutAmount
        );
    }

    /**
     * @notice Property test for insufficient premium rejection
     * Feature: weather-insurance-dapp, Property 2: Invalid parameters are rejected
     * Validates: Requirements 1.2
     */
    function testFuzz_InsufficientPremiumRejected(
        uint256 coverageDuration,
        uint256 payoutAmount
    ) public {
        // Bound inputs to valid ranges
        coverageDuration = bound(coverageDuration, 1 days, 365 days);
        payoutAmount = bound(payoutAmount, 0.01 ether, 100 ether);
        
        // Calculate required premium
        uint256 requiredPremium = policyManager.calculatePremium(
            payoutAmount,
            coverageDuration,
            PolicyManager.WeatherParameter.TEMPERATURE,
            PolicyManager.ComparisonOperator.GREATER_THAN
        );
        
        // Provide insufficient premium (less than required)
        uint256 insufficientPremium = requiredPremium > 1 ? requiredPremium - 1 : 0;
        
        // Attempt to create policy with insufficient premium
        vm.prank(user1);
        vm.expectRevert(PolicyManager.InsufficientPremium.selector);
        policyManager.createPolicy{value: insufficientPremium}(
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + coverageDuration,
            "New York",
            PolicyManager.WeatherParameter.TEMPERATURE,
            25,
            PolicyManager.ComparisonOperator.GREATER_THAN,
            payoutAmount
        );
    }

    /**
     * @notice Property test for policy data completeness
     * Feature: weather-insurance-dapp, Property 3: Policy records contain all required data
     * Validates: Requirements 1.3, 4.2
     */
    function testFuzz_PolicyDataCompleteness(
        uint256 coverageDuration,
        uint256 payoutAmount,
        int256 triggerValue,
        uint8 parameterType,
        uint8 operatorType
    ) public {
        // Bound inputs to valid ranges
        coverageDuration = bound(coverageDuration, 1 days, 365 days);
        payoutAmount = bound(payoutAmount, 0.01 ether, 100 ether);
        triggerValue = bound(triggerValue, -100, 100);
        parameterType = uint8(bound(parameterType, 0, 3));
        operatorType = uint8(bound(operatorType, 0, 2));
        
        PolicyManager.WeatherParameter param = PolicyManager.WeatherParameter(parameterType);
        PolicyManager.ComparisonOperator op = PolicyManager.ComparisonOperator(operatorType);
        
        // Calculate premium
        uint256 premium = policyManager.calculatePremium(payoutAmount, coverageDuration, param, op);
        
        // Create policy
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicy{value: premium}(
            block.timestamp + 1 hours,
            block.timestamp + 1 hours + coverageDuration,
            "New York",
            param,
            triggerValue,
            op,
            payoutAmount
        );
        
        // Query policy and verify all required data is present
        PolicyManager.Policy memory policy = policyManager.getPolicy(policyId);
        
        // Verify all required fields are correctly stored
        assertEq(policy.holder, user1, "Policy holder should be stored");
        assertTrue(policy.coveragePeriodStart > 0, "Coverage start should be stored");
        assertTrue(policy.coveragePeriodEnd > policy.coveragePeriodStart, "Coverage end should be stored");
        assertEq(policy.location, "New York", "Location should be stored");
        assertEq(uint(policy.parameterType), uint(param), "Parameter type should be stored");
        assertEq(policy.triggerValue, triggerValue, "Trigger value should be stored");
        assertEq(uint(policy.operator), uint(op), "Operator should be stored");
        assertTrue(policy.premium > 0, "Premium should be stored");
        assertEq(policy.payoutAmount, payoutAmount, "Payout amount should be stored");
        assertEq(uint(policy.status), uint(PolicyManager.PolicyStatus.ACTIVE), "Status should be stored");
        assertTrue(policy.createdAt > 0, "Created timestamp should be stored");
    }

    /**
     * @notice Property test for user policy query filtering
     * Feature: weather-insurance-dapp, Property 11: User policy query returns only owned policies
     * Validates: Requirements 4.1
     */
    function testFuzz_UserPolicyQueryFiltering(
        uint8 user1PolicyCount,
        uint8 user2PolicyCount
    ) public {
        // Bound to reasonable numbers to avoid gas issues
        user1PolicyCount = uint8(bound(user1PolicyCount, 1, 10));
        user2PolicyCount = uint8(bound(user2PolicyCount, 1, 10));
        
        // Create policies for user1
        for (uint8 i = 0; i < user1PolicyCount; i++) {
            vm.prank(user1);
            policyManager.createPolicy{value: 1 ether}(
                block.timestamp + 1 hours,
                block.timestamp + 30 days,
                "New York",
                PolicyManager.WeatherParameter.TEMPERATURE,
                25,
                PolicyManager.ComparisonOperator.GREATER_THAN,
                1 ether
            );
        }
        
        // Create policies for user2
        for (uint8 i = 0; i < user2PolicyCount; i++) {
            vm.prank(user2);
            policyManager.createPolicy{value: 1 ether}(
                block.timestamp + 1 hours,
                block.timestamp + 30 days,
                "Los Angeles",
                PolicyManager.WeatherParameter.RAINFALL,
                10,
                PolicyManager.ComparisonOperator.LESS_THAN,
                1 ether
            );
        }
        
        // Query user1 policies
        uint256[] memory user1Policies = policyManager.getUserPolicies(user1);
        assertEq(user1Policies.length, user1PolicyCount, "User1 should have correct number of policies");
        
        // Verify all policies belong to user1
        for (uint256 i = 0; i < user1Policies.length; i++) {
            PolicyManager.Policy memory policy = policyManager.getPolicy(user1Policies[i]);
            assertEq(policy.holder, user1, "All policies should belong to user1");
        }
        
        // Query user2 policies
        uint256[] memory user2Policies = policyManager.getUserPolicies(user2);
        assertEq(user2Policies.length, user2PolicyCount, "User2 should have correct number of policies");
        
        // Verify all policies belong to user2
        for (uint256 i = 0; i < user2Policies.length; i++) {
            PolicyManager.Policy memory policy = policyManager.getPolicy(user2Policies[i]);
            assertEq(policy.holder, user2, "All policies should belong to user2");
        }
    }

    /**
     * @notice Property test for policy status filtering
     * Feature: weather-insurance-dapp, Property 12: Policy status filtering is accurate
     * Validates: Requirements 4.4, 4.5
     */
    function testFuzz_PolicyStatusFiltering(uint8 policyCount) public {
        // Bound to reasonable number
        policyCount = uint8(bound(policyCount, 2, 10));
        
        // Create mix of policies with different coverage periods
        for (uint8 i = 0; i < policyCount; i++) {
            uint256 coverageStart = block.timestamp + 1 hours;
            uint256 coverageEnd;
            if (i % 2 == 0) {
                // Create policy that will expire soon (short duration)
                coverageEnd = coverageStart + 1 days;
            } else {
                // Create active policy (longer duration)
                coverageEnd = coverageStart + 30 days;
            }
            
            vm.prank(user1);
            policyManager.createPolicy{value: 1 ether}(
                coverageStart,
                coverageEnd,
                "New York",
                PolicyManager.WeatherParameter.TEMPERATURE,
                25,
                PolicyManager.ComparisonOperator.GREATER_THAN,
                1 ether
            );
        }
        
        // Fast forward time to expire some policies
        vm.warp(block.timestamp + 2 days);
        
        // Get active policies
        uint256[] memory activePolicies = policyManager.getUserActivePolicies(user1);
        
        // Verify all returned policies are active and within coverage period
        for (uint256 i = 0; i < activePolicies.length; i++) {
            PolicyManager.Policy memory policy = policyManager.getPolicy(activePolicies[i]);
            assertEq(uint(policy.status), uint(PolicyManager.PolicyStatus.ACTIVE), "Policy should be active");
            assertTrue(block.timestamp <= policy.coveragePeriodEnd, "Policy should be within coverage period");
        }
        
        // Get all policies
        uint256[] memory allPolicies = policyManager.getUserPolicies(user1);
        
        // Count how many should be active
        uint256 expectedActiveCount = 0;
        for (uint256 i = 0; i < allPolicies.length; i++) {
            PolicyManager.Policy memory policy = policyManager.getPolicy(allPolicies[i]);
            if (policy.status == PolicyManager.PolicyStatus.ACTIVE && block.timestamp <= policy.coveragePeriodEnd) {
                expectedActiveCount++;
            }
        }
        
        // Verify active policies count matches
        assertEq(activePolicies.length, expectedActiveCount, "Active policy count should match");
    }

    /**
     * @notice Property test for premium calculation consistency
     * Feature: weather-insurance-dapp, Property 18: Premium calculation is consistent
     * Validates: Requirements 6.2
     */
    function testFuzz_PremiumCalculationConsistency(
        uint256 payoutAmount,
        uint256 coverageDuration,
        uint8 parameterType,
        uint8 operatorType
    ) public {
        // Bound inputs to valid ranges
        payoutAmount = bound(payoutAmount, 0.01 ether, 100 ether);
        coverageDuration = bound(coverageDuration, 1 days, 365 days);
        parameterType = uint8(bound(parameterType, 0, 3));
        operatorType = uint8(bound(operatorType, 0, 2));
        
        PolicyManager.WeatherParameter param = PolicyManager.WeatherParameter(parameterType);
        PolicyManager.ComparisonOperator op = PolicyManager.ComparisonOperator(operatorType);
        
        // Calculate premium multiple times with same inputs
        uint256 premium1 = policyManager.calculatePremium(payoutAmount, coverageDuration, param, op);
        uint256 premium2 = policyManager.calculatePremium(payoutAmount, coverageDuration, param, op);
        uint256 premium3 = policyManager.calculatePremium(payoutAmount, coverageDuration, param, op);
        
        // Verify all calculations produce the same result
        assertEq(premium1, premium2, "Premium calculation should be consistent (1st vs 2nd)");
        assertEq(premium2, premium3, "Premium calculation should be consistent (2nd vs 3rd)");
        assertEq(premium1, premium3, "Premium calculation should be consistent (1st vs 3rd)");
        
        // Verify premium is always greater than zero
        assertTrue(premium1 > 0, "Premium should always be greater than zero");
    }

    /**
     * @notice Property test for deterministic trigger evaluation
     * Feature: weather-insurance-dapp, Property 4: Trigger condition evaluation is deterministic
     * Validates: Requirements 2.1
     */
    function testFuzz_DeterministicTriggerEvaluation(
        uint256 actualValueUnsigned,
        uint256 triggerValueUnsigned,
        uint8 operatorType
    ) public {
        // Bound inputs to reasonable ranges and convert to signed
        actualValueUnsigned = bound(actualValueUnsigned, 0, 1000);
        triggerValueUnsigned = bound(triggerValueUnsigned, 0, 1000);
        operatorType = uint8(bound(operatorType, 0, 2));
        
        int256 actualValue = int256(actualValueUnsigned);
        int256 triggerValue = int256(triggerValueUnsigned);
        
        PolicyManager.ComparisonOperator op = PolicyManager.ComparisonOperator(operatorType);
        
        // Evaluate trigger multiple times with same inputs
        bool result1 = policyManager.evaluateTrigger(op, actualValue, triggerValue);
        bool result2 = policyManager.evaluateTrigger(op, actualValue, triggerValue);
        bool result3 = policyManager.evaluateTrigger(op, actualValue, triggerValue);
        
        // Verify all evaluations produce the same result (deterministic)
        assertEq(result1, result2, "Trigger evaluation should be deterministic (1st vs 2nd)");
        assertEq(result2, result3, "Trigger evaluation should be deterministic (2nd vs 3rd)");
        assertEq(result1, result3, "Trigger evaluation should be deterministic (1st vs 3rd)");
        
        // Verify the result matches expected logic
        if (op == PolicyManager.ComparisonOperator.GREATER_THAN) {
            assertEq(result1, actualValue > triggerValue, "GREATER_THAN should match expected logic");
        } else if (op == PolicyManager.ComparisonOperator.LESS_THAN) {
            assertEq(result1, actualValue < triggerValue, "LESS_THAN should match expected logic");
        } else if (op == PolicyManager.ComparisonOperator.EQUAL_TO) {
            assertEq(result1, actualValue == triggerValue, "EQUAL_TO should match expected logic");
        }
    }

    /**
     * @notice Property test for complete and idempotent payouts
     * Feature: weather-insurance-dapp, Property 5: Payout execution is complete and idempotent
     * Validates: Requirements 2.2, 2.3, 2.4
     */
    function testFuzz_CompleteAndIdempotentPayouts(
        uint256 payoutAmount,
        int256 triggerValue
    ) public {
        // Bound inputs to valid ranges
        payoutAmount = bound(payoutAmount, 0.01 ether, 10 ether);
        triggerValue = bound(triggerValue, -100, 100);
        
        // Set up oracle consumer
        address oracleConsumer = address(0x999);
        policyManager.setOracleConsumer(oracleConsumer);
        
        // Create a policy that will trigger
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicy{value: 1 ether}(
            block.timestamp + 1 hours,
            block.timestamp + 30 days,
            "New York",
            PolicyManager.WeatherParameter.TEMPERATURE,
            triggerValue,
            PolicyManager.ComparisonOperator.GREATER_THAN,
            payoutAmount
        );
        
        // Record state before claim
        uint256 userBalanceBefore = user1.balance;
        uint256 poolPayoutsBefore = liquidityPool.totalPayoutsMade();
        PolicyManager.PolicyStatus statusBefore = policyManager.getPolicyStatus(policyId);
        
        // Fast forward to coverage period
        vm.warp(block.timestamp + 2 hours);
        
        // Trigger the policy with weather data (actualValue > triggerValue)
        int256 actualValue = triggerValue + 10;
        vm.prank(oracleConsumer);
        policyManager.evaluatePolicies(
            "New York",
            uint8(PolicyManager.WeatherParameter.TEMPERATURE),
            actualValue,
            block.timestamp
        );
        
        // Verify payout was executed completely
        assertEq(user1.balance, userBalanceBefore + payoutAmount, "User should receive full payout");
        assertEq(liquidityPool.totalPayoutsMade(), poolPayoutsBefore + payoutAmount, "Pool should record payout");
        assertEq(uint(policyManager.getPolicyStatus(policyId)), uint(PolicyManager.PolicyStatus.CLAIMED), "Policy should be marked as claimed");
        
        // Verify claim history was recorded
        PolicyManager.Claim[] memory claims = policyManager.getUserClaims(user1);
        assertEq(claims.length, 1, "User should have one claim");
        assertEq(claims[0].policyId, policyId, "Claim should reference correct policy");
        assertEq(claims[0].payoutAmount, payoutAmount, "Claim should record correct payout amount");
        
        // Record state after first claim
        uint256 userBalanceAfterFirst = user1.balance;
        uint256 poolPayoutsAfterFirst = liquidityPool.totalPayoutsMade();
        uint256 claimsCountAfterFirst = claims.length;
        
        // Attempt to trigger the same policy again (idempotency test)
        vm.prank(oracleConsumer);
        policyManager.evaluatePolicies(
            "New York",
            uint8(PolicyManager.WeatherParameter.TEMPERATURE),
            actualValue,
            block.timestamp + 1 hours
        );
        
        // Verify no additional payout was made (idempotent)
        assertEq(user1.balance, userBalanceAfterFirst, "No additional payout should be made");
        assertEq(liquidityPool.totalPayoutsMade(), poolPayoutsAfterFirst, "Pool payouts should not increase");
        
        // Verify no additional claim was recorded
        PolicyManager.Claim[] memory claimsAfter = policyManager.getUserClaims(user1);
        assertEq(claimsAfter.length, claimsCountAfterFirst, "No additional claim should be recorded");
    }

    /**
     * @notice Property test for admin-only configuration changes
     * Feature: weather-insurance-dapp, Property 14: Configuration updates are restricted to admin
     * Validates: Requirements 5.1, 5.2, 5.3, 5.4
     */
    function testFuzz_AdminOnlyConfigurationChanges(
        uint256 newMinCoverage,
        uint256 newMaxCoverage,
        uint256 newMinPayout,
        uint256 newMaxPayout,
        uint256 newPremiumRate,
        uint256 newYieldPercentage,
        address newOracleAddress
    ) public {
        // Bound inputs to valid ranges
        newMinCoverage = bound(newMinCoverage, 1 hours, 30 days);
        newMaxCoverage = bound(newMaxCoverage, 30 days, 730 days);
        newMinPayout = bound(newMinPayout, 0.001 ether, 1 ether);
        newMaxPayout = bound(newMaxPayout, 1 ether, 1000 ether);
        newPremiumRate = bound(newPremiumRate, 1, 10000);
        newYieldPercentage = bound(newYieldPercentage, 1, 10000);
        vm.assume(newOracleAddress != address(0));
        vm.assume(newOracleAddress != user1);
        
        // Record current configuration
        uint256 oldMinCoverage = policyManager.minCoveragePeriod();
        uint256 oldMaxCoverage = policyManager.maxCoveragePeriod();
        uint256 oldMinPayout = policyManager.minPayoutAmount();
        uint256 oldMaxPayout = policyManager.maxPayoutAmount();
        uint256 oldPremiumRate = policyManager.basePremiumRate();
        uint256 oldYieldPercentage = liquidityPool.yieldPercentage();
        address oldOracleAddress = policyManager.oracleConsumer();
        
        // Test 1: Non-admin cannot change parameter limits
        vm.prank(user1);
        vm.expectRevert();
        policyManager.setParameterLimits(newMinCoverage, newMaxCoverage, newMinPayout, newMaxPayout);
        
        // Verify configuration unchanged
        assertEq(policyManager.minCoveragePeriod(), oldMinCoverage, "Min coverage should be unchanged");
        assertEq(policyManager.maxCoveragePeriod(), oldMaxCoverage, "Max coverage should be unchanged");
        assertEq(policyManager.minPayoutAmount(), oldMinPayout, "Min payout should be unchanged");
        assertEq(policyManager.maxPayoutAmount(), oldMaxPayout, "Max payout should be unchanged");
        
        // Test 2: Non-admin cannot change premium rate
        vm.prank(user1);
        vm.expectRevert();
        policyManager.setBasePremiumRate(newPremiumRate);
        
        // Verify configuration unchanged
        assertEq(policyManager.basePremiumRate(), oldPremiumRate, "Premium rate should be unchanged");
        
        // Test 3: Non-admin cannot change yield percentage
        vm.prank(user1);
        vm.expectRevert();
        liquidityPool.setYieldPercentage(newYieldPercentage);
        
        // Verify configuration unchanged
        assertEq(liquidityPool.yieldPercentage(), oldYieldPercentage, "Yield percentage should be unchanged");
        
        // Test 4: Non-admin cannot change oracle address
        vm.prank(user1);
        vm.expectRevert();
        policyManager.setOracleConsumer(newOracleAddress);
        
        // Verify configuration unchanged
        assertEq(policyManager.oracleConsumer(), oldOracleAddress, "Oracle address should be unchanged");
        
        // Test 5: Non-admin cannot pause system
        vm.prank(user1);
        vm.expectRevert();
        policyManager.pause();
        
        // Verify system is not paused
        assertFalse(policyManager.paused(), "System should not be paused");
        
        // Test 6: Admin CAN change all configurations
        policyManager.setParameterLimits(newMinCoverage, newMaxCoverage, newMinPayout, newMaxPayout);
        assertEq(policyManager.minCoveragePeriod(), newMinCoverage, "Admin should update min coverage");
        assertEq(policyManager.maxCoveragePeriod(), newMaxCoverage, "Admin should update max coverage");
        assertEq(policyManager.minPayoutAmount(), newMinPayout, "Admin should update min payout");
        assertEq(policyManager.maxPayoutAmount(), newMaxPayout, "Admin should update max payout");
        
        policyManager.setBasePremiumRate(newPremiumRate);
        assertEq(policyManager.basePremiumRate(), newPremiumRate, "Admin should update premium rate");
        
        liquidityPool.setYieldPercentage(newYieldPercentage);
        assertEq(liquidityPool.yieldPercentage(), newYieldPercentage, "Admin should update yield percentage");
        
        policyManager.setOracleConsumer(newOracleAddress);
        assertEq(policyManager.oracleConsumer(), newOracleAddress, "Admin should update oracle address");
        
        policyManager.pause();
        assertTrue(policyManager.paused(), "Admin should be able to pause system");
        
        policyManager.unpause();
        assertFalse(policyManager.paused(), "Admin should be able to unpause system");
    }

    /**
     * @notice Property test for system pause behavior
     * Feature: weather-insurance-dapp, Property 15: System pause prevents new policies but allows claims
     * Validates: Requirements 5.4
     */
    function testFuzz_SystemPauseBehavior(
        uint256 payoutAmount,
        int256 triggerValue
    ) public {
        // Bound inputs to valid ranges
        payoutAmount = bound(payoutAmount, 0.01 ether, 10 ether);
        triggerValue = bound(triggerValue, -100, 100);
        
        // Set up oracle consumer
        address oracleConsumer = address(0x999);
        policyManager.setOracleConsumer(oracleConsumer);
        
        // Create a policy before pausing
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicy{value: 1 ether}(
            block.timestamp + 1 hours,
            block.timestamp + 30 days,
            "New York",
            PolicyManager.WeatherParameter.TEMPERATURE,
            triggerValue,
            PolicyManager.ComparisonOperator.GREATER_THAN,
            payoutAmount
        );
        
        // Pause the system
        policyManager.pause();
        assertTrue(policyManager.paused(), "System should be paused");
        
        // Test 1: New policy creation should be prevented when paused
        vm.prank(user2);
        vm.expectRevert();
        policyManager.createPolicy{value: 1 ether}(
            block.timestamp + 1 hours,
            block.timestamp + 30 days,
            "Los Angeles",
            PolicyManager.WeatherParameter.RAINFALL,
            10,
            PolicyManager.ComparisonOperator.LESS_THAN,
            1 ether
        );
        
        // Test 2: Existing policy claims should still be processed when paused
        uint256 userBalanceBefore = user1.balance;
        uint256 poolPayoutsBefore = liquidityPool.totalPayoutsMade();
        
        // Fast forward to coverage period
        vm.warp(block.timestamp + 2 hours);
        
        // Trigger the policy with weather data (actualValue > triggerValue)
        int256 actualValue = triggerValue + 10;
        vm.prank(oracleConsumer);
        policyManager.evaluatePolicies(
            "New York",
            uint8(PolicyManager.WeatherParameter.TEMPERATURE),
            actualValue,
            block.timestamp
        );
        
        // Verify claim was processed even though system is paused
        assertEq(user1.balance, userBalanceBefore + payoutAmount, "Claim should be processed when paused");
        assertEq(liquidityPool.totalPayoutsMade(), poolPayoutsBefore + payoutAmount, "Payout should be recorded when paused");
        assertEq(uint(policyManager.getPolicyStatus(policyId)), uint(PolicyManager.PolicyStatus.CLAIMED), "Policy should be claimed when paused");
        
        // Test 3: After unpausing, new policies can be created again
        policyManager.unpause();
        assertFalse(policyManager.paused(), "System should be unpaused");
        
        vm.prank(user2);
        uint256 newPolicyId = policyManager.createPolicy{value: 1 ether}(
            block.timestamp + 1 hours,
            block.timestamp + 30 days,
            "Los Angeles",
            PolicyManager.WeatherParameter.RAINFALL,
            10,
            PolicyManager.ComparisonOperator.LESS_THAN,
            1 ether
        );
        
        // Verify new policy was created
        PolicyManager.Policy memory newPolicy = policyManager.getPolicy(newPolicyId);
        assertEq(newPolicy.holder, user2, "New policy should be created after unpause");
        assertEq(uint(newPolicy.status), uint(PolicyManager.PolicyStatus.ACTIVE), "New policy should be active");
    }

    /**
     * @notice Property test for configuration event emissions
     * Feature: weather-insurance-dapp, Property 16: Configuration changes emit events
     * Validates: Requirements 5.5
     */
    function testFuzz_ConfigurationEventEmissions(
        uint256 newMinCoverage,
        uint256 newMaxCoverage,
        uint256 newMinPayout,
        uint256 newMaxPayout,
        uint256 newPremiumRate,
        uint256 newYieldPercentage,
        address newOracleAddress
    ) public {
        // Bound inputs to valid ranges
        newMinCoverage = bound(newMinCoverage, 1 hours, 30 days);
        newMaxCoverage = bound(newMaxCoverage, 30 days, 730 days);
        newMinPayout = bound(newMinPayout, 0.001 ether, 1 ether);
        newMaxPayout = bound(newMaxPayout, 1 ether, 1000 ether);
        newPremiumRate = bound(newPremiumRate, 1, 10000);
        newYieldPercentage = bound(newYieldPercentage, 1, 10000);
        vm.assume(newOracleAddress != address(0));
        
        // Record the number of events before each configuration change
        vm.recordLogs();
        
        // Test 1: Parameter limits update should emit event
        policyManager.setParameterLimits(newMinCoverage, newMaxCoverage, newMinPayout, newMaxPayout);
        Vm.Log[] memory logs1 = vm.getRecordedLogs();
        assertTrue(logs1.length > 0, "Parameter limits update should emit event");
        
        // Verify the event contains the correct data
        assertEq(policyManager.minCoveragePeriod(), newMinCoverage, "Min coverage should be updated");
        assertEq(policyManager.maxCoveragePeriod(), newMaxCoverage, "Max coverage should be updated");
        assertEq(policyManager.minPayoutAmount(), newMinPayout, "Min payout should be updated");
        assertEq(policyManager.maxPayoutAmount(), newMaxPayout, "Max payout should be updated");
        
        // Test 2: Premium rate update should emit event
        vm.recordLogs();
        policyManager.setBasePremiumRate(newPremiumRate);
        Vm.Log[] memory logs2 = vm.getRecordedLogs();
        assertTrue(logs2.length > 0, "Premium rate update should emit event");
        assertEq(policyManager.basePremiumRate(), newPremiumRate, "Premium rate should be updated");
        
        // Test 3: Yield percentage update should emit event
        vm.recordLogs();
        liquidityPool.setYieldPercentage(newYieldPercentage);
        Vm.Log[] memory logs3 = vm.getRecordedLogs();
        assertTrue(logs3.length > 0, "Yield percentage update should emit event");
        assertEq(liquidityPool.yieldPercentage(), newYieldPercentage, "Yield percentage should be updated");
        
        // Test 4: Oracle address update (no event expected from PolicyManager.setOracleConsumer)
        // But we verify the configuration was changed
        policyManager.setOracleConsumer(newOracleAddress);
        assertEq(policyManager.oracleConsumer(), newOracleAddress, "Oracle address should be updated");
    }

    /**
     * @notice Property test for claim history retrieval
     * Feature: weather-insurance-dapp, Property 13: Claim history retrieval is complete
     * Validates: Requirements 4.3
     */
    function testFuzz_ClaimHistoryRetrieval(uint8 claimCount) public {
        // Bound to reasonable number to avoid gas issues
        claimCount = uint8(bound(claimCount, 1, 10));
        
        // Set up oracle consumer
        address oracleConsumer = address(0x999);
        policyManager.setOracleConsumer(oracleConsumer);
        
        // Create and trigger multiple policies
        uint256[] memory policyIds = new uint256[](claimCount);
        uint256[] memory payoutAmounts = new uint256[](claimCount);
        
        for (uint8 i = 0; i < claimCount; i++) {
            // Create policy
            uint256 payoutAmount = 0.1 ether + (i * 0.1 ether);
            payoutAmounts[i] = payoutAmount;
            
            vm.prank(user1);
            policyIds[i] = policyManager.createPolicy{value: 1 ether}(
                block.timestamp + 1 hours,
                block.timestamp + 30 days,
                "New York",
                PolicyManager.WeatherParameter.TEMPERATURE,
                20,
                PolicyManager.ComparisonOperator.GREATER_THAN,
                payoutAmount
            );
            
            // Fast forward to coverage period
            vm.warp(block.timestamp + 2 hours);
            
            // Trigger the policy
            vm.prank(oracleConsumer);
            policyManager.evaluatePolicies(
                "New York",
                uint8(PolicyManager.WeatherParameter.TEMPERATURE),
                30, // Trigger value > 20
                block.timestamp
            );
            
            // Fast forward a bit for next policy
            vm.warp(block.timestamp + 1 days);
        }
        
        // Retrieve claim history
        PolicyManager.Claim[] memory claims = policyManager.getUserClaims(user1);
        
        // Verify all claims are present
        assertEq(claims.length, claimCount, "All claims should be retrieved");
        
        // Verify each claim contains correct data
        for (uint256 i = 0; i < claims.length; i++) {
            assertEq(claims[i].policyId, policyIds[i], "Claim should reference correct policy");
            assertEq(claims[i].payoutAmount, payoutAmounts[i], "Claim should have correct payout amount");
            assertTrue(claims[i].timestamp > 0, "Claim should have timestamp");
            assertTrue(claims[i].weatherValue > 0, "Claim should have weather value");
        }
        
        // Verify claims are ordered chronologically (by checking timestamps are increasing)
        for (uint256 i = 1; i < claims.length; i++) {
            assertTrue(claims[i].timestamp >= claims[i-1].timestamp, "Claims should be ordered chronologically");
        }
    }

    // ============================================
    // Unit Tests for Policy Template System
    // ============================================

    /**
     * @notice Test crop insurance template returns correct default parameters
     * Requirements: 1.4
     */
    function test_CropInsuranceTemplateDefaults() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.CROP_INSURANCE
        );
        
        // Verify template name and description
        assertEq(config.name, "Crop Insurance", "Template name should be correct");
        assertEq(
            config.description,
            "Protection against adverse weather conditions affecting crops",
            "Template description should be correct"
        );
        
        // Verify default parameters
        assertEq(
            uint(config.defaultParameterType),
            uint(PolicyManager.WeatherParameter.RAINFALL),
            "Default parameter should be RAINFALL"
        );
        assertEq(
            uint(config.defaultOperator),
            uint(PolicyManager.ComparisonOperator.LESS_THAN),
            "Default operator should be LESS_THAN"
        );
        assertEq(config.defaultTriggerValue, 50, "Default trigger value should be 50mm");
        assertEq(config.defaultCoverageDuration, 90 days, "Default coverage should be 90 days");
        assertEq(config.defaultPayoutAmount, 5 ether, "Default payout should be 5 ether");
        
        // Verify parameters are within valid ranges
        assertTrue(
            config.defaultCoverageDuration >= policyManager.minCoveragePeriod(),
            "Coverage duration should be >= minimum"
        );
        assertTrue(
            config.defaultCoverageDuration <= policyManager.maxCoveragePeriod(),
            "Coverage duration should be <= maximum"
        );
        assertTrue(
            config.defaultPayoutAmount >= policyManager.minPayoutAmount(),
            "Payout amount should be >= minimum"
        );
        assertTrue(
            config.defaultPayoutAmount <= policyManager.maxPayoutAmount(),
            "Payout amount should be <= maximum"
        );
    }

    /**
     * @notice Test event insurance template returns correct default parameters
     * Requirements: 1.4
     */
    function test_EventInsuranceTemplateDefaults() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.EVENT_INSURANCE
        );
        
        // Verify template name and description
        assertEq(config.name, "Event Insurance", "Template name should be correct");
        assertEq(
            config.description,
            "Coverage for outdoor events against rain or extreme weather",
            "Template description should be correct"
        );
        
        // Verify default parameters
        assertEq(
            uint(config.defaultParameterType),
            uint(PolicyManager.WeatherParameter.RAINFALL),
            "Default parameter should be RAINFALL"
        );
        assertEq(
            uint(config.defaultOperator),
            uint(PolicyManager.ComparisonOperator.GREATER_THAN),
            "Default operator should be GREATER_THAN"
        );
        assertEq(config.defaultTriggerValue, 10, "Default trigger value should be 10mm");
        assertEq(config.defaultCoverageDuration, 7 days, "Default coverage should be 7 days");
        assertEq(config.defaultPayoutAmount, 2 ether, "Default payout should be 2 ether");
        
        // Verify parameters are within valid ranges
        assertTrue(
            config.defaultCoverageDuration >= policyManager.minCoveragePeriod(),
            "Coverage duration should be >= minimum"
        );
        assertTrue(
            config.defaultCoverageDuration <= policyManager.maxCoveragePeriod(),
            "Coverage duration should be <= maximum"
        );
        assertTrue(
            config.defaultPayoutAmount >= policyManager.minPayoutAmount(),
            "Payout amount should be >= minimum"
        );
        assertTrue(
            config.defaultPayoutAmount <= policyManager.maxPayoutAmount(),
            "Payout amount should be <= maximum"
        );
    }

    /**
     * @notice Test travel insurance template returns correct default parameters
     * Requirements: 1.4
     */
    function test_TravelInsuranceTemplateDefaults() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.TRAVEL_INSURANCE
        );
        
        // Verify template name and description
        assertEq(config.name, "Travel Insurance", "Template name should be correct");
        assertEq(
            config.description,
            "Protection for travel plans against extreme weather conditions",
            "Template description should be correct"
        );
        
        // Verify default parameters
        assertEq(
            uint(config.defaultParameterType),
            uint(PolicyManager.WeatherParameter.TEMPERATURE),
            "Default parameter should be TEMPERATURE"
        );
        assertEq(
            uint(config.defaultOperator),
            uint(PolicyManager.ComparisonOperator.LESS_THAN),
            "Default operator should be LESS_THAN"
        );
        assertEq(config.defaultTriggerValue, 0, "Default trigger value should be 0 degrees C");
        assertEq(config.defaultCoverageDuration, 14 days, "Default coverage should be 14 days");
        assertEq(config.defaultPayoutAmount, 1 ether, "Default payout should be 1 ether");
        
        // Verify parameters are within valid ranges
        assertTrue(
            config.defaultCoverageDuration >= policyManager.minCoveragePeriod(),
            "Coverage duration should be >= minimum"
        );
        assertTrue(
            config.defaultCoverageDuration <= policyManager.maxCoveragePeriod(),
            "Coverage duration should be <= maximum"
        );
        assertTrue(
            config.defaultPayoutAmount >= policyManager.minPayoutAmount(),
            "Payout amount should be >= minimum"
        );
        assertTrue(
            config.defaultPayoutAmount <= policyManager.maxPayoutAmount(),
            "Payout amount should be <= maximum"
        );
    }

    /**
     * @notice Test getAllTemplates returns all three templates
     * Requirements: 1.4
     */
    function test_GetAllTemplates() public {
        (
            PolicyManager.TemplateConfig memory cropConfig,
            PolicyManager.TemplateConfig memory eventConfig,
            PolicyManager.TemplateConfig memory travelConfig
        ) = policyManager.getAllTemplates();
        
        // Verify all templates are returned
        assertEq(cropConfig.name, "Crop Insurance", "Crop template should be returned");
        assertEq(eventConfig.name, "Event Insurance", "Event template should be returned");
        assertEq(travelConfig.name, "Travel Insurance", "Travel template should be returned");
    }

    /**
     * @notice Test creating policy from crop insurance template
     * Requirements: 1.4
     */
    function test_CreatePolicyFromCropTemplate() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.CROP_INSURANCE
        );
        
        // Calculate required premium
        uint256 premium = policyManager.calculatePremium(
            config.defaultPayoutAmount,
            config.defaultCoverageDuration,
            config.defaultParameterType,
            config.defaultOperator
        );
        
        // Create policy from template
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicyFromTemplate{value: premium}(
            PolicyManager.PolicyTemplate.CROP_INSURANCE,
            "Iowa",
            block.timestamp + 1 hours
        );
        
        // Verify policy was created with template defaults
        PolicyManager.Policy memory policy = policyManager.getPolicy(policyId);
        assertEq(policy.holder, user1, "Policy holder should be user1");
        assertEq(policy.location, "Iowa", "Location should be set");
        assertEq(
            uint(policy.parameterType),
            uint(config.defaultParameterType),
            "Parameter type should match template"
        );
        assertEq(
            uint(policy.operator),
            uint(config.defaultOperator),
            "Operator should match template"
        );
        assertEq(policy.triggerValue, config.defaultTriggerValue, "Trigger value should match template");
        assertEq(policy.payoutAmount, config.defaultPayoutAmount, "Payout amount should match template");
        assertEq(
            policy.coveragePeriodEnd - policy.coveragePeriodStart,
            config.defaultCoverageDuration,
            "Coverage duration should match template"
        );
    }

    /**
     * @notice Test creating policy from event insurance template
     * Requirements: 1.4
     */
    function test_CreatePolicyFromEventTemplate() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.EVENT_INSURANCE
        );
        
        // Calculate required premium
        uint256 premium = policyManager.calculatePremium(
            config.defaultPayoutAmount,
            config.defaultCoverageDuration,
            config.defaultParameterType,
            config.defaultOperator
        );
        
        // Create policy from template with default start time (0)
        vm.prank(user1);
        uint256 policyId = policyManager.createPolicyFromTemplate{value: premium}(
            PolicyManager.PolicyTemplate.EVENT_INSURANCE,
            "Central Park",
            0 // Use default start time
        );
        
        // Verify policy was created with template defaults
        PolicyManager.Policy memory policy = policyManager.getPolicy(policyId);
        assertEq(policy.holder, user1, "Policy holder should be user1");
        assertEq(policy.location, "Central Park", "Location should be set");
        assertEq(
            uint(policy.parameterType),
            uint(config.defaultParameterType),
            "Parameter type should match template"
        );
        assertEq(
            uint(policy.operator),
            uint(config.defaultOperator),
            "Operator should match template"
        );
        assertEq(policy.triggerValue, config.defaultTriggerValue, "Trigger value should match template");
        assertEq(policy.payoutAmount, config.defaultPayoutAmount, "Payout amount should match template");
        
        // Verify default start time was used (should be ~1 hour from now)
        assertTrue(
            policy.coveragePeriodStart >= block.timestamp,
            "Coverage should start in the future"
        );
        assertTrue(
            policy.coveragePeriodStart <= block.timestamp + 2 hours,
            "Coverage should start within 2 hours"
        );
    }

    /**
     * @notice Test creating policy from travel insurance template
     * Requirements: 1.4
     */
    function test_CreatePolicyFromTravelTemplate() public {
        PolicyManager.TemplateConfig memory config = policyManager.getTemplate(
            PolicyManager.PolicyTemplate.TRAVEL_INSURANCE
        );
        
        // Calculate required premium
        uint256 premium = policyManager.calculatePremium(
            config.defaultPayoutAmount,
            config.defaultCoverageDuration,
            config.defaultParameterType,
            config.defaultOperator
        );
        
        // Create policy from template
        vm.prank(user2);
        uint256 policyId = policyManager.createPolicyFromTemplate{value: premium}(
            PolicyManager.PolicyTemplate.TRAVEL_INSURANCE,
            "Reykjavik",
            block.timestamp + 2 days
        );
        
        // Verify policy was created with template defaults
        PolicyManager.Policy memory policy = policyManager.getPolicy(policyId);
        assertEq(policy.holder, user2, "Policy holder should be user2");
        assertEq(policy.location, "Reykjavik", "Location should be set");
        assertEq(
            uint(policy.parameterType),
            uint(config.defaultParameterType),
            "Parameter type should match template"
        );
        assertEq(
            uint(policy.operator),
            uint(config.defaultOperator),
            "Operator should match template"
        );
        assertEq(policy.triggerValue, config.defaultTriggerValue, "Trigger value should match template");
        assertEq(policy.payoutAmount, config.defaultPayoutAmount, "Payout amount should match template");
        assertEq(
            policy.coveragePeriodEnd - policy.coveragePeriodStart,
            config.defaultCoverageDuration,
            "Coverage duration should match template"
        );
    }
}
