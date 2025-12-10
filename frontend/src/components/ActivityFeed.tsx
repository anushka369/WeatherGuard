import React from 'react';
import { useEventHistory, ActivityItem } from '../contexts/EventHistoryContext';
import { useWeb3 } from '../contexts/Web3Context';
import { formatDate, formatCurrency } from '../utils/formatters';
import './ActivityFeed.css';

/**
 * ActivityFeed Component
 * Displays a feed of user's blockchain activity
 */
const ActivityFeed: React.FC = () => {
  const { activities, unreadCount, markActivityAsRead, markAllActivitiesAsRead, clearActivities } =
    useEventHistory();
  const { web3 } = useWeb3();

  /**
   * Get activity icon based on type
   */
  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'policy_created':
        return '📋';
      case 'claim_processed':
        return '💰';
      case 'liquidity_deposited':
        return '⬆️';
      case 'liquidity_withdrawn':
        return '⬇️';
      default:
        return '📌';
    }
  };

  /**
   * Get activity title based on type
   */
  const getActivityTitle = (activity: ActivityItem): string => {
    switch (activity.type) {
      case 'policy_created':
        return 'Policy Created';
      case 'claim_processed':
        return 'Claim Processed';
      case 'liquidity_deposited':
        return 'Liquidity Deposited';
      case 'liquidity_withdrawn':
        return 'Liquidity Withdrawn';
      default:
        return 'Activity';
    }
  };

  /**
   * Get activity description based on type and data
   */
  const getActivityDescription = (activity: ActivityItem): string => {
    if (!web3) return '';

    switch (activity.type) {
      case 'policy_created': {
        const data = activity.data as any;
        const premium = web3.utils.fromWei(data.premium.toString(), 'ether');
        const payout = web3.utils.fromWei(data.payoutAmount.toString(), 'ether');
        return `Policy #${data.policyId} created with ${formatCurrency(premium)} QIE premium and ${formatCurrency(payout)} QIE payout`;
      }
      case 'claim_processed': {
        const data = activity.data as any;
        const payout = web3.utils.fromWei(data.payoutAmount.toString(), 'ether');
        return `Received ${formatCurrency(payout)} QIE payout for policy #${data.policyId}`;
      }
      case 'liquidity_deposited': {
        const data = activity.data as any;
        const amount = web3.utils.fromWei(data.amount.toString(), 'ether');
        const lpTokens = web3.utils.fromWei(data.lpTokens.toString(), 'ether');
        return `Deposited ${formatCurrency(amount)} QIE and received ${formatCurrency(lpTokens)} LP tokens`;
      }
      case 'liquidity_withdrawn': {
        const data = activity.data as any;
        const amount = web3.utils.fromWei(data.amount.toString(), 'ether');
        const lpTokens = web3.utils.fromWei(data.lpTokens.toString(), 'ether');
        return `Withdrew ${formatCurrency(amount)} QIE by burning ${formatCurrency(lpTokens)} LP tokens`;
      }
      default:
        return '';
    }
  };

  /**
   * Get explorer URL for transaction
   */
  const getExplorerUrl = (txHash: string): string => {
    const baseUrl =
      process.env.REACT_APP_NETWORK === 'mainnet'
        ? 'https://explorer.qie.network'
        : 'https://explorer-testnet.qie.network';
    return `${baseUrl}/tx/${txHash}`;
  };

  /**
   * Handle activity click
   */
  const handleActivityClick = (activity: ActivityItem) => {
    if (!activity.read) {
      markActivityAsRead(activity.id);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="activity-feed">
        <div className="activity-feed-header">
          <h3>Activity Feed</h3>
        </div>
        <div className="activity-feed-empty">
          <p>No activity yet. Your blockchain interactions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <div className="activity-feed-title">
          <h3>Activity Feed</h3>
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </div>
        <div className="activity-feed-actions">
          {unreadCount > 0 && (
            <button className="mark-read-button" onClick={markAllActivitiesAsRead}>
              Mark all as read
            </button>
          )}
          <button className="clear-button" onClick={clearActivities}>
            Clear
          </button>
        </div>
      </div>

      <div className="activity-feed-list">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`activity-item ${!activity.read ? 'unread' : ''}`}
            onClick={() => handleActivityClick(activity)}
          >
            <div className="activity-icon">{getActivityIcon(activity.type)}</div>
            <div className="activity-content">
              <div className="activity-header">
                <span className="activity-title">{getActivityTitle(activity)}</span>
                <span className="activity-time">{formatDate(Math.floor(activity.timestamp / 1000))}</span>
              </div>
              <div className="activity-description">{getActivityDescription(activity)}</div>
              <a
                href={getExplorerUrl(activity.data.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="activity-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Transaction →
              </a>
            </div>
            {!activity.read && <div className="unread-indicator"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
