import { renderHook } from '@testing-library/react';
import { useBlockchainEvents, useHistoricalEvents } from './useBlockchainEvents';

// Mock the Web3Context
jest.mock('../contexts/Web3Context', () => ({
  useWeb3: () => ({
    web3: null,
    account: null,
    isConnected: false,
    isCorrectNetwork: false,
  }),
}));

describe('useBlockchainEvents', () => {
  it('should initialize without errors', () => {
    const handlers = {
      onPolicyCreated: jest.fn(),
      onClaimProcessed: jest.fn(),
      onLiquidityDeposited: jest.fn(),
      onLiquidityWithdrawn: jest.fn(),
    };

    const { result } = renderHook(() => useBlockchainEvents(handlers));
    
    expect(result.current).toBeDefined();
    expect(result.current.cleanupSubscriptions).toBeInstanceOf(Function);
  });

  it('should not set up listeners when not connected', () => {
    const handlers = {
      onPolicyCreated: jest.fn(),
    };

    renderHook(() => useBlockchainEvents(handlers));
    
    // Handlers should not be called when not connected
    expect(handlers.onPolicyCreated).not.toHaveBeenCalled();
  });
});

describe('useHistoricalEvents', () => {
  it('should provide fetch functions', () => {
    const { result } = renderHook(() => useHistoricalEvents());
    
    expect(result.current.fetchPolicyCreatedEvents).toBeInstanceOf(Function);
    expect(result.current.fetchClaimProcessedEvents).toBeInstanceOf(Function);
    expect(result.current.fetchLiquidityDepositedEvents).toBeInstanceOf(Function);
    expect(result.current.fetchLiquidityWithdrawnEvents).toBeInstanceOf(Function);
  });

  it('should return empty array when not connected', async () => {
    const { result } = renderHook(() => useHistoricalEvents());
    
    const events = await result.current.fetchPolicyCreatedEvents();
    expect(events).toEqual([]);
  });
});
