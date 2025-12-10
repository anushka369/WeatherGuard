import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import { formatDate, formatCurrency } from '../utils/formatters';
import './AdminPanel.css';

// Import contract ABIs
import PolicyManagerABI from '../contracts/PolicyManager.json';
import LiquidityPoolABI from '../contracts/LiquidityPool.json';
import OracleConsumerABI from '../contracts/OracleConsumer.json';

interface PoolStats {
  totalValue: bigint;
  totalLiability: bigint;
  utilizationRate: number;
  totalPremiums: bigint;
  totalPayouts: bigint;
}

interface ConfigEvent {
  type: string;
  details: string;
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
}

enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * AdminPanel Component
 * Administrative interface for system configuration and monitoring
 */
const AdminPanel: React.FC = () => {
  const { account, web3, isConnected, isCorrectNetwork } = useWeb3();

  // Access control
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);

  // System state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [policyCount, setPolicyCount] = useState<number>(0);

  // Configuration state
  const [oracleAddress, setOracleAddress] = useState<string>('');
  const [newOracleAddress, setNewOracleAddress] = useState<string>('');

  const [minCoveragePeriod, setMinCoveragePeriod] = useState<string>('');
  const [maxCoveragePeriod, setMaxCoveragePeriod] = useState<string>('');
  const [minPayoutAmount, setMinPayoutAmount] = useState<string>('');
  const [maxPayoutAmount, setMaxPayoutAmount] = useState<string>('');

  const [yieldPercentage, setYieldPercentage] = useState<string>('');
  const [newYieldPercentage, setNewYieldPercentage] = useState<string>('');

  // Configuration history
  const [configHistory, setConfigHistory] = useState<ConfigEvent[]>([]);

  // Transaction status
  const [txStatus, setTxStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [txMessage, setTxMessage] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Check if connected account is admin
   */
  const checkAdminAccess = useCallback(async () => {
    if (!web3 || !account || !isConnected || !isCorrectNetwork) {
      setIsAdmin(false);
      setCheckingAccess(false);
      return;
    }

    try {
      const policyManagerContract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const owner = await policyManagerContract.methods.owner().call() as string;
      setIsAdmin(owner.toLowerCase() === account.toLowerCase());
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAccess(false);
    }
  }, [web3, account, isConnected, isCorrectNetwork]);

  /**
   * Fetch system statistics
   */
  const fetchSystemStats = useCallback(async () => {
    if (!web3 || !isAdmin) return;

    try {
      const policyManagerContract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const liquidityPoolContract = new web3.eth.Contract(
        LiquidityPoolABI.abi as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      // Get pause status
      const paused = await policyManagerContract.methods.paused().call() as boolean;
      setIsPaused(paused);

      // Get policy count
      const count = await policyManagerContract.methods.policyCounter().call();
      setPolicyCount(Number(count));

      // Get pool stats
      const stats = await liquidityPoolContract.methods.getPoolStats().call() as any;
      setPoolStats({
        totalValue: BigInt(stats.totalValue),
        totalLiability: BigInt(stats.liability),
        utilizationRate: Number(stats.utilizationRate),
        totalPremiums: BigInt(stats.totalPremiums),
        totalPayouts: BigInt(stats.totalPayouts),
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  }, [web3, isAdmin]);

  /**
   * Fetch current configuration
   */
  const fetchConfiguration = useCallback(async () => {
    if (!web3 || !isAdmin) return;

    try {
      const policyManagerContract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const oracleConsumerContract = new web3.eth.Contract(
        OracleConsumerABI.abi as any,
        CONTRACT_ADDRESSES.oracleConsumer
      );

      const liquidityPoolContract = new web3.eth.Contract(
        LiquidityPoolABI.abi as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      // Get oracle address
      const oracle = await oracleConsumerContract.methods.oracleAddress().call() as string;
      setOracleAddress(oracle);
      setNewOracleAddress(oracle);

      // Get parameter limits
      const minCoverage = await policyManagerContract.methods.minCoveragePeriod().call() as bigint;
      const maxCoverage = await policyManagerContract.methods.maxCoveragePeriod().call() as bigint;
      const minPayout = await policyManagerContract.methods.minPayoutAmount().call() as bigint;
      const maxPayout = await policyManagerContract.methods.maxPayoutAmount().call() as bigint;

      setMinCoveragePeriod((Number(minCoverage) / 86400).toString()); // Convert to days
      setMaxCoveragePeriod((Number(maxCoverage) / 86400).toString());
      setMinPayoutAmount(web3.utils.fromWei(minPayout.toString(), 'ether'));
      setMaxPayoutAmount(web3.utils.fromWei(maxPayout.toString(), 'ether'));

      // Get yield percentage
      const yield_pct = await liquidityPoolContract.methods.yieldPercentage().call() as bigint;
      const yieldPct = (Number(yield_pct) / 100).toString(); // Convert from basis points to percentage
      setYieldPercentage(yieldPct);
      setNewYieldPercentage(yieldPct);
    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  }, [web3, isAdmin]);

  /**
   * Fetch configuration change history
   */
  const fetchConfigHistory = useCallback(async () => {
    if (!web3 || !isAdmin) return;

    try {
      const policyManagerContract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const oracleConsumerContract = new web3.eth.Contract(
        OracleConsumerABI.abi as any,
        CONTRACT_ADDRESSES.oracleConsumer
      );

      const liquidityPoolContract = new web3.eth.Contract(
        LiquidityPoolABI.abi as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      const events: ConfigEvent[] = [];

      // Get ParameterLimitsUpdated events
      const paramEvents = await policyManagerContract.getPastEvents('ParameterLimitsUpdated', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      paramEvents.forEach((event: any) => {
        events.push({
          type: 'Parameter Limits Updated',
          details: `Min Coverage: ${Number(event.returnValues.minCoveragePeriod) / 86400} days, Max Coverage: ${Number(event.returnValues.maxCoveragePeriod) / 86400} days`,
          timestamp: 0, // Will be filled from block
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      // Get YieldPercentageUpdated events
      const yieldEvents = await liquidityPoolContract.getPastEvents('YieldPercentageUpdated', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      yieldEvents.forEach((event: any) => {
        events.push({
          type: 'Yield Percentage Updated',
          details: `Old: ${Number(event.returnValues.oldPercentage) / 100}%, New: ${Number(event.returnValues.newPercentage) / 100}%`,
          timestamp: 0,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      // Get OracleAddressUpdated events
      const oracleEvents = await oracleConsumerContract.getPastEvents('OracleAddressUpdated', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      oracleEvents.forEach((event: any) => {
        events.push({
          type: 'Oracle Address Updated',
          details: `New Oracle: ${event.returnValues.newOracle}`,
          timestamp: 0,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      // Get Paused/Unpaused events
      const pausedEvents = await policyManagerContract.getPastEvents('Paused', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      pausedEvents.forEach((event: any) => {
        events.push({
          type: 'System Paused',
          details: 'Emergency pause activated',
          timestamp: 0,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      const unpausedEvents = await policyManagerContract.getPastEvents('Unpaused', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      unpausedEvents.forEach((event: any) => {
        events.push({
          type: 'System Unpaused',
          details: 'System resumed normal operation',
          timestamp: 0,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });

      // Fetch timestamps from blocks
      const eventsWithTimestamps = await Promise.all(
        events.map(async (event) => {
          const block = await web3.eth.getBlock(event.blockNumber);
          return {
            ...event,
            timestamp: Number(block.timestamp),
          };
        })
      );

      // Sort by timestamp descending
      eventsWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);

      setConfigHistory(eventsWithTimestamps);
    } catch (error) {
      console.error('Error fetching config history:', error);
    }
  }, [web3, isAdmin]);

  /**
   * Update oracle address
   */
  const handleUpdateOracleAddress = async () => {
    if (!web3 || !account) return;

    // Validate address
    if (!web3.utils.isAddress(newOracleAddress)) {
      setErrors({ oracle: 'Invalid Ethereum address' });
      return;
    }

    try {
      setTxStatus(TransactionStatus.PENDING);
      setTxMessage('Updating oracle address...');
      setErrors({});

      const contract = new web3.eth.Contract(
        OracleConsumerABI.abi as any,
        CONTRACT_ADDRESSES.oracleConsumer
      );

      const tx = await contract.methods.setOracleAddress(newOracleAddress).send({
        from: account,
      });

      setTxStatus(TransactionStatus.SUCCESS);
      setTxMessage('Oracle address updated successfully!');
      setTxHash(tx.transactionHash);
      setOracleAddress(newOracleAddress);

      // Refresh data
      setTimeout(() => {
        fetchConfiguration();
        fetchConfigHistory();
        setTxStatus(TransactionStatus.IDLE);
        setTxMessage('');
        setTxHash('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating oracle address:', error);
      setTxStatus(TransactionStatus.ERROR);
      setTxMessage(error.message || 'Failed to update oracle address');
    }
  };

  /**
   * Update parameter limits
   */
  const handleUpdateParameterLimits = async () => {
    if (!web3 || !account) return;

    // Validate inputs
    const newErrors: Record<string, string> = {};
    
    if (!minCoveragePeriod || parseFloat(minCoveragePeriod) <= 0) {
      newErrors.minCoverage = 'Must be greater than 0';
    }
    if (!maxCoveragePeriod || parseFloat(maxCoveragePeriod) <= 0) {
      newErrors.maxCoverage = 'Must be greater than 0';
    }
    if (parseFloat(minCoveragePeriod) >= parseFloat(maxCoveragePeriod)) {
      newErrors.minCoverage = 'Must be less than max coverage';
    }
    if (!minPayoutAmount || parseFloat(minPayoutAmount) <= 0) {
      newErrors.minPayout = 'Must be greater than 0';
    }
    if (!maxPayoutAmount || parseFloat(maxPayoutAmount) <= 0) {
      newErrors.maxPayout = 'Must be greater than 0';
    }
    if (parseFloat(minPayoutAmount) >= parseFloat(maxPayoutAmount)) {
      newErrors.minPayout = 'Must be less than max payout';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setTxStatus(TransactionStatus.PENDING);
      setTxMessage('Updating parameter limits...');
      setErrors({});

      const contract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const minCoverageSeconds = Math.floor(parseFloat(minCoveragePeriod) * 86400);
      const maxCoverageSeconds = Math.floor(parseFloat(maxCoveragePeriod) * 86400);
      const minPayoutWei = web3.utils.toWei(minPayoutAmount, 'ether');
      const maxPayoutWei = web3.utils.toWei(maxPayoutAmount, 'ether');

      const tx = await contract.methods
        .setParameterLimits(
          minCoverageSeconds,
          maxCoverageSeconds,
          minPayoutWei,
          maxPayoutWei
        )
        .send({ from: account });

      setTxStatus(TransactionStatus.SUCCESS);
      setTxMessage('Parameter limits updated successfully!');
      setTxHash(tx.transactionHash);

      // Refresh data
      setTimeout(() => {
        fetchConfiguration();
        fetchConfigHistory();
        setTxStatus(TransactionStatus.IDLE);
        setTxMessage('');
        setTxHash('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating parameter limits:', error);
      setTxStatus(TransactionStatus.ERROR);
      setTxMessage(error.message || 'Failed to update parameter limits');
    }
  };

  /**
   * Update yield percentage
   */
  const handleUpdateYieldPercentage = async () => {
    if (!web3 || !account) return;

    // Validate input
    const yieldNum = parseFloat(newYieldPercentage);
    if (isNaN(yieldNum) || yieldNum < 0 || yieldNum > 100) {
      setErrors({ yield: 'Must be between 0 and 100' });
      return;
    }

    try {
      setTxStatus(TransactionStatus.PENDING);
      setTxMessage('Updating yield percentage...');
      setErrors({});

      const contract = new web3.eth.Contract(
        LiquidityPoolABI.abi as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      // Convert percentage to basis points
      const basisPoints = Math.floor(yieldNum * 100);

      const tx = await contract.methods.setYieldPercentage(basisPoints).send({
        from: account,
      });

      setTxStatus(TransactionStatus.SUCCESS);
      setTxMessage('Yield percentage updated successfully!');
      setTxHash(tx.transactionHash);
      setYieldPercentage(newYieldPercentage);

      // Refresh data
      setTimeout(() => {
        fetchConfiguration();
        fetchConfigHistory();
        setTxStatus(TransactionStatus.IDLE);
        setTxMessage('');
        setTxHash('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating yield percentage:', error);
      setTxStatus(TransactionStatus.ERROR);
      setTxMessage(error.message || 'Failed to update yield percentage');
    }
  };

  /**
   * Toggle system pause
   */
  const handleTogglePause = async () => {
    if (!web3 || !account) return;

    try {
      setTxStatus(TransactionStatus.PENDING);
      setTxMessage(isPaused ? 'Unpausing system...' : 'Pausing system...');

      const contract = new web3.eth.Contract(
        PolicyManagerABI.abi as any,
        CONTRACT_ADDRESSES.policyManager
      );

      const tx = isPaused
        ? await contract.methods.unpause().send({ from: account })
        : await contract.methods.pause().send({ from: account });

      setTxStatus(TransactionStatus.SUCCESS);
      setTxMessage(isPaused ? 'System unpaused successfully!' : 'System paused successfully!');
      setTxHash(tx.transactionHash);
      setIsPaused(!isPaused);

      // Refresh data
      setTimeout(() => {
        fetchSystemStats();
        fetchConfigHistory();
        setTxStatus(TransactionStatus.IDLE);
        setTxMessage('');
        setTxHash('');
      }, 3000);
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      setTxStatus(TransactionStatus.ERROR);
      setTxMessage(error.message || 'Failed to toggle pause state');
    }
  };

  /**
   * Initial data fetch
   */
  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (isAdmin) {
      fetchSystemStats();
      fetchConfiguration();
      fetchConfigHistory();
    }
  }, [isAdmin, fetchSystemStats, fetchConfiguration, fetchConfigHistory]);

  // Render loading state
  if (checkingAccess) {
    return (
      <div className="admin-panel">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Render access denied
  if (!isConnected || !isCorrectNetwork || !isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <div className="access-denied-icon">🔒</div>
          <h3>Access Denied</h3>
          <p>
            {!isConnected
              ? 'Please connect your wallet to access the admin panel.'
              : !isCorrectNetwork
              ? 'Please switch to the QIE network.'
              : 'You do not have administrator privileges.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-panel-header">
        <h2>Admin Panel</h2>
        <p>System configuration and monitoring</p>
      </div>

      {/* Transaction Status */}
      {txStatus !== TransactionStatus.IDLE && (
        <div className={`status-message ${txStatus}`}>
          {txStatus === TransactionStatus.PENDING && <div className="spinner"></div>}
          <div>
            <div>{txMessage}</div>
            {txHash && (
              <a
                href={`${process.env.REACT_APP_NETWORK === 'mainnet' ? 'https://explorer.qie.network' : 'https://explorer-testnet.qie.network'}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="config-event-tx"
              >
                View Transaction →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="admin-section">
        <h3>System Analytics</h3>
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-label">Total Pool Value</div>
            <div className="stat-value">
              {poolStats && web3
                ? formatCurrency(web3.utils.fromWei(poolStats.totalValue.toString(), 'ether'))
                : '0'}{' '}
              QIE
            </div>
            <div className="stat-subtext">Available liquidity</div>
          </div>

          <div className="stat-card secondary">
            <div className="stat-label">Total Policies</div>
            <div className="stat-value">{policyCount}</div>
            <div className="stat-subtext">Created policies</div>
          </div>

          <div className="stat-card tertiary">
            <div className="stat-label">Pool Utilization</div>
            <div className="stat-value">
              {poolStats ? (poolStats.utilizationRate / 100).toFixed(2) : '0'}%
            </div>
            <div className="stat-subtext">
              {poolStats && web3
                ? `${formatCurrency(web3.utils.fromWei(poolStats.totalLiability.toString(), 'ether'))} QIE liability`
                : 'No liability'}
            </div>
          </div>

          <div className="stat-card quaternary">
            <div className="stat-label">Net Income</div>
            <div className="stat-value">
              {poolStats && web3
                ? formatCurrency(
                    web3.utils.fromWei(
                      (poolStats.totalPremiums - poolStats.totalPayouts).toString(),
                      'ether'
                    )
                  )
                : '0'}{' '}
              QIE
            </div>
            <div className="stat-subtext">Premiums - Payouts</div>
          </div>
        </div>
      </div>

      {/* Emergency Controls */}
      <div className="admin-section">
        <h3>Emergency Controls</h3>
        <div className={`pause-status ${isPaused ? 'paused' : 'active'}`}>
          <span className="pause-indicator"></span>
          System Status: {isPaused ? 'PAUSED' : 'ACTIVE'}
        </div>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          {isPaused
            ? 'New policy creation is disabled. Existing claims can still be processed.'
            : 'System is operating normally. All functions are available.'}
        </p>
        <div className="emergency-controls">
          <button
            className={`admin-button ${isPaused ? 'success' : 'danger'}`}
            onClick={handleTogglePause}
            disabled={txStatus === TransactionStatus.PENDING}
          >
            {isPaused ? '▶ Unpause System' : '⏸ Pause System'}
          </button>
        </div>
      </div>

      {/* Oracle Configuration */}
      <div className="admin-section">
        <h3>Oracle Configuration</h3>
        <div className="config-form">
          <div className="form-group">
            <label>Current Oracle Address</label>
            <input type="text" value={oracleAddress} disabled />
          </div>
          <div className="form-group">
            <label>New Oracle Address</label>
            <input
              type="text"
              value={newOracleAddress}
              onChange={(e) => setNewOracleAddress(e.target.value)}
              placeholder="0x..."
              className={errors.oracle ? 'error' : ''}
            />
            {errors.oracle && <span className="error-message">{errors.oracle}</span>}
          </div>
          <button
            className="admin-button primary"
            onClick={handleUpdateOracleAddress}
            disabled={
              txStatus === TransactionStatus.PENDING ||
              newOracleAddress === oracleAddress ||
              !newOracleAddress
            }
          >
            Update Oracle Address
          </button>
        </div>
      </div>

      {/* Policy Parameter Limits */}
      <div className="admin-section">
        <h3>Policy Parameter Limits</h3>
        <div className="config-form">
          <div className="form-row">
            <div className="form-group">
              <label>Min Coverage Period (days)</label>
              <input
                type="number"
                value={minCoveragePeriod}
                onChange={(e) => setMinCoveragePeriod(e.target.value)}
                min="1"
                step="1"
                className={errors.minCoverage ? 'error' : ''}
              />
              {errors.minCoverage && <span className="error-message">{errors.minCoverage}</span>}
            </div>
            <div className="form-group">
              <label>Max Coverage Period (days)</label>
              <input
                type="number"
                value={maxCoveragePeriod}
                onChange={(e) => setMaxCoveragePeriod(e.target.value)}
                min="1"
                step="1"
                className={errors.maxCoverage ? 'error' : ''}
              />
              {errors.maxCoverage && <span className="error-message">{errors.maxCoverage}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Min Payout Amount (QIE)</label>
              <input
                type="number"
                value={minPayoutAmount}
                onChange={(e) => setMinPayoutAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className={errors.minPayout ? 'error' : ''}
              />
              {errors.minPayout && <span className="error-message">{errors.minPayout}</span>}
            </div>
            <div className="form-group">
              <label>Max Payout Amount (QIE)</label>
              <input
                type="number"
                value={maxPayoutAmount}
                onChange={(e) => setMaxPayoutAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className={errors.maxPayout ? 'error' : ''}
              />
              {errors.maxPayout && <span className="error-message">{errors.maxPayout}</span>}
            </div>
          </div>
          <button
            className="admin-button primary"
            onClick={handleUpdateParameterLimits}
            disabled={txStatus === TransactionStatus.PENDING}
          >
            Update Parameter Limits
          </button>
        </div>
      </div>

      {/* Yield Percentage */}
      <div className="admin-section">
        <h3>Liquidity Provider Yield</h3>
        <div className="config-form">
          <div className="form-group">
            <label>Current Yield Percentage</label>
            <input type="text" value={`${yieldPercentage}%`} disabled />
            <span className="help-text">
              Percentage of premiums distributed to liquidity providers
            </span>
          </div>
          <div className="form-group">
            <label>New Yield Percentage (%)</label>
            <input
              type="number"
              value={newYieldPercentage}
              onChange={(e) => setNewYieldPercentage(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              className={errors.yield ? 'error' : ''}
            />
            {errors.yield && <span className="error-message">{errors.yield}</span>}
            <span className="help-text">Value between 0 and 100</span>
          </div>
          <button
            className="admin-button primary"
            onClick={handleUpdateYieldPercentage}
            disabled={
              txStatus === TransactionStatus.PENDING ||
              newYieldPercentage === yieldPercentage ||
              !newYieldPercentage
            }
          >
            Update Yield Percentage
          </button>
        </div>
      </div>

      {/* Configuration History */}
      <div className="admin-section">
        <h3>Configuration Change History</h3>
        <div className="config-history">
          {configHistory.length === 0 ? (
            <div className="empty-history">No configuration changes recorded</div>
          ) : (
            configHistory.map((event, index) => (
              <div key={`${event.transactionHash}-${index}`} className="config-event">
                <div className="config-event-header">
                  <span className="config-event-type">{event.type}</span>
                  <span className="config-event-time">{formatDate(event.timestamp)}</span>
                </div>
                <div className="config-event-details">{event.details}</div>
                <a
                  href={`${process.env.REACT_APP_NETWORK === 'mainnet' ? 'https://explorer.qie.network' : 'https://explorer-testnet.qie.network'}/tx/${event.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="config-event-tx"
                >
                  View Transaction →
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
