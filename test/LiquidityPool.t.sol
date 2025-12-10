// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LiquidityPool.sol";

/**
 * @title LiquidityPoolTest
 * @notice Test suite for LiquidityPool contract
 */
contract LiquidityPoolTest is Test {
    LiquidityPool public liquidityPool;
    address public policyManager;
    address public alice;
    address public bob;
    address public charlie;

    function setUp() public {
        liquidityPool = new LiquidityPool();
        policyManager = makeAddr("policyManager");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        
        // Set policy manager
        liquidityPool.setPolicyManager(policyManager);
        
        // Fund test accounts
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        vm.deal(charlie, 1000 ether);
    }

    /**
     * Feature: weather-insurance-dapp, Property 7: LP token minting is proportional to deposit
     * Validates: Requirements 3.1
     * 
     * For any liquidity deposit amount, the number of LP tokens minted should equal 
     * (deposit amount × total LP tokens) / total pool value, maintaining proportional ownership.
     */
    function testFuzz_LPTokenMintingProportional(uint96 firstDeposit, uint96 secondDeposit) public {
        // Bound inputs to reasonable values (avoid zero and overflow)
        vm.assume(firstDeposit > 0.01 ether && firstDeposit < 100 ether);
        vm.assume(secondDeposit > 0.01 ether && secondDeposit < 100 ether);
        
        // First deposit - should get 1:1 ratio
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: firstDeposit}();
        
        // For first deposit, LP tokens should equal deposit amount
        assertEq(aliceLPTokens, firstDeposit, "First deposit should have 1:1 LP token ratio");
        assertEq(liquidityPool.lpTokenBalances(alice), firstDeposit, "Alice LP balance incorrect");
        assertEq(liquidityPool.totalLPTokens(), firstDeposit, "Total LP tokens incorrect");
        assertEq(liquidityPool.totalPoolValue(), firstDeposit, "Total pool value incorrect");
        
        // Second deposit - should be proportional
        uint256 poolValueBefore = liquidityPool.totalPoolValue();
        uint256 totalLPTokensBefore = liquidityPool.totalLPTokens();
        
        vm.prank(bob);
        uint256 bobLPTokens = liquidityPool.deposit{value: secondDeposit}();
        
        // Calculate expected LP tokens: (deposit × totalLPTokens) / totalPoolValue
        uint256 expectedBobLPTokens = (secondDeposit * totalLPTokensBefore) / poolValueBefore;
        
        assertEq(bobLPTokens, expectedBobLPTokens, "Second deposit LP tokens not proportional");
        assertEq(liquidityPool.lpTokenBalances(bob), expectedBobLPTokens, "Bob LP balance incorrect");
        
        // Verify proportional ownership
        uint256 totalPoolValueAfter = liquidityPool.totalPoolValue();
        uint256 totalLPTokensAfter = liquidityPool.totalLPTokens();
        
        // Alice's share should be: (aliceLPTokens / totalLPTokens) × totalPoolValue
        uint256 aliceExpectedShare = (aliceLPTokens * totalPoolValueAfter) / totalLPTokensAfter;
        assertApproxEqAbs(aliceExpectedShare, firstDeposit, 1, "Alice's proportional share incorrect");
        
        // Bob's share should be: (bobLPTokens / totalLPTokens) × totalPoolValue
        uint256 bobExpectedShare = (bobLPTokens * totalPoolValueAfter) / totalLPTokensAfter;
        assertApproxEqAbs(bobExpectedShare, secondDeposit, 1, "Bob's proportional share incorrect");
    }

    /**
     * Additional test: Multiple deposits maintain proportionality
     */
    function testFuzz_MultipleDepositsProportional(uint96 deposit1, uint96 deposit2, uint96 deposit3) public {
        // Bound inputs using bound() for better fuzzing
        deposit1 = uint96(bound(deposit1, 0.01 ether, 50 ether));
        deposit2 = uint96(bound(deposit2, 0.01 ether, 50 ether));
        deposit3 = uint96(bound(deposit3, 0.01 ether, 50 ether));
        
        // First deposit
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit1}();
        
        // Second deposit
        vm.prank(bob);
        uint256 bobLPTokens = liquidityPool.deposit{value: deposit2}();
        
        // Third deposit
        vm.prank(charlie);
        uint256 charlieLPTokens = liquidityPool.deposit{value: deposit3}();
        
        // Verify total pool value equals sum of deposits
        uint256 totalDeposits = uint256(deposit1) + uint256(deposit2) + uint256(deposit3);
        assertEq(liquidityPool.totalPoolValue(), totalDeposits, "Total pool value incorrect");
        
        // Verify each user's proportional share
        uint256 totalPoolValue = liquidityPool.totalPoolValue();
        uint256 totalLPTokens = liquidityPool.totalLPTokens();
        
        uint256 aliceShare = (aliceLPTokens * totalPoolValue) / totalLPTokens;
        uint256 bobShare = (bobLPTokens * totalPoolValue) / totalLPTokens;
        uint256 charlieShare = (charlieLPTokens * totalPoolValue) / totalLPTokens;
        
        assertApproxEqAbs(aliceShare, deposit1, 2, "Alice's share incorrect");
        assertApproxEqAbs(bobShare, deposit2, 2, "Bob's share incorrect");
        assertApproxEqAbs(charlieShare, deposit3, 2, "Charlie's share incorrect");
    }

    /**
     * Feature: weather-insurance-dapp, Property 8: Withdrawal returns proportional pool share
     * Validates: Requirements 3.3
     * 
     * For any LP token burn during withdrawal, the amount returned should equal 
     * (LP tokens burned × total pool value) / total LP tokens, ensuring fair proportional distribution.
     */
    function testFuzz_WithdrawalProportionalShare(uint96 deposit1, uint96 deposit2, uint16 withdrawPercentage) public {
        // Bound inputs using bound() instead of assume for better fuzzing
        deposit1 = uint96(bound(deposit1, 0.1 ether, 100 ether));
        deposit2 = uint96(bound(deposit2, 0.1 ether, 100 ether));
        withdrawPercentage = uint16(bound(withdrawPercentage, 100, 10000)); // 1-100% in basis points
        
        // Alice deposits
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit1}();
        
        // Bob deposits
        vm.prank(bob);
        liquidityPool.deposit{value: deposit2}();
        
        // Calculate withdrawal amount (percentage of Alice's LP tokens)
        uint256 lpTokensToWithdraw = (aliceLPTokens * withdrawPercentage) / 10000;
        
        // Record state before withdrawal
        uint256 poolValueBefore = liquidityPool.totalPoolValue();
        uint256 totalLPTokensBefore = liquidityPool.totalLPTokens();
        uint256 aliceBalanceBefore = alice.balance;
        
        // Calculate expected withdrawal amount
        uint256 expectedWithdrawal = (lpTokensToWithdraw * poolValueBefore) / totalLPTokensBefore;
        
        // Alice withdraws
        vm.prank(alice);
        uint256 actualWithdrawal = liquidityPool.withdraw(lpTokensToWithdraw);
        
        // Verify withdrawal amount is proportional
        assertEq(actualWithdrawal, expectedWithdrawal, "Withdrawal amount not proportional");
        
        // Verify Alice received the funds
        assertEq(alice.balance, aliceBalanceBefore + expectedWithdrawal, "Alice didn't receive correct amount");
        
        // Verify pool state updated correctly
        assertEq(liquidityPool.totalPoolValue(), poolValueBefore - expectedWithdrawal, "Pool value not updated");
        assertEq(liquidityPool.totalLPTokens(), totalLPTokensBefore - lpTokensToWithdraw, "Total LP tokens not updated");
        assertEq(liquidityPool.lpTokenBalances(alice), aliceLPTokens - lpTokensToWithdraw, "Alice LP balance not updated");
    }

    /**
     * Additional test: Full withdrawal returns entire proportional share
     */
    function testFuzz_FullWithdrawalReturnsEntireShare(uint96 deposit1, uint96 deposit2) public {
        // Bound inputs
        vm.assume(deposit1 > 0.1 ether && deposit1 < 100 ether);
        vm.assume(deposit2 > 0.1 ether && deposit2 < 100 ether);
        
        // Alice and Bob deposit
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit1}();
        
        vm.prank(bob);
        liquidityPool.deposit{value: deposit2}();
        
        // Calculate Alice's expected share
        uint256 totalPoolValue = liquidityPool.totalPoolValue();
        uint256 totalLPTokens = liquidityPool.totalLPTokens();
        uint256 aliceExpectedShare = (aliceLPTokens * totalPoolValue) / totalLPTokens;
        
        // Alice withdraws all her LP tokens
        uint256 aliceBalanceBefore = alice.balance;
        vm.prank(alice);
        uint256 withdrawn = liquidityPool.withdraw(aliceLPTokens);
        
        // Verify Alice received her proportional share
        assertApproxEqAbs(withdrawn, aliceExpectedShare, 1, "Full withdrawal didn't return proportional share");
        assertEq(alice.balance, aliceBalanceBefore + withdrawn, "Alice didn't receive funds");
        assertEq(liquidityPool.lpTokenBalances(alice), 0, "Alice should have 0 LP tokens");
    }

    /**
     * Feature: weather-insurance-dapp, Property 9: Insufficient liquidity prevents withdrawal
     * Validates: Requirements 3.4
     * 
     * For any withdrawal request where the pool's available funds (after accounting for active 
     * policy liabilities) are less than the requested amount, the system should reject the 
     * withdrawal and maintain the provider's LP tokens unchanged.
     */
    function testFuzz_InsufficientLiquidityPreventsWithdrawal(uint96 deposit, uint96 liability) public {
        // Bound inputs
        deposit = uint96(bound(deposit, 1 ether, 100 ether));
        liability = uint96(bound(liability, 1 ether, 200 ether));
        
        // Ensure liability is greater than deposit to create insufficient liquidity scenario
        vm.assume(liability > deposit);
        
        // Alice deposits
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit}();
        
        // Simulate policy manager setting liability that exceeds available funds
        vm.prank(policyManager);
        liquidityPool.updateLiability(liability);
        
        // Record state before withdrawal attempt
        uint256 aliceLPBalanceBefore = liquidityPool.lpTokenBalances(alice);
        uint256 poolValueBefore = liquidityPool.totalPoolValue();
        uint256 totalLPTokensBefore = liquidityPool.totalLPTokens();
        
        // Calculate withdrawal amount (Alice's full share)
        uint256 withdrawalAmount = (aliceLPTokens * poolValueBefore) / totalLPTokensBefore;
        
        // Available liquidity should be less than withdrawal amount
        uint256 availableLiquidity = poolValueBefore > liability ? poolValueBefore - liability : 0;
        vm.assume(withdrawalAmount > availableLiquidity);
        
        // Attempt withdrawal should revert with InsufficientLiquidity
        vm.prank(alice);
        vm.expectRevert(LiquidityPool.InsufficientLiquidity.selector);
        liquidityPool.withdraw(aliceLPTokens);
        
        // Verify state unchanged after failed withdrawal
        assertEq(liquidityPool.lpTokenBalances(alice), aliceLPBalanceBefore, "LP balance changed after failed withdrawal");
        assertEq(liquidityPool.totalPoolValue(), poolValueBefore, "Pool value changed after failed withdrawal");
        assertEq(liquidityPool.totalLPTokens(), totalLPTokensBefore, "Total LP tokens changed after failed withdrawal");
    }

    /**
     * Additional test: Partial withdrawal succeeds when within available liquidity
     */
    function testFuzz_PartialWithdrawalSucceedsWithinLiquidity(uint96 deposit, uint96 liability, uint16 withdrawPercentage) public {
        // Bound inputs
        deposit = uint96(bound(deposit, 10 ether, 100 ether));
        liability = uint96(bound(liability, 1 ether, uint256(deposit) * 8 / 10)); // Liability is 80% of deposit max
        withdrawPercentage = uint16(bound(withdrawPercentage, 100, 2000)); // 1-20% withdrawal
        
        // Alice deposits
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit}();
        
        // Set liability
        vm.prank(policyManager);
        liquidityPool.updateLiability(liability);
        
        // Calculate available liquidity
        uint256 poolValue = liquidityPool.totalPoolValue();
        uint256 availableLiquidity = poolValue - liability;
        
        // Calculate withdrawal amount that's within available liquidity
        uint256 lpTokensToWithdraw = (aliceLPTokens * withdrawPercentage) / 10000;
        uint256 withdrawalAmount = (lpTokensToWithdraw * poolValue) / liquidityPool.totalLPTokens();
        
        // Ensure withdrawal is within available liquidity
        vm.assume(withdrawalAmount <= availableLiquidity);
        
        // Withdrawal should succeed
        vm.prank(alice);
        uint256 withdrawn = liquidityPool.withdraw(lpTokensToWithdraw);
        
        assertEq(withdrawn, withdrawalAmount, "Withdrawal amount incorrect");
        assertEq(liquidityPool.lpTokenBalances(alice), aliceLPTokens - lpTokensToWithdraw, "LP balance not updated");
    }

    /**
     * Feature: weather-insurance-dapp, Property 10: Yield calculation accounts for premiums and payouts
     * Validates: Requirements 3.2, 3.5
     * 
     * For any liquidity provider's position, the accumulated yield should equal their proportional 
     * share of (total premiums collected - total payouts made) during their participation period, 
     * multiplied by the yield percentage.
     */
    function testFuzz_YieldCalculationAccuracy(uint96 deposit, uint96 premiums, uint96 payouts) public {
        // Bound inputs
        deposit = uint96(bound(deposit, 1 ether, 100 ether));
        premiums = uint96(bound(premiums, 0.1 ether, 50 ether));
        payouts = uint96(bound(payouts, 0, uint256(premiums) * 8 / 10)); // Payouts <= 80% of premiums
        
        // Alice deposits
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit}();
        
        // Simulate premiums collected (send ETH first, then call transferPremium)
        vm.deal(address(liquidityPool), address(liquidityPool).balance + premiums);
        vm.prank(policyManager);
        liquidityPool.transferPremium(premiums);
        
        // Simulate payouts made
        if (payouts > 0) {
            vm.prank(policyManager);
            liquidityPool.transferPayout(bob, payouts);
        }
        
        // Calculate expected yield
        uint256 netIncome = premiums - payouts;
        uint256 totalLPTokens = liquidityPool.totalLPTokens();
        uint256 providerShare = (netIncome * aliceLPTokens) / totalLPTokens;
        uint256 yieldPercentage = liquidityPool.yieldPercentage();
        uint256 expectedYield = (providerShare * yieldPercentage) / 10000;
        
        // Get actual yield
        uint256 actualYield = liquidityPool.calculateYield(alice);
        
        // Verify yield calculation
        assertEq(actualYield, expectedYield, "Yield calculation incorrect");
    }

    /**
     * Additional test: Yield calculation with multiple providers
     */
    function testFuzz_YieldCalculationMultipleProviders(uint96 deposit1, uint96 deposit2, uint96 premiums, uint96 payouts) public {
        // Bound inputs
        deposit1 = uint96(bound(deposit1, 1 ether, 50 ether));
        deposit2 = uint96(bound(deposit2, 1 ether, 50 ether));
        premiums = uint96(bound(premiums, 1 ether, 50 ether));
        payouts = uint96(bound(payouts, 0, uint256(premiums) * 8 / 10));
        
        // Alice and Bob deposit
        vm.prank(alice);
        uint256 aliceLPTokens = liquidityPool.deposit{value: deposit1}();
        
        vm.prank(bob);
        uint256 bobLPTokens = liquidityPool.deposit{value: deposit2}();
        
        // Simulate premiums and payouts (send ETH first, then call transferPremium)
        vm.deal(address(liquidityPool), address(liquidityPool).balance + premiums);
        vm.prank(policyManager);
        liquidityPool.transferPremium(premiums);
        
        if (payouts > 0) {
            vm.prank(policyManager);
            liquidityPool.transferPayout(charlie, payouts);
        }
        
        // Calculate expected yields
        uint256 netIncome = premiums - payouts;
        uint256 totalLPTokens = liquidityPool.totalLPTokens();
        uint256 yieldPercentage = liquidityPool.yieldPercentage();
        
        uint256 aliceShare = (netIncome * aliceLPTokens) / totalLPTokens;
        uint256 aliceExpectedYield = (aliceShare * yieldPercentage) / 10000;
        
        uint256 bobShare = (netIncome * bobLPTokens) / totalLPTokens;
        uint256 bobExpectedYield = (bobShare * yieldPercentage) / 10000;
        
        // Verify yields
        assertEq(liquidityPool.calculateYield(alice), aliceExpectedYield, "Alice yield incorrect");
        assertEq(liquidityPool.calculateYield(bob), bobExpectedYield, "Bob yield incorrect");
        
        // Verify total yields don't exceed net income * yield percentage
        uint256 totalYields = aliceExpectedYield + bobExpectedYield;
        uint256 maxYield = (netIncome * yieldPercentage) / 10000;
        assertLe(totalYields, maxYield + 2, "Total yields exceed maximum"); // +2 for rounding
    }

    /**
     * Additional test: Zero yield when no premiums collected
     */
    function test_ZeroYieldWhenNoPremiums() public {
        // Alice deposits
        vm.prank(alice);
        liquidityPool.deposit{value: 10 ether}();
        
        // No premiums collected, yield should be zero
        uint256 yield = liquidityPool.calculateYield(alice);
        assertEq(yield, 0, "Yield should be zero when no premiums collected");
    }

    /**
     * Feature: weather-insurance-dapp, Property 17: Pool utilization calculation is accurate
     * Validates: Requirements 7.3
     * 
     * For any pool state, the utilization rate should equal (sum of all active policy payout 
     * amounts) / (total pool value) × 100, representing the percentage of pool funds committed 
     * to potential payouts.
     */
    function testFuzz_PoolUtilizationCalculation(uint96 deposit, uint96 liability) public {
        // Bound inputs
        deposit = uint96(bound(deposit, 1 ether, 100 ether));
        liability = uint96(bound(liability, 0, 200 ether));
        
        // Alice deposits
        vm.prank(alice);
        liquidityPool.deposit{value: deposit}();
        
        // Set liability
        vm.prank(policyManager);
        liquidityPool.updateLiability(liability);
        
        // Get pool stats
        (uint256 totalValue, uint256 totalLiability, uint256 utilizationRate, , ) = liquidityPool.getPoolStats();
        
        // Verify values
        assertEq(totalValue, deposit, "Total value incorrect");
        assertEq(totalLiability, liability, "Total liability incorrect");
        
        // Calculate expected utilization rate (in basis points: liability / totalValue * 10000)
        uint256 expectedUtilization;
        if (totalValue > 0) {
            expectedUtilization = (liability * 10000) / totalValue;
        } else {
            expectedUtilization = 0;
        }
        
        // Verify utilization rate
        assertEq(utilizationRate, expectedUtilization, "Utilization rate calculation incorrect");
    }

    /**
     * Additional test: Utilization rate with multiple deposits and liabilities
     */
    function testFuzz_UtilizationWithMultipleDeposits(uint96 deposit1, uint96 deposit2, uint96 liability) public {
        // Bound inputs
        deposit1 = uint96(bound(deposit1, 1 ether, 50 ether));
        deposit2 = uint96(bound(deposit2, 1 ether, 50 ether));
        liability = uint96(bound(liability, 0, 150 ether));
        
        // Alice and Bob deposit
        vm.prank(alice);
        liquidityPool.deposit{value: deposit1}();
        
        vm.prank(bob);
        liquidityPool.deposit{value: deposit2}();
        
        // Set liability
        vm.prank(policyManager);
        liquidityPool.updateLiability(liability);
        
        // Get pool stats
        (uint256 totalValue, uint256 totalLiability, uint256 utilizationRate, , ) = liquidityPool.getPoolStats();
        
        // Verify total value
        uint256 expectedTotalValue = uint256(deposit1) + uint256(deposit2);
        assertEq(totalValue, expectedTotalValue, "Total value incorrect");
        
        // Calculate and verify utilization
        uint256 expectedUtilization = (liability * 10000) / expectedTotalValue;
        assertEq(utilizationRate, expectedUtilization, "Utilization rate incorrect");
    }

    /**
     * Additional test: Zero utilization when no liability
     */
    function test_ZeroUtilizationWhenNoLiability() public {
        // Alice deposits
        vm.prank(alice);
        liquidityPool.deposit{value: 10 ether}();
        
        // No liability set (defaults to 0)
        (, , uint256 utilizationRate, , ) = liquidityPool.getPoolStats();
        
        assertEq(utilizationRate, 0, "Utilization should be zero when no liability");
    }

    /**
     * Additional test: 100% utilization when liability equals pool value
     */
    function test_FullUtilizationWhenLiabilityEqualsPoolValue() public {
        uint256 depositAmount = 10 ether;
        
        // Alice deposits
        vm.prank(alice);
        liquidityPool.deposit{value: depositAmount}();
        
        // Set liability equal to pool value
        vm.prank(policyManager);
        liquidityPool.updateLiability(depositAmount);
        
        // Get utilization
        (, , uint256 utilizationRate, , ) = liquidityPool.getPoolStats();
        
        // Should be 10000 basis points (100%)
        assertEq(utilizationRate, 10000, "Utilization should be 100% when liability equals pool value");
    }
}
