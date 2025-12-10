// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LiquidityPool
 * @notice Manages liquidity provider deposits, withdrawals, and insurance fund backing
 * @dev Handles LP token minting/burning and yield distribution
 */
contract LiquidityPool is Ownable, ReentrancyGuard {
    // State variables for pool management
    uint256 public totalPoolValue;
    uint256 public totalLPTokens;
    uint256 public totalPremiumsCollected;
    uint256 public totalPayoutsMade;
    uint256 public yieldPercentage; // Percentage of premiums distributed to LPs (in basis points, e.g., 7000 = 70%)
    uint256 public totalLiability; // Total potential payouts from active policies
    
    mapping(address => uint256) public lpTokenBalances;
    mapping(address => uint256) public depositTimestamps;
    mapping(address => uint256) public premiumsAtDeposit;
    mapping(address => uint256) public payoutsAtDeposit;
    
    address public policyManager;
    
    // Events
    event LiquidityDeposited(address indexed provider, uint256 amount, uint256 lpTokens);
    event LiquidityWithdrawn(address indexed provider, uint256 lpTokens, uint256 amount);
    event PremiumTransferred(uint256 amount);
    event PayoutTransferred(address indexed recipient, uint256 amount);
    event YieldPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event PolicyManagerUpdated(address indexed oldManager, address indexed newManager);
    
    // Errors
    error ZeroDeposit();
    error InsufficientLPTokens();
    error InsufficientLiquidity();
    error OnlyPolicyManager();
    error InvalidYieldPercentage();
    error InvalidPolicyManager();
    
    constructor() Ownable(msg.sender) {
        yieldPercentage = 7000; // Default 70% of premiums go to LPs
    }
    
    /**
     * @notice Deposit funds into the liquidity pool
     * @return lpTokens The amount of LP tokens minted
     */
    function deposit() external payable nonReentrant returns (uint256 lpTokens) {
        if (msg.value == 0) revert ZeroDeposit();
        
        // Calculate LP tokens to mint
        if (totalLPTokens == 0 || totalPoolValue == 0) {
            // First deposit: 1:1 ratio
            lpTokens = msg.value;
        } else {
            // Subsequent deposits: proportional to pool share
            lpTokens = (msg.value * totalLPTokens) / totalPoolValue;
        }
        
        // Update state
        lpTokenBalances[msg.sender] += lpTokens;
        totalLPTokens += lpTokens;
        totalPoolValue += msg.value;
        depositTimestamps[msg.sender] = block.timestamp;
        
        // Record premiums and payouts at deposit time for yield calculation
        premiumsAtDeposit[msg.sender] = totalPremiumsCollected;
        payoutsAtDeposit[msg.sender] = totalPayoutsMade;
        
        emit LiquidityDeposited(msg.sender, msg.value, lpTokens);
        
        return lpTokens;
    }
    
    /**
     * @notice Withdraw funds from the liquidity pool
     * @param lpTokens The amount of LP tokens to burn
     * @return amount The amount of funds returned
     */
    function withdraw(uint256 lpTokens) external nonReentrant returns (uint256 amount) {
        if (lpTokenBalances[msg.sender] < lpTokens) revert InsufficientLPTokens();
        
        // Calculate proportional share
        amount = (lpTokens * totalPoolValue) / totalLPTokens;
        
        // Check if pool has sufficient available liquidity (after accounting for liabilities)
        uint256 availableLiquidity = totalPoolValue > totalLiability ? totalPoolValue - totalLiability : 0;
        if (amount > availableLiquidity) revert InsufficientLiquidity();
        
        // Update state
        lpTokenBalances[msg.sender] -= lpTokens;
        totalLPTokens -= lpTokens;
        totalPoolValue -= amount;
        
        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit LiquidityWithdrawn(msg.sender, lpTokens, amount);
        
        return amount;
    }
    
    /**
     * @notice Transfer premium from policy purchase to the pool
     * @param amount The premium amount
     */
    function transferPremium(uint256 amount) external onlyPolicyManager {
        totalPremiumsCollected += amount;
        totalPoolValue += amount;
        
        emit PremiumTransferred(amount);
    }
    
    /**
     * @notice Transfer payout from pool to policy holder
     * @param recipient The policy holder address
     * @param amount The payout amount
     */
    function transferPayout(address recipient, uint256 amount) external onlyPolicyManager {
        if (amount > totalPoolValue) revert InsufficientLiquidity();
        
        totalPayoutsMade += amount;
        totalPoolValue -= amount;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit PayoutTransferred(recipient, amount);
    }
    
    /**
     * @notice Calculate accumulated yield for a liquidity provider
     * @param provider The provider address
     * @return yield The accumulated yield amount
     */
    function calculateYield(address provider) external view returns (uint256) {
        if (lpTokenBalances[provider] == 0 || totalLPTokens == 0) {
            return 0;
        }
        
        // Calculate premiums and payouts since deposit
        uint256 premiumsSinceDeposit = totalPremiumsCollected - premiumsAtDeposit[provider];
        uint256 payoutsSinceDeposit = totalPayoutsMade - payoutsAtDeposit[provider];
        
        // Net income during participation period
        uint256 netIncome = premiumsSinceDeposit > payoutsSinceDeposit 
            ? premiumsSinceDeposit - payoutsSinceDeposit 
            : 0;
        
        // Provider's proportional share of net income
        uint256 providerShare = (netIncome * lpTokenBalances[provider]) / totalLPTokens;
        
        // Apply yield percentage
        uint256 yieldAmount = (providerShare * yieldPercentage) / 10000;
        
        return yieldAmount;
    }
    
    /**
     * @notice Get pool statistics
     * @return totalValue Total pool value
     * @return liability Total policy liability
     * @return utilizationRate Pool utilization rate (in basis points)
     * @return totalPremiums Total premiums collected
     * @return totalPayouts Total payouts made
     */
    function getPoolStats() external view returns (
        uint256 totalValue,
        uint256 liability,
        uint256 utilizationRate,
        uint256 totalPremiums,
        uint256 totalPayouts
    ) {
        totalValue = totalPoolValue;
        liability = totalLiability;
        
        // Calculate utilization rate (liability / totalValue * 10000 for basis points)
        if (totalPoolValue > 0) {
            utilizationRate = (totalLiability * 10000) / totalPoolValue;
        } else {
            utilizationRate = 0;
        }
        
        totalPremiums = totalPremiumsCollected;
        totalPayouts = totalPayoutsMade;
        
        return (totalValue, liability, utilizationRate, totalPremiums, totalPayouts);
    }
    
    /**
     * @notice Update the total liability from active policies
     * @param newLiability The new total liability amount
     */
    function updateLiability(uint256 newLiability) external onlyPolicyManager {
        totalLiability = newLiability;
    }
    
    /**
     * @notice Set the policy manager address
     * @param _policyManager The policy manager contract address
     */
    function setPolicyManager(address _policyManager) external onlyOwner {
        if (_policyManager == address(0)) revert InvalidPolicyManager();
        
        address oldManager = policyManager;
        policyManager = _policyManager;
        
        emit PolicyManagerUpdated(oldManager, _policyManager);
    }
    
    /**
     * @notice Update the yield percentage for liquidity providers
     * @param _yieldPercentage The new yield percentage (in basis points)
     */
    function setYieldPercentage(uint256 _yieldPercentage) external onlyOwner {
        if (_yieldPercentage > 10000) revert InvalidYieldPercentage();
        
        uint256 oldPercentage = yieldPercentage;
        yieldPercentage = _yieldPercentage;
        
        emit YieldPercentageUpdated(oldPercentage, _yieldPercentage);
    }
    
    /**
     * @notice Modifier to restrict access to policy manager
     */
    modifier onlyPolicyManager() {
        if (msg.sender != policyManager) revert OnlyPolicyManager();
        _;
    }
    
    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {
        totalPoolValue += msg.value;
    }
}
