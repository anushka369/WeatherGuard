# Blockchain Event Listeners and Real-Time Updates Implementation

## Overview

This document describes the implementation of blockchain event listeners and real-time updates for the Weather Insurance dApp. The system provides automatic UI updates when blockchain events occur, along with user notifications and activity tracking.

## Architecture

### Core Components

1. **useBlockchainEvents Hook** (`src/hooks/useBlockchainEvents.ts`)
   - Custom React hook for managing blockchain event subscriptions
   - Provides real-time event listening for PolicyCreated, ClaimProcessed, LiquidityDeposited, and LiquidityWithdrawn events
   - Handles subscription lifecycle (setup and cleanup)
   - Filters events by user account

2. **useHistoricalEvents Hook** (`src/hooks/useBlockchainEvents.ts`)
   - Fetches historical blockchain events
   - Useful for loading past events when component mounts
   - Supports custom block range queries

3. **EventHistoryContext** (`src/contexts/EventHistoryContext.tsx`)
   - Centralized state management for blockchain events
   - Manages activity feed and notifications
   - Integrates with useBlockchainEvents for real-time updates
   - Provides notification system for user feedback

4. **ActivityFeed Component** (`src/components/ActivityFeed.tsx`)
   - Displays chronological feed of user's blockchain activities
   - Shows policy creations, claims, deposits, and withdrawals
   - Supports read/unread status tracking
   - Links to blockchain explorer for transaction details

5. **NotificationContainer Component** (`src/components/NotificationContainer.tsx`)
   - Displays toast-style notifications for real-time events
   - Auto-dismisses after 5 seconds
   - Supports success, error, warning, and info types

## Event Types

### PolicyCreated Event
```typescript
interface PolicyCreatedEvent {
  policyId: number;
  holder: string;
  premium: bigint;
  payoutAmount: bigint;
  coveragePeriodStart: number;
  coveragePeriodEnd: number;
  transactionHash: string;
  blockNumber: number;
}
```

### ClaimProcessed Event
```typescript
interface ClaimProcessedEvent {
  policyId: number;
  holder: string;
  payoutAmount: bigint;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}
```

### LiquidityDeposited Event
```typescript
interface LiquidityDepositedEvent {
  provider: string;
  amount: bigint;
  lpTokens: bigint;
  transactionHash: string;
  blockNumber: number;
}
```

### LiquidityWithdrawn Event
```typescript
interface LiquidityWithdrawnEvent {
  provider: string;
  lpTokens: bigint;
  amount: bigint;
  transactionHash: string;
  blockNumber: number;
}
```

## Usage

### Setting Up Event Listeners

```typescript
import { useBlockchainEvents } from '../hooks/useBlockchainEvents';

const MyComponent = () => {
  useBlockchainEvents({
    onPolicyCreated: (event) => {
      console.log('New policy created:', event.policyId);
    },
    onClaimProcessed: (event) => {
      console.log('Claim processed:', event.payoutAmount);
    },
    onLiquidityDeposited: (event) => {
      console.log('Liquidity deposited:', event.amount);
    },
    onLiquidityWithdrawn: (event) => {
      console.log('Liquidity withdrawn:', event.amount);
    },
  });

  return <div>My Component</div>;
};
```

### Using EventHistoryContext

```typescript
import { useEventHistory } from '../contexts/EventHistoryContext';

const MyComponent = () => {
  const { 
    activities, 
    notifications, 
    unreadCount,
    addNotification,
    markActivityAsRead 
  } = useEventHistory();

  // Add a notification
  addNotification('Operation successful!', 'success');

  // Display activities
  return (
    <div>
      <h3>Unread: {unreadCount}</h3>
      {activities.map(activity => (
        <div key={activity.id}>{activity.type}</div>
      ))}
    </div>
  );
};
```

### Fetching Historical Events

```typescript
import { useHistoricalEvents } from '../hooks/useBlockchainEvents';

const MyComponent = () => {
  const { fetchPolicyCreatedEvents } = useHistoricalEvents();

  useEffect(() => {
    const loadEvents = async () => {
      const events = await fetchPolicyCreatedEvents(0, 'latest');
      console.log('Historical events:', events);
    };
    loadEvents();
  }, []);

  return <div>My Component</div>;
};
```

## Features

### Real-Time Updates
- Automatic UI refresh when blockchain events occur
- No manual refresh required
- Instant feedback for user actions

### Activity Feed
- Chronological display of all user activities
- Read/unread status tracking
- Transaction links to blockchain explorer
- Filterable by activity type

### Notifications
- Toast-style notifications for important events
- Auto-dismiss after 5 seconds
- Manual dismiss option
- Color-coded by type (success, error, warning, info)

### Event Filtering
- Events are automatically filtered by user account
- Only shows events relevant to the connected wallet
- Supports custom filtering in event handlers

## Integration with Existing Components

### Dashboard
- Removed duplicate event listeners
- Now relies on EventHistoryContext for notifications
- Periodic refresh every 30 seconds as backup

### LiquidityProvider
- Simplified event listener setup
- Uses centralized event system
- Periodic refresh for pool statistics

### PolicyPurchase
- Automatically triggers notifications on policy creation
- Updates activity feed in real-time

## Performance Considerations

1. **Event Subscription Management**
   - Proper cleanup on component unmount
   - Prevents memory leaks
   - Efficient subscription handling

2. **Historical Event Loading**
   - Loads only recent events (last 1000 blocks)
   - Marks historical events as "read" by default
   - Prevents overwhelming the UI with old data

3. **Notification Auto-Dismiss**
   - Automatically removes notifications after 5 seconds
   - Prevents notification buildup
   - User can manually dismiss anytime

4. **Periodic Refresh**
   - 30-second intervals for data refresh
   - Ensures data consistency
   - Backup mechanism if event listeners fail

## Testing

Tests are located in `src/hooks/useBlockchainEvents.test.ts`:

```bash
npm test -- --watchAll=false --testPathPattern=useBlockchainEvents
```

Test coverage includes:
- Hook initialization
- Event handler setup
- Historical event fetching
- Disconnected state handling

## Future Enhancements

1. **Event Persistence**
   - Store events in local storage
   - Persist across page refreshes
   - Sync with blockchain on reconnect

2. **Advanced Filtering**
   - Filter by date range
   - Filter by event type
   - Search functionality

3. **Event Analytics**
   - Track event frequency
   - Display statistics
   - Generate reports

4. **Push Notifications**
   - Browser notifications for important events
   - Email notifications (requires backend)
   - Mobile app notifications

## Troubleshooting

### Events Not Appearing
1. Check wallet connection
2. Verify correct network (QIE)
3. Check browser console for errors
4. Ensure contract addresses are correct

### Duplicate Events
1. Check for multiple event listener setups
2. Verify cleanup functions are working
3. Check for component re-renders

### Performance Issues
1. Reduce historical event range
2. Implement pagination for activity feed
3. Optimize event handler logic
4. Consider debouncing rapid events

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.1**: User policy query returns only owned policies ✓
- **Requirement 4.3**: Claim history retrieval is complete ✓
- **Requirement 6.5**: Claim processed notifications are displayed ✓

All event listeners are properly implemented with:
- PolicyCreated events with notifications ✓
- ClaimProcessed events with notifications ✓
- LiquidityDeposited events ✓
- LiquidityWithdrawn events ✓
- Automatic UI updates ✓
- Event history tracking ✓
- User activity feed ✓
