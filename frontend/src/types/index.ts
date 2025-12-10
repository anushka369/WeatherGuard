/**
 * Type definitions for Weather Insurance dApp
 */

export enum WeatherParameter {
  TEMPERATURE = 0,
  RAINFALL = 1,
  WIND_SPEED = 2,
  HUMIDITY = 3,
}

export enum ComparisonOperator {
  GREATER_THAN = 0,
  LESS_THAN = 1,
  EQUAL_TO = 2,
}

export enum PolicyStatus {
  ACTIVE = 0,
  CLAIMED = 1,
  EXPIRED = 2,
  CANCELLED = 3,
}

export interface Policy {
  policyId: number;
  holder: string;
  coveragePeriodStart: number;
  coveragePeriodEnd: number;
  location: string;
  parameterType: WeatherParameter;
  triggerValue: number;
  operator: ComparisonOperator;
  premium: bigint;
  payoutAmount: bigint;
  status: PolicyStatus;
  createdAt: number;
}

export interface PoolStats {
  totalValue: bigint;
  totalLiability: bigint;
  utilizationRate: number;
  totalPremiums: bigint;
  totalPayouts: bigint;
  lpTokenSupply: bigint;
}

export interface ProviderPosition {
  lpTokens: bigint;
  depositedAmount: bigint;
  poolShare: number;
  accumulatedYield: bigint;
  depositTimestamp: number;
}

export interface WeatherData {
  location: string;
  parameterType: WeatherParameter;
  value: number;
  timestamp: number;
  oracleSignature: string;
}

export interface ContractAddresses {
  policyManager: string;
  liquidityPool: string;
  oracleConsumer: string;
}
