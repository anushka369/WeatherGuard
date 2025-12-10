import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import {
  useBlockchainEvents,
  useHistoricalEvents,
  PolicyCreatedEvent,
  ClaimProcessedEvent,
  LiquidityDepositedEvent,
  LiquidityWithdrawnEvent,
} from '../hooks/useBlockchainEvents';

/**
 * Activity feed item types
 */
export type ActivityType = 'policy_created' | 'claim_processed' | 'liquidity_deposited' | 'liquidity_withdrawn';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: number;
  data: PolicyCreatedEvent | ClaimProcessedEvent | LiquidityDepositedEvent | LiquidityWithdrawnEvent;
  read: boolean;
}

/**
 * Notification types
 */
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
  autoClose?: boolean;
}

interface EventHistoryContextType {
  activities: ActivityItem[];
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, type: Notification['type'], autoClose?: boolean) => void;
  removeNotification: (id: string) => void;
  markActivityAsRead: (id: string) => void;
  markAllActivitiesAsRead: () => void;
  clearActivities: () => void;
}

const EventHistoryContext = createContext<EventHistoryContextType | undefined>(undefined);

export const useEventHistory = () => {
  const context = useContext(EventHistoryContext);
  if (!context) {
    throw new Error('useEventHistory must be used within EventHistoryProvider');
  }
  return context;
};

interface EventHistoryProviderProps {
  children: ReactNode;
}

export const EventHistoryProvider: React.FC<EventHistoryProviderProps> = ({ children }) => {
  const { account, web3, isConnected, isCorrectNetwork } = useWeb3();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    fetchPolicyCreatedEvents,
    fetchClaimProcessedEvents,
    fetchLiquidityDepositedEvents,
    fetchLiquidityWithdrawnEvents,
  } = useHistoricalEvents();

  /**
   * Add notification
   */
  const addNotification = useCallback(
    (message: string, type: Notification['type'] = 'info', autoClose: boolean = true) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
        timestamp: Date.now(),
        autoClose,
      };

      setNotifications((prev) => [notification, ...prev]);

      // Auto-remove after 5 seconds if autoClose is true
      if (autoClose) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 5000);
      }
    },
    []
  );

  /**
   * Remove notification
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Add activity to feed
   */
  const addActivity = useCallback(
    (
      type: ActivityType,
      data: PolicyCreatedEvent | ClaimProcessedEvent | LiquidityDepositedEvent | LiquidityWithdrawnEvent
    ) => {
      const activity: ActivityItem = {
        id: `${type}-${data.transactionHash}-${Date.now()}`,
        type,
        timestamp: Date.now(),
        data,
        read: false,
      };

      setActivities((prev) => {
        // Check if activity already exists
        const exists = prev.some((a) => a.data.transactionHash === data.transactionHash);
        if (exists) return prev;

        // Add new activity and sort by timestamp descending
        return [activity, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      });
    },
    []
  );

  /**
   * Mark activity as read
   */
  const markActivityAsRead = useCallback((id: string) => {
    setActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, read: true } : activity))
    );
  }, []);

  /**
   * Mark all activities as read
   */
  const markAllActivitiesAsRead = useCallback(() => {
    setActivities((prev) => prev.map((activity) => ({ ...activity, read: true })));
  }, []);

  /**
   * Clear all activities
   */
  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  /**
   * Calculate unread count
   */
  const unreadCount = activities.filter((a) => !a.read).length;

  /**
   * Event handlers for real-time events
   */
  const handlePolicyCreated = useCallback(
    (event: PolicyCreatedEvent) => {
      addActivity('policy_created', event);
      addNotification('New policy created successfully!', 'success');
    },
    [addActivity, addNotification]
  );

  const handleClaimProcessed = useCallback(
    (event: ClaimProcessedEvent) => {
      addActivity('claim_processed', event);
      const payoutEth = web3 ? web3.utils.fromWei(event.payoutAmount.toString(), 'ether') : '0';
      addNotification(
        `Claim processed! You received ${payoutEth} QIE for policy #${event.policyId}`,
        'success'
      );
    },
    [addActivity, addNotification, web3]
  );

  const handleLiquidityDeposited = useCallback(
    (event: LiquidityDepositedEvent) => {
      addActivity('liquidity_deposited', event);
      const amountEth = web3 ? web3.utils.fromWei(event.amount.toString(), 'ether') : '0';
      addNotification(`Successfully deposited ${amountEth} QIE to liquidity pool`, 'success');
    },
    [addActivity, addNotification, web3]
  );

  const handleLiquidityWithdrawn = useCallback(
    (event: LiquidityWithdrawnEvent) => {
      addActivity('liquidity_withdrawn', event);
      const amountEth = web3 ? web3.utils.fromWei(event.amount.toString(), 'ether') : '0';
      addNotification(`Successfully withdrew ${amountEth} QIE from liquidity pool`, 'success');
    },
    [addActivity, addNotification, web3]
  );

  /**
   * Set up real-time event listeners
   */
  useBlockchainEvents({
    onPolicyCreated: handlePolicyCreated,
    onClaimProcessed: handleClaimProcessed,
    onLiquidityDeposited: handleLiquidityDeposited,
    onLiquidityWithdrawn: handleLiquidityWithdrawn,
  });

  /**
   * Load historical events on mount
   */
  useEffect(() => {
    const loadHistoricalEvents = async () => {
      if (!isConnected || !isCorrectNetwork || !account || isInitialized) {
        return;
      }

      try {
        // Fetch events from the last 1000 blocks (adjust as needed)
        const currentBlock = await web3?.eth.getBlockNumber();
        const fromBlock = currentBlock ? Math.max(0, Number(currentBlock) - 1000) : 0;

        const [policyEvents, claimEvents, depositEvents, withdrawEvents] = await Promise.all([
          fetchPolicyCreatedEvents(fromBlock, 'latest'),
          fetchClaimProcessedEvents(fromBlock, 'latest'),
          fetchLiquidityDepositedEvents(fromBlock, 'latest'),
          fetchLiquidityWithdrawnEvents(fromBlock, 'latest'),
        ]);

        // Add all historical events to activities
        const allActivities: ActivityItem[] = [
          ...policyEvents.map((event) => ({
            id: `policy_created-${event.transactionHash}-${event.blockNumber}`,
            type: 'policy_created' as ActivityType,
            timestamp: event.coveragePeriodStart * 1000, // Convert to milliseconds
            data: event,
            read: true, // Mark historical events as read
          })),
          ...claimEvents.map((event) => ({
            id: `claim_processed-${event.transactionHash}-${event.blockNumber}`,
            type: 'claim_processed' as ActivityType,
            timestamp: event.timestamp * 1000,
            data: event,
            read: true,
          })),
          ...depositEvents.map((event) => ({
            id: `liquidity_deposited-${event.transactionHash}-${event.blockNumber}`,
            type: 'liquidity_deposited' as ActivityType,
            timestamp: Date.now(), // Use current time as we don't have timestamp in event
            data: event,
            read: true,
          })),
          ...withdrawEvents.map((event) => ({
            id: `liquidity_withdrawn-${event.transactionHash}-${event.blockNumber}`,
            type: 'liquidity_withdrawn' as ActivityType,
            timestamp: Date.now(),
            data: event,
            read: true,
          })),
        ];

        // Sort by timestamp descending
        allActivities.sort((a, b) => b.timestamp - a.timestamp);

        setActivities(allActivities);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading historical events:', error);
      }
    };

    loadHistoricalEvents();
  }, [
    isConnected,
    isCorrectNetwork,
    account,
    web3,
    isInitialized,
    fetchPolicyCreatedEvents,
    fetchClaimProcessedEvents,
    fetchLiquidityDepositedEvents,
    fetchLiquidityWithdrawnEvents,
  ]);

  /**
   * Reset state when account changes
   */
  useEffect(() => {
    setActivities([]);
    setNotifications([]);
    setIsInitialized(false);
  }, [account]);

  const value: EventHistoryContextType = {
    activities,
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markActivityAsRead,
    markAllActivitiesAsRead,
    clearActivities,
  };

  return <EventHistoryContext.Provider value={value}>{children}</EventHistoryContext.Provider>;
};
