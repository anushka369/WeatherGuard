# Weather Insurance dApp User Guide

Complete guide for using the Weather Insurance dApp.

## Table of Contents

- [Getting Started](#getting-started)
- [For Policy Holders](#for-policy-holders)
- [For Liquidity Providers](#for-liquidity-providers)
- [Understanding Weather Parameters](#understanding-weather-parameters)
- [FAQ](#faq)

---

## Getting Started

### What You Need

1. **Web3 Wallet**: MetaMask or compatible wallet
2. **QIE Tokens**: Native currency for premiums and transactions
3. **Web Browser**: Chrome, Firefox, or Brave recommended

### Setting Up Your Wallet

#### Installing MetaMask

1. Visit [metamask.io](https://metamask.io)
2. Click "Download" and install browser extension
3. Create new wallet or import existing
4. **IMPORTANT**: Securely store your seed phrase

#### Adding QIE Network

1. Open MetaMask
2. Click network dropdown (top center)
3. Click "Add Network" → "Add a network manually"
4. Enter QIE network details:
   - **Network Name**: QIE Mainnet
   - **RPC URL**: [Get from project .env or docs]
   - **Chain ID**: [Get from project .env or docs]
   - **Currency Symbol**: QIE
   - **Block Explorer**: [Get from project .env or docs]
5. Click "Save"

#### Getting QIE Tokens

**Testnet:**
- Use QIE testnet faucet
- Visit faucet website and enter your address
- Receive test tokens instantly

**Mainnet:**
- Purchase from supported exchanges
- Bridge from other networks
- Receive from another wallet

### Connecting to the dApp

1. Visit the dApp URL
2. Click "Connect Wallet" button (top right)
3. Select MetaMask from wallet options
4. Approve connection in MetaMask popup
5. Ensure you're on QIE network
6. Your address and balance will display

---

## For Policy Holders

### Understanding Parametric Insurance

**Traditional Insurance:**
- File claim after loss
- Wait for adjuster assessment
- Lengthy approval process
- Subjective evaluation

**Parametric Insurance:**
- Automatic trigger based on data
- Instant payout when conditions met
- No claim filing needed
- Objective, verifiable conditions

### Choosing the Right Policy

#### Policy Templates

**Crop Insurance**
- **Best For**: Farmers, agricultural businesses
- **Protects Against**: Drought, insufficient rainfall
- **Default Trigger**: Rainfall < 50mm
- **Typical Duration**: 90 days (growing season)
- **Use Case**: Protect crop yield against dry conditions

**Event Insurance**
- **Best For**: Event organizers, outdoor venues
- **Protects Against**: Rain, storms
- **Default Trigger**: Rainfall > 10mm
- **Typical Duration**: 7 days (event period)
- **Use Case**: Protect event revenue against weather cancellation

**Travel Insurance**
- **Best For**: Travelers, tourists
- **Protects Against**: Extreme cold, freezing conditions
- **Default Trigger**: Temperature < 0°C
- **Typical Duration**: 14 days (trip length)
- **Use Case**: Protect travel plans against extreme weather

### Step-by-Step: Purchasing a Policy

#### Step 1: Navigate to Purchase Page

1. Click "Purchase Policy" in navigation menu
2. Review available templates or choose "Custom"

#### Step 2: Select Template or Custom

**Using a Template:**
1. Click on template card (Crop, Event, or Travel)
2. Default parameters will populate
3. Modify if needed

**Creating Custom Policy:**
1. Click "Custom Policy"
2. Configure all parameters manually

#### Step 3: Configure Parameters

**Location**
- Enter specific location (e.g., "Des Moines, Iowa")
- Be as specific as possible
- Use format: "City, State/Country"
- Location must match oracle data format

**Weather Parameter**
- **Temperature**: Measured in Celsius
  - Use for: Cold snaps, heat waves
  - Example: < 0°C for freezing
- **Rainfall**: Measured in millimeters
  - Use for: Drought, flooding
  - Example: < 50mm for drought
- **Wind Speed**: Measured in km/h
  - Use for: Storms, hurricanes
  - Example: > 100 km/h for severe wind
- **Humidity**: Measured in percentage
  - Use for: Dry conditions, moisture
  - Example: < 30% for very dry

**Trigger Value**
- Set threshold that triggers payout
- Consider historical weather data
- Balance between likelihood and protection

**Comparison Operator**
- **Greater Than**: Triggers if actual > threshold
  - Use for: Excessive rain, high wind, heat
- **Less Than**: Triggers if actual < threshold
  - Use for: Drought, cold, low humidity
- **Equal To**: Triggers if actual == threshold
  - Rarely used (exact match unlikely)

**Coverage Period**
- **Start Date**: When coverage begins
  - Must be in future
  - Minimum: 1 day from now
  - Consider weather forecast
- **End Date**: When coverage ends
  - Maximum: 365 days from start
  - Align with risk period

**Payout Amount**
- Amount you'll receive if triggered
- Minimum: 0.01 ETH
- Maximum: 100 ETH
- Should cover your potential loss

#### Step 4: Review Premium

- Premium calculated automatically
- Based on:
  - Payout amount (higher = more premium)
  - Coverage duration (longer = more premium)
  - Risk factors
- Displayed in real-time as you adjust parameters

**Premium Calculation:**
```
Base Premium = Payout × 5%
Duration Adjustment = Base × (Duration / 30 days)
Final Premium = Max(Adjusted Premium, 0.001 ETH)
```

#### Step 5: Purchase

1. Review all parameters carefully
2. Ensure you have sufficient balance (premium + gas)
3. Click "Purchase Policy"
4. Review transaction in MetaMask
5. Confirm transaction
6. Wait for confirmation (~3 seconds on QIE)
7. Policy appears in your dashboard

### Managing Your Policies

#### Viewing Active Policies

1. Navigate to "Dashboard"
2. See all your active policies
3. Each card shows:
   - Policy ID
   - Location
   - Weather parameter and trigger
   - Coverage period
   - Payout amount
   - Current status

#### Policy Status Indicators

- **🟢 Active**: Policy is monitoring weather
- **💰 Claimed**: Payout has been made
- **⏰ Expired**: Coverage ended without trigger
- **❌ Cancelled**: Policy was cancelled (rare)

#### Monitoring Weather Conditions

**Dashboard Features:**
- Real-time policy status
- Days remaining in coverage
- Current weather data (if available)
- Proximity to trigger conditions

**External Monitoring:**
- Check local weather forecasts
- Monitor weather services
- Track conditions approaching trigger

### Understanding Claims

#### Automatic Claim Process

Claims are **fully automatic**:

1. **Oracle Submits Data**
   - Weather oracle monitors conditions
   - Submits verified data to blockchain
   - Typically hourly or daily updates

2. **Smart Contract Evaluates**
   - Contract checks all active policies
   - Matches location and parameter
   - Evaluates trigger condition

3. **Payout Executed**
   - If triggered, payout sent immediately
   - Funds transferred to your wallet
   - Policy marked as claimed

4. **Notification Sent**
   - Dashboard updates in real-time
   - Notification appears
   - Claim appears in history

#### No Action Required

- You don't file a claim
- You don't submit proof
- You don't wait for approval
- Everything is automatic!

#### Claim History

View your claim history:
1. Navigate to "Dashboard"
2. Scroll to "Claim History" section
3. See all processed claims:
   - Policy details
   - Trigger weather value
   - Payout amount
   - Timestamp

### Tips for Policy Holders

#### Choosing Parameters

**Be Realistic:**
- Don't set triggers that are too unlikely
- Balance protection with cost
- Consider historical weather patterns

**Research Weather:**
- Check historical data for location
- Understand seasonal patterns
- Consider climate trends

**Start Small:**
- Test with smaller payout amounts
- Learn how system works
- Scale up as comfortable

#### Timing Your Coverage

**Consider:**
- Weather forecast (don't buy if trigger imminent)
- Seasonal patterns
- Your risk period
- Lead time before event

**Best Practices:**
- Buy coverage before risk period
- Allow buffer time
- Don't wait until last minute

#### Managing Risk

**Diversification:**
- Multiple policies for different risks
- Different locations
- Different time periods

**Coverage Amount:**
- Match payout to potential loss
- Don't over-insure
- Consider deductibles in your planning

---

## For Liquidity Providers

### Understanding Liquidity Provision

#### How It Works

1. **Deposit Funds**: You deposit QIE tokens into pool
2. **Receive LP Tokens**: Get LP tokens representing your share
3. **Earn Yields**: Receive portion of premiums collected
4. **Bear Risk**: Payouts reduce pool value
5. **Withdraw**: Burn LP tokens to withdraw your share

#### Risk and Reward

**Potential Returns:**
- Earn 70% of premiums collected (default)
- Proportional to your pool share
- Passive income from insurance premiums

**Risks:**
- Payouts reduce pool value
- Your share value can decrease
- High utilization = higher risk
- Weather events can trigger multiple claims

### Step-by-Step: Providing Liquidity

#### Step 1: Navigate to Liquidity Provider Page

1. Click "Liquidity Provider" in navigation
2. Review pool statistics
3. Understand current utilization

#### Step 2: Review Pool Statistics

**Key Metrics:**
- **Total Pool Value**: Total funds in pool
- **Utilization Rate**: Percentage committed to policies
- **Active Policies**: Number of policies backed
- **Premium/Payout Ratio**: Historical performance

**Utilization Levels:**
- **0-30%**: Low risk, conservative
- **30-60%**: Medium risk, balanced
- **60%+**: High risk, aggressive

#### Step 3: Deposit Funds

1. Enter deposit amount
2. Review LP tokens you'll receive
3. Calculate your pool share percentage
4. Click "Deposit"
5. Approve transaction in MetaMask
6. Wait for confirmation

**LP Token Calculation:**
```
First Deposit: LP Tokens = Deposit Amount (1:1)
Subsequent: LP Tokens = (Deposit × Total LP Tokens) / Pool Value
```

#### Step 4: Monitor Your Position

**Dashboard Shows:**
- Your LP token balance
- Your pool share percentage
- Deposited amount
- Current value
- Accumulated yield
- Projected earnings

### Managing Your Liquidity

#### Monitoring Performance

**Track These Metrics:**
- Pool utilization (risk level)
- Premium collection rate
- Payout frequency
- Your yield accumulation
- Pool value changes

**Red Flags:**
- Utilization > 80%
- Frequent large payouts
- Declining pool value
- Many policies near trigger

#### Withdrawing Liquidity

**When to Withdraw:**
- Utilization too high
- Need funds elsewhere
- Risk tolerance changed
- Taking profits

**Withdrawal Process:**
1. Navigate to Liquidity Provider page
2. Click "Withdraw" tab
3. Enter LP tokens to burn
4. Review withdrawal amount
5. Click "Withdraw"
6. Approve transaction
7. Receive funds in wallet

**Withdrawal Calculation:**
```
Withdrawal Amount = (LP Tokens × Pool Value) / Total LP Tokens
```

**Limitations:**
- Must have available liquidity
- Cannot withdraw if utilization too high
- May need to wait for policies to expire

### Understanding Yields

#### Yield Sources

**Premiums:**
- 70% of premiums go to LPs (default)
- Distributed proportionally
- Accumulates over time

**Calculation:**
```
Your Yield = (Net Premiums × Your Pool Share × 70%) / 100
Net Premiums = Total Premiums - Total Payouts
```

#### Yield Scenarios

**Scenario 1: No Claims**
- Pool collects premiums
- No payouts made
- Maximum yield for LPs
- Pool value increases

**Scenario 2: Some Claims**
- Pool collects premiums
- Some payouts made
- Moderate yield for LPs
- Pool value stable or slight increase

**Scenario 3: Many Claims**
- Pool collects premiums
- Many payouts made
- Low or negative yield
- Pool value decreases

### Risk Management for LPs

#### Assessing Risk

**Before Depositing:**
- Review active policies
- Check utilization rate
- Analyze historical payouts
- Understand weather patterns

**Ongoing Monitoring:**
- Check dashboard daily
- Watch utilization changes
- Monitor weather forecasts
- Track policy expirations

#### Diversification Strategies

**If Multiple Pools Available:**
- Spread across different pools
- Different geographic regions
- Different weather parameters
- Different risk levels

**Position Sizing:**
- Don't invest more than you can afford to lose
- Start with smaller amounts
- Scale up as comfortable
- Keep emergency reserves

#### When to Exit

**Exit Signals:**
- Utilization consistently > 70%
- Frequent large payouts
- Declining pool value
- Extreme weather events forecasted
- Personal risk tolerance exceeded

---

## Understanding Weather Parameters

### Temperature

**Measurement**: Degrees Celsius (°C)

**Common Use Cases:**
- **Cold Protection**: Trigger < 0°C for freezing
- **Heat Protection**: Trigger > 35°C for extreme heat
- **Frost Protection**: Trigger < -5°C for hard frost

**Considerations:**
- Daily average vs. min/max
- Time of day matters
- Seasonal variations
- Microclimate effects

**Example Policies:**
- Crop frost protection: < 0°C
- Heat wave protection: > 38°C
- Winter travel: < -10°C

### Rainfall

**Measurement**: Millimeters (mm)

**Common Use Cases:**
- **Drought Protection**: Trigger < 50mm for dry conditions
- **Flood Protection**: Trigger > 200mm for heavy rain
- **Event Protection**: Trigger > 10mm for rain

**Considerations:**
- Cumulative vs. single day
- Time period matters
- Seasonal norms
- Local drainage

**Example Policies:**
- Crop drought: < 30mm over 30 days
- Outdoor event: > 5mm on event day
- Flood risk: > 150mm over 7 days

### Wind Speed

**Measurement**: Kilometers per hour (km/h)

**Common Use Cases:**
- **Storm Protection**: Trigger > 100 km/h for severe wind
- **Hurricane Protection**: Trigger > 150 km/h for extreme wind
- **Sailing Protection**: Trigger < 10 km/h for calm

**Considerations:**
- Sustained vs. gust speed
- Direction matters
- Coastal vs. inland
- Elevation effects

**Example Policies:**
- Storm damage: > 90 km/h
- Hurricane: > 120 km/h
- Sailing event: < 15 km/h

### Humidity

**Measurement**: Percentage (%)

**Common Use Cases:**
- **Dry Protection**: Trigger < 30% for very dry
- **Moisture Protection**: Trigger > 90% for very humid
- **Comfort Protection**: Trigger outside 40-60% range

**Considerations:**
- Relative vs. absolute humidity
- Temperature interaction
- Time of day
- Indoor vs. outdoor

**Example Policies:**
- Dry conditions: < 25%
- High humidity: > 85%
- Comfort range: < 35% or > 70%

---

## FAQ

### General Questions

**Q: What is parametric insurance?**
A: Insurance that pays out automatically based on predefined parameters (like weather data) rather than assessed losses.

**Q: How is this different from traditional insurance?**
A: No claim filing, no adjusters, instant payouts, objective triggers, lower costs.

**Q: Is this real insurance?**
A: It's a decentralized insurance protocol. It provides financial protection but operates differently than traditional insurance companies.

**Q: What blockchain is this on?**
A: QIE blockchain, which offers high throughput (25,000+ TPS), near-zero fees, and 3-second finality.

### Policy Questions

**Q: How much does a policy cost?**
A: Premium is calculated based on payout amount, coverage duration, and risk factors. Typically 5-15% of payout amount.

**Q: Can I cancel a policy?**
A: No, policies cannot be cancelled once purchased. Choose parameters carefully.

**Q: What if weather data is wrong?**
A: Oracle data is verified and signed. If you believe data is incorrect, contact support with evidence.

**Q: Can I have multiple policies?**
A: Yes, you can purchase as many policies as you want for different locations, times, or parameters.

**Q: What happens if I don't get paid out?**
A: If trigger conditions aren't met during coverage period, no payout occurs. This is expected behavior.

**Q: How quickly do I get paid?**
A: Payouts are instant once oracle submits data and trigger is confirmed. Typically within minutes to hours of weather event.

### Liquidity Provider Questions

**Q: How much can I earn?**
A: Returns vary based on premiums collected and payouts made. Historical returns visible in dashboard.

**Q: Can I lose money?**
A: Yes, if payouts exceed premiums, pool value decreases and your share is worth less.

**Q: When can I withdraw?**
A: Anytime, subject to available liquidity. If utilization is very high, you may need to wait.

**Q: What's a good utilization rate?**
A: Generally, <50% is conservative, 50-70% is moderate, >70% is aggressive.

**Q: How is yield calculated?**
A: You receive 70% of net premiums (premiums - payouts) proportional to your pool share.

### Technical Questions

**Q: Do I need technical knowledge?**
A: No, the web interface is user-friendly. Just need a Web3 wallet.

**Q: What wallet do I need?**
A: MetaMask is recommended, but any Web3-compatible wallet works.

**Q: What are gas fees?**
A: Transaction fees on QIE blockchain. They're near-zero (fractions of a cent).

**Q: Is my money safe?**
A: Smart contracts are tested but not formally audited. Use at your own risk. Start with small amounts.

**Q: Can contracts be upgraded?**
A: No, contracts are immutable once deployed. This ensures no one can change the rules.

**Q: Where is weather data from?**
A: Verified weather oracles that aggregate data from multiple sources.

### Troubleshooting Questions

**Q: Transaction failed, what do I do?**
A: Check error message, ensure sufficient balance, verify parameters are valid, try again.

**Q: Policy not showing in dashboard?**
A: Refresh page, check you're connected with correct wallet, verify transaction confirmed.

**Q: Can't withdraw liquidity?**
A: Check utilization rate, ensure you have LP tokens, verify available liquidity.

**Q: Wallet won't connect?**
A: Ensure MetaMask is unlocked, you're on QIE network, browser is supported.

### Support

**Q: Where can I get help?**
A: Check documentation, GitHub issues, community channels, or contact support.

**Q: How do I report a bug?**
A: Create GitHub issue with details, screenshots, and transaction hashes.

**Q: Can I suggest features?**
A: Yes! Create GitHub issue with feature request and use case.

---

## Best Practices Summary

### For Policy Holders

✅ Research weather patterns before buying
✅ Start with small payout amounts
✅ Set realistic trigger values
✅ Buy coverage before risk period
✅ Monitor your policies regularly
✅ Understand automatic claim process

❌ Don't set impossible triggers
❌ Don't buy coverage after forecast shows trigger likely
❌ Don't over-insure beyond your loss
❌ Don't expect payout if trigger not met

### For Liquidity Providers

✅ Understand the risks
✅ Monitor utilization regularly
✅ Diversify if possible
✅ Start with small amounts
✅ Track pool performance
✅ Have exit strategy

❌ Don't invest more than you can lose
❌ Don't ignore high utilization warnings
❌ Don't expect guaranteed returns
❌ Don't panic during normal volatility

---

## Glossary

**Coverage Period**: Time during which policy is active and monitoring weather

**LP Tokens**: Liquidity Provider tokens representing pool ownership share

**Oracle**: External service that provides verified weather data to blockchain

**Payout**: Amount transferred to policy holder when trigger conditions met

**Policy**: Insurance contract with specific weather trigger conditions

**Premium**: Payment required to purchase policy

**Trigger Condition**: Weather threshold that activates payout

**Utilization Rate**: Percentage of pool committed to potential payouts

**Weather Parameter**: Measurable weather metric (temperature, rainfall, etc.)

**Yield**: Returns earned by liquidity providers from premiums

---

For more information, see:
- [Smart Contract Reference](SMART_CONTRACT_REFERENCE.md)
- [Troubleshooting Guide](../README.md#troubleshooting)
- [Setup Guide](../SETUP.md)
