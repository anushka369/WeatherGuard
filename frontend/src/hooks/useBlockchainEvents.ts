import { useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import PolicyManagerABI from '../contracts/PolicyManager.json';
import LiquidityPoolABI from '../contracts/LiquidityPool.json';

/**
 * Event types for blockchain events
 */
export interface PolicyCreatedEvent {
  policyId: number;
  holder: string;
  premium: bigint;
  payoutAmount: bigint;
  coveragePeriodStart: number;
  coveragePeriodEnd: number;
  transactionHash: string;
  blockNumber: number;
}

export interface ClaimProcessedEvent {
  policyId: number;
  holder: string;
  payoutAmount: bigint;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}

export interface LiquidityDepositedEvent {
  provider: string;
  amount: bigint;
  lpTokens: bigint;
  transactionHash: string;
  blockNumber: number;
}

export interface LiquidityWithdrawnEvent {
  provider: string;
  lpTokens: bigint;
  amount: bigint;
  transactionHash: string;
  blockNumber: number;
}

/**
 * Event handlers interface
 */
export interface EventHandlers {
  onPolicyCreated?: (event: PolicyCreatedEvent) => void;
  onClaimProcessed?: (event: ClaimProcessedEvent) => void;
  onLiquidityDeposited?: (event: LiquidityDepositedEvent) => void;
  onLiquidityWithdrawn?: (event: LiquidityWithdrawnEvent) => void;
}

/**
 * Hook for managing blockchain event listeners
 * Provides real-time updates for policy, claim, and liquidity events
 */
export const useBlockchainEvents = (handlers: EventHandlers) => {
  const { web3, account, isConnected, isCorrectNetwork } = useWeb3();
  const subscriptionsRef = useRef<any[]>([]);

  /**
   * Clean up all subscriptions
   */
  const cleanupSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach((subscription) => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
    });
    subscriptionsRef.current = [];
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!web3 || !isConnected || !isCorrectNetwork) {
      cleanupSubscriptions();
      return;
    }

    try {
      // PolicyManager contract
      const policyManagerContract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      // LiquidityPool contract
      const liquidityPoolContract = new web3.eth.Contract(
        LiquidityPoolABI.abi as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      // Listen for PolicyCreated events
      if (handlers.onPolicyCreated) {
        const policyCreatedFilter = account ? { holder: account } : {};
        const policyCreatedSubscription = policyManagerContract.events
          .PolicyCreated(policyCreatedFilter)
          .on('data', (event: any) => {
            const policyEvent: PolicyCreatedEvent = {
              policyId: Number(event.returnValues.policyId),
              holder: event.returnValues.holder,
              premium: BigInt(event.returnValues.premium),
              payoutAmount: BigInt(event.returnValues.payoutAmount),
              coveragePeriodStart: Number(event.returnValues.coveragePeriodStart),
              coveragePeriodEnd: Number(event.returnValues.coveragePeriodEnd),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
            };
            handlers.onPolicyCreated?.(policyEvent);
          })
          .on('error', (error: any) => {
            console.error('PolicyCreated event error:', error);
          });

        subscriptionsRef.current.push(policyCreatedSubscription);
      }

      // Listen for ClaimProcessed events
      if (handlers.onClaimProcessed) {
        const claimProcessedFilter = account ? { holder: account } : {};
        const claimProcessedSubscription = policyManagerContract.events
          .ClaimProcessed(claimProcessedFilter)
          .on('data', (event: any) => {
            const claimEvent: ClaimProcessedEvent = {
              policyId: Number(event.returnValues.policyId),
              holder: event.returnValues.holder,
              payoutAmount: BigInt(event.returnValues.payoutAmount),
              timestamp: Number(event.returnValues.timestamp),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
            };
            handlers.onClaimProcessed?.(claimEvent);
          })
          .on('error', (error: any) => {
            console.error('ClaimProcessed event error:', error);
          });

        subscriptionsRef.current.push(claimProcessedSubscription);
      }

      // Listen for LiquidityDeposited events
      if (handlers.onLiquidityDeposited) {
        const liquidityDepositedFilter = account ? { provider: account } : {};
        const liquidityDepositedSubscription = liquidityPoolContract.events
          .LiquidityDeposited(liquidityDepositedFilter)
          .on('data', (event: any) => {
            const depositEvent: LiquidityDepositedEvent = {
              provider: event.returnValues.provider,
              amount: BigInt(event.returnValues.amount),
              lpTokens: BigInt(event.returnValues.lpTokens),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
            };
            handlers.onLiquidityDeposited?.(depositEvent);
          })
          .on('error', (error: any) => {
            console.error('LiquidityDeposited event error:', error);
          });

        subscriptionsRef.current.push(liquidityDepositedSubscription);
      }

      // Listen for LiquidityWithdrawn events
      if (handlers.onLiquidityWithdrawn) {
        const liquidityWithdrawnFilter = account ? { provider: account } : {};
        const liquidityWithdrawnSubscription = liquidityPoolContract.events
          .LiquidityWithdrawn(liquidityWithdrawnFilter)
          .on('data', (event: any) => {
            const withdrawEvent: LiquidityWithdrawnEvent = {
              provider: event.returnValues.provider,
              lpTokens: BigInt(event.returnValues.lpTokens),
              amount: BigInt(event.returnValues.amount),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
            };
            handlers.onLiquidityWithdrawn?.(withdrawEvent);
          })
          .on('error', (error: any) => {
            console.error('LiquidityWithdrawn event error:', error);
          });

        subscriptionsRef.current.push(liquidityWithdrawnSubscription);
      }
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupSubscriptions();
    };
  }, [web3, account, isConnected, isCorrectNetwork, handlers, cleanupSubscriptions]);

  return {
    cleanupSubscriptions,
  };
};

/**
 * Hook for fetching historical events
 * Useful for loading past events when component mounts
 */
export const useHistoricalEvents = () => {
  const { web3, account, isConnected, isCorrectNetwork } = useWeb3();

  /**
   * Fetch historical PolicyCreated events
   */
  const fetchPolicyCreatedEvents = useCallback(
    async (fromBlock: number | string = 0, toBlock: number | string = 'latest') => {
      if (!web3 || !account || !isConnected || !isCorrectNetwork) {
        return [];
      }

      try {
        const contract = new web3.eth.Contract(
          PolicyManagerABI.abi as any,
          CONTRACT_ADDRESSES.policyManager
        );

        const events = await contract.getPastEvents('PolicyCreated', {
          filter: { holder: account },
          fromBlock,
          toBlock,
        });

        return events.map((event: any) => ({
          policyId: Number(event.returnValues.policyId),
          holder: event.returnValues.holder,
          premium: BigInt(event.returnValues.premium),
          payoutAmount: BigInt(event.returnValues.payoutAmount),
          coveragePeriodStart: Number(event.returnValues.coveragePeriodStart),
          coveragePeriodEnd: Number(event.returnValues.coveragePeriodEnd),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        })) as PolicyCreatedEvent[];
      } catch (error) {
        console.error('Error fetching PolicyCreated events:', error);
        return [];
      }
    },
    [web3, account, isConnected, isCorrectNetwork]
  );

  /**
   * Fetch historical ClaimProcessed events
   */
  const fetchClaimProcessedEvents = useCallback(
    async (fromBlock: number | string = 0, toBlock: number | string = 'latest') => {
      if (!web3 || !account || !isConnected || !isCorrectNetwork) {
        return [];
      }

      try {
        const contract = new web3.eth.Contract(
          PolicyManagerABI.abi as any,
          CONTRACT_ADDRESSES.policyManager
        );

        const events = await contract.getPastEvents('ClaimProcessed', {
          filter: { holder: account },
          fromBlock,
          toBlock,
        });

        return events.map((event: any) => ({
          policyId: Number(event.returnValues.policyId),
          holder: event.returnValues.holder,
          payoutAmount: BigInt(event.returnValues.payoutAmount),
          timestamp: Number(event.returnValues.timestamp),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        })) as ClaimProcessedEvent[];
      } catch (error) {
        console.error('Error fetching ClaimProcessed events:', error);
        return [];
      }
    },
    [web3, account, isConnected, isCorrectNetwork]
  );

  /**
   * Fetch historical LiquidityDeposited events
   */
  const fetchLiquidityDepositedEvents = useCallback(
    async (fromBlock: number | string = 0, toBlock: number | string = 'latest') => {
      if (!web3 || !account || !isConnected || !isCorrectNetwork) {
        return [];
      }

      try {
        const contract = new web3.eth.Contract(
          LiquidityPoolABI.abi as any,
          CONTRACT_ADDRESSES.liquidityPool
        );

        const events = await contract.getPastEvents('LiquidityDeposited', {
          filter: { provider: account },
          fromBlock,
          toBlock,
        });

        return events.map((event: any) => ({
          provider: event.returnValues.provider,
          amount: BigInt(event.returnValues.amount),
          lpTokens: BigInt(event.returnValues.lpTokens),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        })) as LiquidityDepositedEvent[];
      } catch (error) {
        console.error('Error fetching LiquidityDeposited events:', error);
        return [];
      }
    },
    [web3, account, isConnected, isCorrectNetwork]
  );

  /**
   * Fetch historical LiquidityWithdrawn events
   */
  const fetchLiquidityWithdrawnEvents = useCallback(
    async (fromBlock: number | string = 0, toBlock: number | string = 'latest') => {
      if (!web3 || !account || !isConnected || !isCorrectNetwork) {
        return [];
      }

      try {
        const contract = new web3.eth.Contract(
          LiquidityPoolABI.abi as any,
          CONTRACT_ADDRESSES.liquidityPool
        );

        const events = await contract.getPastEvents('LiquidityWithdrawn', {
          filter: { provider: account },
          fromBlock,
          toBlock,
        });

        return events.map((event: any) => ({
          provider: event.returnValues.provider,
          lpTokens: BigInt(event.returnValues.lpTokens),
          amount: BigInt(event.returnValues.amount),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        })) as LiquidityWithdrawnEvent[];
      } catch (error) {
        console.error('Error fetching LiquidityWithdrawn events:', error);
        return [];
      }
    },
    [web3, account, isConnected, isCorrectNetwork]
  );

  return {
    fetchPolicyCreatedEvents,
    fetchClaimProcessedEvents,
    fetchLiquidityDepositedEvents,
    fetchLiquidityWithdrawnEvents,
  };
};
