# Requirements Document

## Introduction

The Decentralized Weather Insurance dApp is a blockchain-based insurance platform built on QIE that enables users to purchase parametric weather insurance policies. The system automatically executes payouts when predefined weather conditions are met, as verified by oracle data. This eliminates traditional insurance friction, reduces costs, and provides instant, trustless claim settlements. Target users include farmers protecting crops, event organizers hedging against weather disruptions, and travelers seeking weather-related coverage.

## Glossary

- **Insurance System**: The complete smart contract system managing policies, premiums, and payouts
- **Policy Holder**: A user who purchases weather insurance coverage
- **Policy**: A smart contract representing an insurance agreement with specific weather trigger conditions
- **Premium**: The payment amount required to purchase a policy
- **Payout**: The compensation amount transferred to a policy holder when trigger conditions are met
- **Weather Oracle**: An external data provider that supplies verified weather data to the blockchain
- **Trigger Condition**: A specific weather parameter threshold that activates a payout
- **Liquidity Pool**: A smart contract holding funds that back insurance policies
- **Liquidity Provider**: A user who deposits funds into the liquidity pool to earn yields
- **Coverage Period**: The time duration during which a policy is active
- **Weather Parameter**: A measurable weather metric such as temperature, rainfall, or wind speed
- **Claim**: An automatic payout request triggered when weather conditions are met
- **QIE Token**: The native cryptocurrency used for premiums and payouts on the QIE blockchain

## Requirements

### Requirement 1

**User Story:** As a policy holder, I want to purchase weather insurance policies with customizable parameters, so that I can protect myself against specific weather risks relevant to my needs.

#### Acceptance Criteria

1. WHEN a user submits a policy purchase request with valid parameters and premium payment, THE Insurance System SHALL create a new policy and assign it to the user
2. WHEN a user specifies weather trigger conditions, THE Insurance System SHALL validate that the parameters are within acceptable ranges
3. WHEN a policy is created, THE Insurance System SHALL record the coverage period, trigger conditions, premium amount, and payout amount
4. WHERE a user selects from predefined policy templates, THE Insurance System SHALL populate default parameters for common use cases
5. WHEN a user pays the premium, THE Insurance System SHALL transfer the funds to the liquidity pool and activate the policy

### Requirement 2

**User Story:** As a policy holder, I want automatic claim processing based on oracle weather data, so that I receive payouts immediately when trigger conditions are met without manual intervention.

#### Acceptance Criteria

1. WHEN the Weather Oracle reports weather data during a coverage period, THE Insurance System SHALL evaluate all active policies against the reported data
2. IF a policy's trigger conditions are met, THEN THE Insurance System SHALL initiate an automatic payout to the policy holder
3. WHEN a payout is initiated, THE Insurance System SHALL transfer the payout amount from the liquidity pool to the policy holder's wallet
4. WHEN a claim is processed, THE Insurance System SHALL mark the policy as claimed and prevent duplicate payouts
5. WHEN weather data is received, THE Insurance System SHALL verify the oracle signature before processing

### Requirement 3

**User Story:** As a liquidity provider, I want to deposit funds into the insurance pool and earn yields, so that I can generate passive income while providing insurance capacity.

#### Acceptance Criteria

1. WHEN a liquidity provider deposits QIE tokens, THE Insurance System SHALL mint liquidity pool tokens proportional to their contribution
2. WHEN premiums are collected from policy purchases, THE Insurance System SHALL distribute a percentage to liquidity providers as yield
3. WHEN a liquidity provider requests withdrawal, THE Insurance System SHALL burn their pool tokens and return the proportional share of the pool
4. IF the liquidity pool has insufficient funds for a withdrawal, THEN THE Insurance System SHALL reject the withdrawal request
5. WHEN calculating yields, THE Insurance System SHALL account for premiums collected and payouts made during the provider's participation period

### Requirement 4

**User Story:** As a policy holder, I want to view my active policies and claim history, so that I can track my coverage and received payouts.

#### Acceptance Criteria

1. WHEN a policy holder queries their policies, THE Insurance System SHALL return all policies associated with their wallet address
2. WHEN displaying policy information, THE Insurance System SHALL show coverage period, trigger conditions, premium paid, payout amount, and current status
3. WHEN a policy holder queries claim history, THE Insurance System SHALL return all processed claims with timestamps and payout amounts
4. WHEN a policy expires without triggering, THE Insurance System SHALL update the policy status to expired
5. WHEN displaying active policies, THE Insurance System SHALL filter out expired and claimed policies

### Requirement 5

**User Story:** As a system administrator, I want to configure oracle data sources and policy parameters, so that the system can adapt to different weather data providers and risk profiles.

#### Acceptance Criteria

1. WHEN an administrator updates the oracle address, THE Insurance System SHALL validate the new address and update the configuration
2. WHEN an administrator sets policy parameter limits, THE Insurance System SHALL enforce these limits during policy creation
3. WHEN an administrator adjusts the liquidity provider yield percentage, THE Insurance System SHALL apply the new rate to future premium collections
4. WHEN an administrator pauses the system, THE Insurance System SHALL prevent new policy purchases while allowing existing claims to process
5. WHEN an administrator updates configuration, THE Insurance System SHALL emit an event logging the change

### Requirement 6

**User Story:** As a user, I want to interact with the dApp through a web interface, so that I can easily purchase policies and manage my insurance without technical blockchain knowledge.

#### Acceptance Criteria

1. WHEN a user connects their wallet, THE Insurance System SHALL display their account balance and existing policies
2. WHEN a user fills out the policy purchase form, THE Insurance System SHALL validate inputs in real-time and display estimated premium costs
3. WHEN a user confirms a purchase, THE Insurance System SHALL prompt for wallet signature and display transaction status
4. WHEN displaying available policy templates, THE Insurance System SHALL show clear descriptions of coverage scenarios
5. WHEN a claim is processed, THE Insurance System SHALL display a notification to the policy holder

### Requirement 7

**User Story:** As a liquidity provider, I want to view pool statistics and my earnings, so that I can make informed decisions about my investment.

#### Acceptance Criteria

1. WHEN a liquidity provider views pool statistics, THE Insurance System SHALL display total pool value, active policies, and utilization rate
2. WHEN a liquidity provider checks their position, THE Insurance System SHALL show their deposited amount, pool share percentage, and accumulated yields
3. WHEN calculating pool utilization, THE Insurance System SHALL divide total policy liability by available pool funds
4. WHEN displaying historical data, THE Insurance System SHALL show premium income and payout history over time
5. WHEN a liquidity provider evaluates risk, THE Insurance System SHALL display the number of policies approaching trigger conditions

### Requirement 8

**User Story:** As a developer, I want comprehensive smart contract testing and documentation, so that the system is secure, reliable, and maintainable.

#### Acceptance Criteria

1. WHEN smart contracts are deployed, THE Insurance System SHALL have passed all unit tests covering core functionality
2. WHEN testing policy creation, THE Insurance System SHALL validate correct state transitions and event emissions
3. WHEN testing claim processing, THE Insurance System SHALL verify accurate payout calculations and fund transfers
4. WHEN testing edge cases, THE Insurance System SHALL handle boundary conditions such as zero balances and expired policies
5. WHEN documentation is generated, THE Insurance System SHALL include function descriptions, parameter specifications, and usage examples
