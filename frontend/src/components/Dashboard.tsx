import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useEventHistory } from '../contexts/EventHistoryContext';
import { CONTRACT_ADDRESSES, WEATHER_PARAMETER_LABELS, COMPARISON_OPERATOR_LABELS, POLICY_STATUS_LABELS } from '../utils/constants';
import { Policy, PolicyStatus, WeatherParameter, ComparisonOperator } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import './Dashboard.css';

// Import contract ABI
import PolicyManagerABI from '../contracts/PolicyManager.json';

interface ClaimEvent {
  policyId: number;
  holder: string;
  payoutAmount: bigint;
  timestamp: number;
  transactionHash: string;
}

/**
 * Dashboard Component
 * Displays user's active policies and claim history
 * Real-time updates are handled by EventHistoryContext
 */
const Dashboard: React.FC = () => {
  const { account, web3, isConnected, isCorrectNetwork } = useWeb3();

  // State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [claimHistory, setClaimHistory] = useState<ClaimEvent[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user policies
   */
  const fetchPolicies = useCallback(async () => {
    if (!web3 || !account || !isConnected || !isCorrectNetwork) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const contract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      // Get user's policy IDs
      const policyIds = await contract.methods.getUserPolicies(account).call();

      // Fetch details for each policy
      const policyPromises = policyIds.map(async (id: bigint) => {
        const policyData = await contract.methods.getPolicy(id).call();
        return {
          policyId: Number(id),
          holder: policyData.holder,
          coveragePeriodStart: Number(policyData.coveragePeriodStart),
          coveragePeriodEnd: Number(policyData.coveragePeriodEnd),
          location: policyData.location,
          parameterType: Number(policyData.parameterType) as WeatherParameter,
          triggerValue: Number(policyData.triggerValue),
          operator: Number(policyData.operator) as ComparisonOperator,
          premium: BigInt(policyData.premium),
          payoutAmount: BigInt(policyData.payoutAmount),
          status: Number(policyData.status) as PolicyStatus,
          createdAt: Number(policyData.createdAt),
        };
      });

      const fetchedPolicies = await Promise.all(policyPromises);
      setPolicies(fetchedPolicies);
    } catch (err: any) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [web3, account, isConnected, isCorrectNetwork]);

  /**
   * Fetch claim history
   */
  const fetchClaimHistory = useCallback(async () => {
    if (!web3 || !account || !isConnected || !isCorrectNetwork) {
      return;
    }

    try {
      const contract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      // Get ClaimProcessed events for this user
      const events = await contract.getPastEvents('ClaimProcessed', {
        filter: { holder: account },
        fromBlock: 0,
        toBlock: 'latest',
      });

      const claims: ClaimEvent[] = events.map((event: any) => ({
        policyId: Number(event.returnValues.policyId),
        holder: event.returnValues.holder,
        payoutAmount: BigInt(event.returnValues.payoutAmount),
        timestamp: Number(event.returnValues.timestamp),
        transactionHash: event.transactionHash,
      }));

      // Sort by timestamp descending
      claims.sort((a, b) => b.timestamp - a.timestamp);

      setClaimHistory(claims);
    } catch (err: any) {
      console.error('Error fetching claim history:', err);
    }
  }, [web3, account, isConnected, isCorrectNetwork]);

  /**
   * Filter policies by status
   */
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredPolicies(policies);
    } else {
      const filtered = policies.filter((policy) => {
        // For active filter, also check if policy is within coverage period
        if (statusFilter === PolicyStatus.ACTIVE) {
          const now = Math.floor(Date.now() / 1000);
          return (
            policy.status === PolicyStatus.ACTIVE &&
            now >= policy.coveragePeriodStart &&
            now <= policy.coveragePeriodEnd
          );
        }
        return policy.status === statusFilter;
      });
      setFilteredPolicies(filtered);
    }
  }, [policies, statusFilter]);

  /**
   * Set up event listeners for real-time updates
   * Event listeners are now handled centrally by EventHistoryContext
   * We just need to refresh data when events occur
   */
  useEffect(() => {
    // Listen to activities from EventHistoryContext to refresh data
    // This is a simpler approach - data refreshes are triggered by the central event system
    const refreshInterval = setInterval(() => {
      if (isConnected && isCorrectNetwork && account) {
        fetchPolicies();
        fetchClaimHistory();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isConnected, isCorrectNetwork, account, fetchPolicies, fetchClaimHistory]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (isConnected && isCorrectNetwork && account) {
      fetchPolicies();
      fetchClaimHistory();
    }
  }, [isConnected, isCorrectNetwork, account, fetchPolicies, fetchClaimHistory]);

  /**
   * Get policy status badge class
   */
  const getStatusBadgeClass = (status: PolicyStatus): string => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return 'status-badge active';
      case PolicyStatus.CLAIMED:
        return 'status-badge claimed';
      case PolicyStatus.EXPIRED:
        return 'status-badge expired';
      case PolicyStatus.CANCELLED:
        return 'status-badge cancelled';
      default:
        return 'status-badge';
    }
  };

  /**
   * Check if policy is currently active
   */
  const isPolicyCurrentlyActive = (policy: Policy): boolean => {
    const now = Math.floor(Date.now() / 1000);
    return (
      policy.status === PolicyStatus.ACTIVE &&
      now >= policy.coveragePeriodStart &&
      now <= policy.coveragePeriodEnd
    );
  };

  /**
   * Render policy detail modal
   */
  const renderPolicyDetail = () => {
    if (!selectedPolicy || !web3) return null;

    const isActive = isPolicyCurrentlyActive(selectedPolicy);

    return (
      <div className="modal-overlay" onClick={() => setSelectedPolicy(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Policy #{selectedPolicy.policyId}</h3>
            <button className="close-button" onClick={() => setSelectedPolicy(null)}>
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="policy-detail-section">
              <h4>Status</h4>
              <span className={getStatusBadgeClass(selectedPolicy.status)}>
                {POLICY_STATUS_LABELS[selectedPolicy.status]}
              </span>
              {isActive && <span className="active-indicator">● Currently Active</span>}
            </div>

            <div className="policy-detail-section">
              <h4>Coverage Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedPolicy.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Coverage Start:</span>
                  <span className="detail-value">
                    {formatDate(selectedPolicy.coveragePeriodStart)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Coverage End:</span>
                  <span className="detail-value">
                    {formatDate(selectedPolicy.coveragePeriodEnd)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedPolicy.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="policy-detail-section">
              <h4>Trigger Conditions</h4>
              <div className="trigger-display">
                <span className="trigger-text">
                  {WEATHER_PARAMETER_LABELS[selectedPolicy.parameterType]}{' '}
                  {COMPARISON_OPERATOR_LABELS[selectedPolicy.operator]}{' '}
                  {selectedPolicy.triggerValue}
                </span>
              </div>
            </div>

            <div className="policy-detail-section">
              <h4>Financial Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Premium Paid:</span>
                  <span className="detail-value">
                    {formatCurrency(web3.utils.fromWei(selectedPolicy.premium.toString(), 'ether'))} QIE
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Payout Amount:</span>
                  <span className="detail-value highlight">
                    {formatCurrency(web3.utils.fromWei(selectedPolicy.payoutAmount.toString(), 'ether'))} QIE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (!isConnected) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>My Dashboard</h2>
        </div>
        <div className="empty-state">
          <p>Please connect your wallet to view your policies</p>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>My Dashboard</h2>
        </div>
        <div className="empty-state">
          <p>Please switch to the QIE network to view your policies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>My Dashboard</h2>
        <button className="refresh-button" onClick={fetchPolicies} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Policy Filters */}
      <div className="filter-section">
        <h3>Filter by Status:</h3>
        <div className="filter-buttons">
          <button
            className={`filter-button ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({policies.length})
          </button>
          <button
            className={`filter-button ${statusFilter === PolicyStatus.ACTIVE ? 'active' : ''}`}
            onClick={() => setStatusFilter(PolicyStatus.ACTIVE)}
          >
            Active ({policies.filter((p) => isPolicyCurrentlyActive(p)).length})
          </button>
          <button
            className={`filter-button ${statusFilter === PolicyStatus.CLAIMED ? 'active' : ''}`}
            onClick={() => setStatusFilter(PolicyStatus.CLAIMED)}
          >
            Claimed ({policies.filter((p) => p.status === PolicyStatus.CLAIMED).length})
          </button>
          <button
            className={`filter-button ${statusFilter === PolicyStatus.EXPIRED ? 'active' : ''}`}
            onClick={() => setStatusFilter(PolicyStatus.EXPIRED)}
          >
            Expired ({policies.filter((p) => p.status === PolicyStatus.EXPIRED).length})
          </button>
        </div>
      </div>

      {/* Policies List */}
      <div className="policies-section">
        <h3>My Policies</h3>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading policies...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="empty-state">
            <p>
              {statusFilter === 'all'
                ? 'You have no policies yet. Purchase your first policy above!'
                : `No ${POLICY_STATUS_LABELS[statusFilter as PolicyStatus].toLowerCase()} policies found.`}
            </p>
          </div>
        ) : (
          <div className="policies-grid">
            {filteredPolicies.map((policy) => (
              <div
                key={policy.policyId}
                className="policy-card"
                onClick={() => setSelectedPolicy(policy)}
              >
                <div className="policy-card-header">
                  <span className="policy-id">Policy #{policy.policyId}</span>
                  <span className={getStatusBadgeClass(policy.status)}>
                    {POLICY_STATUS_LABELS[policy.status]}
                  </span>
                </div>

                <div className="policy-card-body">
                  <div className="policy-info">
                    <span className="info-label">Location:</span>
                    <span className="info-value">{policy.location}</span>
                  </div>

                  <div className="policy-info">
                    <span className="info-label">Coverage:</span>
                    <span className="info-value">
                      {formatDate(policy.coveragePeriodStart)} - {formatDate(policy.coveragePeriodEnd)}
                    </span>
                  </div>

                  <div className="policy-info">
                    <span className="info-label">Trigger:</span>
                    <span className="info-value">
                      {WEATHER_PARAMETER_LABELS[policy.parameterType]}{' '}
                      {COMPARISON_OPERATOR_LABELS[policy.operator]} {policy.triggerValue}
                    </span>
                  </div>

                  <div className="policy-info">
                    <span className="info-label">Payout:</span>
                    <span className="info-value highlight">
                      {web3 && formatCurrency(web3.utils.fromWei(policy.payoutAmount.toString(), 'ether'))} QIE
                    </span>
                  </div>
                </div>

                <div className="policy-card-footer">
                  <span className="view-details">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim History */}
      <div className="claim-history-section">
        <h3>Claim History</h3>
        {claimHistory.length === 0 ? (
          <div className="empty-state">
            <p>No claims processed yet.</p>
          </div>
        ) : (
          <div className="claim-history-list">
            {claimHistory.map((claim, index) => (
              <div key={`${claim.policyId}-${claim.timestamp}-${index}`} className="claim-item">
                <div className="claim-info">
                  <span className="claim-policy-id">Policy #{claim.policyId}</span>
                  <span className="claim-date">{formatDate(claim.timestamp)}</span>
                </div>
                <div className="claim-amount">
                  {web3 && formatCurrency(web3.utils.fromWei(claim.payoutAmount.toString(), 'ether'))} QIE
                </div>
                <a
                  href={`${process.env.REACT_APP_NETWORK === 'mainnet' ? 'https://explorer.qie.network' : 'https://explorer-testnet.qie.network'}/tx/${claim.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="claim-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Transaction →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Detail Modal */}
      {selectedPolicy && renderPolicyDetail()}
    </div>
  );
};

export default Dashboard;
