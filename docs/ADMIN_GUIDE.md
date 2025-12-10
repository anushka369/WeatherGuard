# Administrator Guide

Complete guide for system administrators of the Weather Insurance dApp.

## Table of Contents

- [Overview](#overview)
- [Admin Responsibilities](#admin-responsibilities)
- [Access Control](#access-control)
- [Configuration Management](#configuration-management)
- [System Monitoring](#system-monitoring)
- [Emergency Procedures](#emergency-procedures)
- [Best Practices](#best-practices)
- [Security](#security)

---

## Overview

### Admin Role

As a system administrator, you are responsible for:
- Configuring system parameters
- Managing oracle integration
- Monitoring system health
- Responding to emergencies
- Ensuring system security

### Admin Powers

Admins can:
- Update oracle address
- Set policy parameter limits
- Adjust yield percentages
- Modify premium rates
- Pause/unpause the system
- Configure liquidity pool settings

### Admin Limitations

Admins cannot:
- Access user funds directly
- Cancel or modify existing policies
- Override claim decisions
- Change smart contract code
- Reverse transactions

---

## Admin Responsibilities

### Daily Tasks

**System Monitoring:**
- Check system health metrics
- Review recent transactions
- Monitor pool utilization
- Track policy creation rate
- Verify oracle data submissions

**Event Review:**
- Review PolicyCreated events
- Check ClaimProcessed events
- Monitor configuration changes
- Track liquidity movements

### Weekly Tasks

**Performance Analysis:**
- Analyze premium/payout ratios
- Review pool performance
- Assess policy distribution
- Evaluate oracle reliability

**Risk Assessment:**
- Check policy concentrations
- Review trigger distributions
- Assess weather forecasts
- Evaluate utilization trends

### Monthly Tasks

**Configuration Review:**
- Assess parameter limits
- Review premium rates
- Evaluate yield percentages
- Consider adjustments

**Reporting:**
- Generate system statistics
- Document incidents
- Report to stakeholders
- Plan improvements

---

## Access Control

### Owner Address

**Setup:**
- Contract owner set at deployment
- Typically a multi-sig wallet
- Should be highly secure

**Best Practices:**
- Use hardware wallet
- Enable multi-signature
- Implement timelock for critical changes
- Keep backup access methods
- Document recovery procedures

### Transferring Ownership

**When Needed:**
- Upgrading security
- Changing governance
- Emergency situations

**Process:**
```solidity
// In PolicyManager, LiquidityPool, OracleConsumer
function transferOwnership(address newOwner) external onlyOwner
```

**Steps:**
1. Verify new owner address
2. Test with small transaction first
3. Call transferOwnership
4. Verify new owner can execute admin functions
5. Document change

**⚠️ Warning:** Transferring to wrong address means permanent loss of admin access!

---

## Configuration Management

### Oracle Configuration

#### Setting Oracle Address

**Purpose:** Define authorized weather data provider

**Function:**
```solidity
// In OracleConsumer
function setOracleAddress(address newOracle) external onlyOwner
```

**When to Update:**
- Switching oracle providers
- Oracle compromise suspected
- Improving data quality
- Adding redundancy

**Process:**
1. Verify new oracle address
2. Test oracle signature verification
3. Coordinate with oracle provider
4. Call setOracleAddress
5. Monitor first data submissions
6. Verify policy evaluations work

**Considerations:**
- Existing pending requests may fail
- Coordinate timing with oracle
- Announce to users
- Have rollback plan

#### Connecting to PolicyManager

**Function:**
```solidity
// In OracleConsumer
function setPolicyManager(address _policyManager) external onlyOwner
```

**When Needed:**
- Initial deployment
- Contract upgrades
- System reorganization

### Policy Parameter Limits

#### Setting Limits

**Purpose:** Control policy parameters to manage risk

**Function:**
```solidity
// In PolicyManager
function setParameterLimits(
    uint256 _minCoveragePeriod,
    uint256 _maxCoveragePeriod,
    uint256 _minPayoutAmount,
    uint256 _maxPayoutAmount
) external onlyOwner
```

**Default Values:**
- Min Coverage: 1 day
- Max Coverage: 365 days
- Min Payout: 0.01 ETH
- Max Payout: 100 ETH

**When to Adjust:**

**Increase Limits:**
- Pool has grown significantly
- Demand for larger policies
- Risk tolerance increased
- Market conditions favorable

**Decrease Limits:**
- Pool utilization too high
- Recent large losses
- Risk reduction needed
- Market conditions unfavorable

**Considerations:**
- Affects new policies only
- Existing policies unchanged
- Announce changes to users
- Monitor impact on policy creation

**Example Scenarios:**

**Conservative (High Risk Period):**
```
Min Coverage: 7 days
Max Coverage: 90 days
Min Payout: 0.1 ETH
Max Payout: 10 ETH
```

**Moderate (Normal Conditions):**
```
Min Coverage: 1 day
Max Coverage: 180 days
Min Payout: 0.01 ETH
Max Payout: 50 ETH
```

**Aggressive (Low Risk Period):**
```
Min Coverage: 1 day
Max Coverage: 365 days
Min Payout: 0.01 ETH
Max Payout: 100 ETH
```

### Premium Rate Configuration

#### Setting Base Premium Rate

**Purpose:** Control policy pricing

**Function:**
```solidity
// In PolicyManager
function setBasePremiumRate(uint256 _basePremiumRate) external onlyOwner
```

**Format:** Basis points (e.g., 500 = 5%)

**Default:** 500 (5% of payout amount)

**When to Adjust:**

**Increase Rate (Make Policies More Expensive):**
- Pool utilization too high
- Recent losses
- Increase LP returns
- Reduce policy demand

**Decrease Rate (Make Policies Cheaper):**
- Pool utilization too low
- Attract more policies
- Competitive pressure
- Increase market share

**Impact Analysis:**
```
Current Rate: 5%
Policy: 10 ETH payout, 30 days
Current Premium: ~0.5 ETH

New Rate: 7%
New Premium: ~0.7 ETH
Impact: 40% increase, may reduce demand

New Rate: 3%
New Premium: ~0.3 ETH
Impact: 40% decrease, may increase demand
```

**Best Practices:**
- Make small adjustments (0.5-1%)
- Monitor impact for 1-2 weeks
- Adjust gradually
- Communicate changes

### Liquidity Pool Configuration

#### Setting Yield Percentage

**Purpose:** Control LP returns

**Function:**
```solidity
// In LiquidityPool
function setYieldPercentage(uint256 _yieldPercentage) external onlyOwner
```

**Format:** Basis points (e.g., 7000 = 70%)

**Default:** 7000 (70% of premiums to LPs)

**When to Adjust:**

**Increase Percentage (Favor LPs):**
- Need to attract more liquidity
- Pool utilization low
- Competitive pressure
- Reward loyal LPs

**Decrease Percentage (Build Reserves):**
- Pool needs more buffer
- Recent large payouts
- Increase pool stability
- Prepare for growth

**Impact:**
```
Premiums: 10 ETH
Payouts: 5 ETH
Net: 5 ETH

Current (70%): LPs get 3.5 ETH, Pool keeps 1.5 ETH
New (80%): LPs get 4 ETH, Pool keeps 1 ETH
New (60%): LPs get 3 ETH, Pool keeps 2 ETH
```

**Considerations:**
- Affects future premiums only
- Existing yields unchanged
- Announce to LPs
- Monitor LP behavior

#### Connecting PolicyManager

**Function:**
```solidity
// In LiquidityPool
function setPolicyManager(address _policyManager) external onlyOwner
```

**When Needed:**
- Initial deployment
- Contract upgrades
- System reorganization

**Critical:** Only PolicyManager can transfer premiums and payouts

---

## System Monitoring

### Key Metrics

#### Policy Metrics

**Monitor:**
- Total policies created
- Active policies count
- Policies by status
- Average policy size
- Policy creation rate

**Access:**
```solidity
uint256 totalPolicies = policyManager.policyCounter();
uint256[] memory activePolicies = policyManager.getUserActivePolicies(address);
```

**Red Flags:**
- Sudden spike in policy creation
- Many large policies
- Concentrated triggers
- Unusual patterns

#### Pool Metrics

**Monitor:**
- Total pool value
- Total liability
- Utilization rate
- Premium/payout ratio
- LP count and distribution

**Access:**
```solidity
(
    uint256 value,
    uint256 liability,
    uint256 utilization,
    uint256 premiums,
    uint256 payouts
) = liquidityPool.getPoolStats();
```

**Thresholds:**
- Utilization >70%: High risk
- Utilization >80%: Critical
- Ratio <1.0: Losing money
- Value dropping >20%: Major concern

#### Oracle Metrics

**Monitor:**
- Data submission frequency
- Request fulfillment rate
- Data quality
- Signature verification success

**Red Flags:**
- Missed data submissions
- Signature failures
- Unusual data values
- Delayed fulfillments

### Event Monitoring

#### Critical Events

**PolicyCreated:**
```solidity
event PolicyCreated(
    uint256 indexed policyId,
    address indexed holder,
    uint256 premium,
    uint256 payoutAmount,
    uint256 coveragePeriodStart,
    uint256 coveragePeriodEnd
)
```

**Monitor For:**
- Large policies (>10 ETH payout)
- Unusual parameters
- Concentrated locations
- Suspicious patterns

**ClaimProcessed:**
```solidity
event ClaimProcessed(
    uint256 indexed policyId,
    address indexed holder,
    uint256 payoutAmount,
    uint256 timestamp
)
```

**Monitor For:**
- Multiple simultaneous claims
- Large payouts
- Unexpected triggers
- Pattern of claims

**Configuration Changes:**
```solidity
event ParameterLimitsUpdated(...)
event PremiumRateUpdated(...)
event YieldPercentageUpdated(...)
event OracleAddressUpdated(...)
```

**Monitor For:**
- Unauthorized changes (shouldn't happen)
- Frequency of changes
- Impact of changes

### Alerting

**Set Up Alerts For:**
- Utilization >70%
- Large policy created (>10 ETH)
- Multiple claims in short period
- Pool value drop >10%
- Oracle data missing
- Unusual activity patterns

**Alert Channels:**
- Email notifications
- SMS for critical alerts
- Dashboard warnings
- Automated monitoring tools

---

## Emergency Procedures

### System Pause

#### When to Pause

**Critical Situations:**
- Smart contract vulnerability discovered
- Oracle compromise suspected
- Unusual activity detected
- Security incident
- Major bug found

**Process:**
```solidity
// In PolicyManager
function pause() external onlyOwner
```

**Effects:**
- New policy creation blocked
- Existing policies continue
- Claims still processed
- Liquidity operations continue

**Communication:**
1. Announce pause immediately
2. Explain reason
3. Provide timeline
4. Update regularly

#### When to Unpause

**Requirements:**
- Issue resolved
- Security verified
- Testing completed
- Communication prepared

**Process:**
```solidity
// In PolicyManager
function unpause() external onlyOwner
```

**Post-Unpause:**
- Monitor closely
- Watch for issues
- Communicate resolution
- Document incident

### Oracle Issues

#### Oracle Compromise

**Signs:**
- Unusual data values
- Signature verification failures
- Unexpected claim triggers
- Suspicious patterns

**Response:**
1. Pause system immediately
2. Investigate data submissions
3. Contact oracle provider
4. Verify data integrity
5. Update oracle address if needed
6. Resume with monitoring

#### Oracle Downtime

**Signs:**
- No data submissions
- Pending requests not fulfilled
- Policies not evaluated

**Response:**
1. Contact oracle provider
2. Check oracle status
3. Communicate to users
4. Consider backup oracle
5. Resume when restored

### Large Loss Events

#### Multiple Claims

**Scenario:** Weather event triggers many policies

**Response:**
1. Verify oracle data
2. Confirm triggers legitimate
3. Check pool liquidity
4. Process claims normally
5. Communicate to LPs
6. Assess impact
7. Consider parameter adjustments

#### Pool Depletion Risk

**Scenario:** Utilization >90%, many policies near trigger

**Response:**
1. Assess risk level
2. Consider pausing new policies
3. Communicate to LPs
4. Monitor weather forecasts
5. Prepare for potential claims
6. Have recovery plan

### Security Incidents

#### Suspected Attack

**Response:**
1. Pause system immediately
2. Assess situation
3. Contact security experts
4. Investigate transactions
5. Determine impact
6. Implement fixes
7. Resume with enhanced monitoring

#### Unauthorized Access

**Response:**
1. Revoke compromised access
2. Transfer ownership if needed
3. Audit all recent transactions
4. Assess damage
5. Implement additional security
6. Document incident

---

## Best Practices

### Configuration Changes

**Before Making Changes:**
1. Analyze current metrics
2. Model impact
3. Prepare communication
4. Have rollback plan
5. Choose low-activity time

**After Making Changes:**
1. Monitor impact
2. Watch for issues
3. Communicate to users
4. Document change
5. Assess effectiveness

### Communication

**Transparency:**
- Announce changes in advance
- Explain reasoning
- Provide details
- Answer questions

**Channels:**
- Dashboard announcements
- Social media
- Email notifications
- Community forums

**Timing:**
- Advance notice for planned changes
- Immediate notice for emergencies
- Regular updates during incidents

### Documentation

**Maintain Records:**
- Configuration changes
- Incidents and responses
- Performance metrics
- Decision rationale

**Documentation Should Include:**
- Date and time
- What changed
- Why it changed
- Who made change
- Impact observed

### Regular Reviews

**Monthly:**
- Review all configurations
- Assess system performance
- Analyze trends
- Plan adjustments

**Quarterly:**
- Comprehensive system audit
- Security review
- Performance analysis
- Strategic planning

**Annually:**
- Full system evaluation
- Long-term trend analysis
- Major improvements
- Governance review

---

## Security

### Access Security

**Protect Admin Keys:**
- Use hardware wallet
- Enable multi-signature
- Implement timelock
- Keep offline backups
- Document recovery

**Operational Security:**
- Verify all addresses before transactions
- Use test transactions for critical changes
- Maintain secure communication
- Follow incident response procedures

### Smart Contract Security

**Monitoring:**
- Watch for unusual patterns
- Monitor all admin functions
- Track configuration changes
- Review event logs

**Updates:**
- Stay informed on vulnerabilities
- Monitor security advisories
- Have upgrade plan
- Test thoroughly

### Oracle Security

**Verification:**
- Verify oracle signatures
- Monitor data quality
- Check submission frequency
- Validate data ranges

**Redundancy:**
- Consider multiple oracles
- Have backup providers
- Implement consensus mechanisms
- Plan for oracle failure

### Incident Response

**Preparation:**
- Document procedures
- Assign responsibilities
- Maintain contact list
- Practice scenarios

**Response:**
- Assess quickly
- Act decisively
- Communicate clearly
- Document thoroughly

**Recovery:**
- Implement fixes
- Verify security
- Resume operations
- Learn from incident

---

## Admin Function Reference

### PolicyManager Admin Functions

```solidity
// Set oracle consumer address
function setOracleConsumer(address _oracleConsumer) external onlyOwner

// Set policy parameter limits
function setParameterLimits(
    uint256 _minCoveragePeriod,
    uint256 _maxCoveragePeriod,
    uint256 _minPayoutAmount,
    uint256 _maxPayoutAmount
) external onlyOwner

// Set base premium rate
function setBasePremiumRate(uint256 _basePremiumRate) external onlyOwner

// Pause new policy creation
function pause() external onlyOwner

// Unpause policy creation
function unpause() external onlyOwner

// Transfer ownership
function transferOwnership(address newOwner) external onlyOwner
```

### LiquidityPool Admin Functions

```solidity
// Set policy manager address
function setPolicyManager(address _policyManager) external onlyOwner

// Set yield percentage for LPs
function setYieldPercentage(uint256 _yieldPercentage) external onlyOwner

// Transfer ownership
function transferOwnership(address newOwner) external onlyOwner
```

### OracleConsumer Admin Functions

```solidity
// Set oracle address
function setOracleAddress(address newOracle) external onlyOwner

// Set policy manager address
function setPolicyManager(address _policyManager) external onlyOwner

// Transfer ownership
function transferOwnership(address newOwner) external onlyOwner
```

---

## Troubleshooting

### Common Issues

**Issue: Policies not being evaluated**
- Check oracle is submitting data
- Verify oracle address is correct
- Confirm PolicyManager address in OracleConsumer
- Check for paused state

**Issue: High utilization**
- Consider increasing parameter limits
- Adjust premium rates upward
- Communicate to LPs
- Monitor for claims

**Issue: Low policy creation**
- Consider decreasing premium rates
- Review parameter limits
- Check market conditions
- Improve marketing

**Issue: LP withdrawals failing**
- Check pool utilization
- Verify available liquidity
- Communicate to LPs
- Wait for policies to expire

---

## Conclusion

Effective administration requires:
1. **Vigilance**: Monitor system constantly
2. **Prudence**: Make careful, considered changes
3. **Communication**: Keep users informed
4. **Preparation**: Have plans for emergencies
5. **Security**: Protect admin access rigorously

The system is designed to be largely autonomous, but admin oversight ensures smooth operation and rapid response to issues.

---

For more information:
- [Smart Contract Reference](SMART_CONTRACT_REFERENCE.md)
- [User Guide](USER_GUIDE.md)
- [Main README](../README.md)
