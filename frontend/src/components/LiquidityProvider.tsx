import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { CONTRACT_ADDRESSES } from '../utils/constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import './LiquidityProvider.css';

interface PoolStats {
  totalValue: bigint;
  totalLiability: bigint;
  utilizationRate: number;
  totalPremiums: bigint;
  totalPayouts: bigint;
}

interface ProviderPosition {
  lpTokens: bigint;
  poolShare: number;
  accumulatedYield: bigint;
  depositTimestamp: number;
}

interface RiskPolicy {
  policyId: number;
  payoutAmount: bigint;
  triggerValue: number;
  currentValue: number;
  proximity: number;
}

enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * LiquidityProvider Component
 * Interface for liquidity providers to deposit/withdraw funds and view pool statistics
 */
const LiquidityProvider: React.FC = () => {
  const { account, web3, isConnected, isCorrectNetwork } = useWeb3();

  // State
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [position, setPosition] = useState<ProviderPosition | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [projectedYield, setProjectedYield] = useState<string>('0');
  const [riskPolicies, setRiskPolicies] = useState<RiskPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [transactionError, setTransactionError] = useState<string>('');

  /**
   * Fetch pool statistics
   */
  const fetchPoolStats = useCallback(async () => {
    if (!web3 || !isConnected || !isCorrectNetwork) return;

    try {
      const liquidityPoolABI = [
        {
          "inputs": [],
          "name": "getPoolStats",
          "outputs": [
            {"name": "totalValue", "type": "uint256"},
            {"name": "liability", "type": "uint256"},
            {"name": "utilizationRate", "type": "uint256"},
            {"name": "totalPremiums", "type": "uint256"},
            {"name": "totalPayouts", "type": "uint256"}
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "totalLPTokens",
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "", "type": "address"}],
          "name": "lpTokenBalances",
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "", "type": "address"}],
          "name": "depositTimestamps",
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"name": "provider", "type": "address"}],
          "name": "calculateYield",
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ];

      const poolContract = new web3.eth.Contract(
        liquidityPoolABI as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      const stats: any = await poolContract.methods.getPoolStats().call();
      
      setPoolStats({
        totalValue: BigInt(stats.totalValue || stats[0] || 0),
        totalLiability: BigInt(stats.liability || stats[1] || 0),
        utilizationRate: Number(stats.utilizationRate || stats[2] || 0),
        totalPremiums: BigInt(stats.totalPremiums || stats[3] || 0),
        totalPayouts: BigInt(stats.totalPayouts || stats[4] || 0),
      });

      // Fetch user position if connected
      if (account) {
        const lpTokens: any = await poolContract.methods.lpTokenBalances(account).call();
        const totalLPTokens: any = await poolContract.methods.totalLPTokens().call();
        const depositTimestamp: any = await poolContract.methods.depositTimestamps(account).call();
        const accumulatedYield: any = await poolContract.methods.calculateYield(account).call();

        const poolShare = Number(totalLPTokens) > 0 
          ? (Number(lpTokens) / Number(totalLPTokens)) * 100 
          : 0;

        setPosition({
          lpTokens: BigInt(lpTokens || 0),
          poolShare,
          accumulatedYield: BigInt(accumulatedYield || 0),
          depositTimestamp: Number(depositTimestamp || 0),
        });
      }
    } catch (err: any) {
      console.error('Error fetching pool stats:', err);
      setError('Failed to load pool statistics');
    }
  }, [web3, account, isConnected, isCorrectNetwork]);

  /**
   * Fetch policies near trigger conditions
   */
  const fetchRiskPolicies = useCallback(async () => {
    if (!web3 || !isConnected || !isCorrectNetwork) return;

    try {
      // For demo purposes, we'll just show count of active policies
      // In production, you'd need oracle data to calculate proximity
      const riskPoliciesData: RiskPolicy[] = [];
      
      // Sample data for demonstration
      // In production, this would come from oracle data comparison
      setRiskPolicies(riskPoliciesData);
    } catch (err: any) {
      console.error('Error fetching risk policies:', err);
    }
  }, [web3, isConnected, isCorrectNetwork]);

  /**
   * Calculate projected yield based on deposit amount
   */
  useEffect(() => {
    if (!depositAmount || !poolStats || !web3) {
      setProjectedYield('0');
      return;
    }

    try {
      const depositWei = web3.utils.toWei(depositAmount, 'ether');
      const depositNum = BigInt(depositWei);
      
      // Estimate annual yield based on current pool performance
      // Simplified calculation: (premiums - payouts) * user_share * yield_percentage
      const netIncome = poolStats.totalPremiums > poolStats.totalPayouts
        ? poolStats.totalPremiums - poolStats.totalPayouts
        : BigInt(0);
      
      const newTotalValue = poolStats.totalValue + depositNum;
      const userShare = Number(depositNum) / Number(newTotalValue);
      
      // Assume 70% yield percentage (7000 basis points)
      const estimatedYield = Number(netIncome) * userShare * 0.7;
      
      setProjectedYield(web3.utils.fromWei(estimatedYield.toString(), 'ether'));
    } catch (err) {
      setProjectedYield('0');
    }
  }, [depositAmount, poolStats, web3]);

  /**
   * Handle deposit transaction
   */
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !isCorrectNetwork || !web3 || !account) {
      setError('Please connect your wallet to the QIE network');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    try {
      setTransactionStatus(TransactionStatus.PENDING);
      setTransactionError('');
      setError(null);

      const liquidityPoolABI = [
        {
          "inputs": [],
          "name": "deposit",
          "outputs": [{"name": "lpTokens", "type": "uint256"}],
          "stateMutability": "payable",
          "type": "function"
        }
      ];

      const poolContract = new web3.eth.Contract(
        liquidityPoolABI as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      const depositWei = web3.utils.toWei(depositAmount, 'ether');

      await poolContract.methods.deposit().send({
        from: account,
        value: depositWei,
      });

      setTransactionStatus(TransactionStatus.SUCCESS);
      setDepositAmount('');

      // Refresh data
      setTimeout(() => {
        fetchPoolStats();
        setTransactionStatus(TransactionStatus.IDLE);
      }, 2000);
    } catch (err: any) {
      console.error('Deposit error:', err);
      setTransactionStatus(TransactionStatus.ERROR);

      if (err.code === 4001) {
        setTransactionError('Transaction rejected by user');
      } else if (err.message) {
        setTransactionError(err.message);
      } else {
        setTransactionError('Deposit failed. Please try again.');
      }
    }
  };

  /**
   * Handle withdrawal transaction
   */
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !isCorrectNetwork || !web3 || !account || !position) {
      setError('Please connect your wallet to the QIE network');
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    try {
      setTransactionStatus(TransactionStatus.PENDING);
      setTransactionError('');
      setError(null);

      const liquidityPoolABI = [
        {
          "inputs": [{"name": "lpTokens", "type": "uint256"}],
          "name": "withdraw",
          "outputs": [{"name": "amount", "type": "uint256"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

      const poolContract = new web3.eth.Contract(
        liquidityPoolABI as any,
        CONTRACT_ADDRESSES.liquidityPool
      );

      const withdrawWei = web3.utils.toWei(withdrawAmount, 'ether');

      await poolContract.methods.withdraw(withdrawWei).send({
        from: account,
      });

      setTransactionStatus(TransactionStatus.SUCCESS);
      setWithdrawAmount('');

      // Refresh data
      setTimeout(() => {
        fetchPoolStats();
        setTransactionStatus(TransactionStatus.IDLE);
      }, 2000);
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setTransactionStatus(TransactionStatus.ERROR);

      if (err.code === 4001) {
        setTransactionError('Transaction rejected by user');
      } else if (err.message?.includes('InsufficientLPTokens')) {
        setTransactionError('Insufficient LP tokens');
      } else if (err.message?.includes('InsufficientLiquidity')) {
        setTransactionError('Insufficient liquidity in pool');
      } else if (err.message) {
        setTransactionError(err.message);
      } else {
        setTransactionError('Withdrawal failed. Please try again.');
      }
    }
  };

  /**
   * Set max deposit amount (user's balance)
   */
  const setMaxDeposit = () => {
    if (web3 && account) {
      web3.eth.getBalance(account).then((balance) => {
        const balanceEth = web3.utils.fromWei(balance, 'ether');
        // Leave some for gas
        const maxDeposit = Math.max(0, parseFloat(balanceEth) - 0.01);
        setDepositAmount(maxDeposit.toFixed(4));
      });
    }
  };

  /**
   * Set max withdrawal amount (user's LP tokens)
   */
  const setMaxWithdraw = () => {
    if (position && web3) {
      const lpTokensEth = web3.utils.fromWei(position.lpTokens.toString(), 'ether');
      setWithdrawAmount(lpTokensEth);
    }
  };

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      setLoading(true);
      Promise.all([fetchPoolStats(), fetchRiskPolicies()])
        .finally(() => setLoading(false));
    }
  }, [isConnected, isCorrectNetwork, fetchPoolStats, fetchRiskPolicies]);

  /**
   * Set up periodic refresh for real-time updates
   * Event listeners are now handled centrally by EventHistoryContext
   */
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (isConnected && isCorrectNetwork) {
        fetchPoolStats();
        fetchRiskPolicies();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isConnected, isCorrectNetwork, fetchPoolStats, fetchRiskPolicies]);

  // Render loading state
  if (!isConnected) {
    return (
      <div className="liquidity-provider">
        <div className="liquidity-header">
          <h2>Liquidity Provider</h2>
        </div>
        <div className="empty-state">
          <p>Please connect your wallet to provide liquidity</p>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="liquidity-provider">
        <div className="liquidity-header">
          <h2>Liquidity Provider</h2>
        </div>
        <div className="empty-state">
          <p>Please switch to the QIE network</p>
        </div>
      </div>
    );
  }

  return (
    <div className="liquidity-provider">
      {/* Header */}
      <div className="liquidity-header">
        <h2>Liquidity Provider</h2>
        <p>Earn yields by providing liquidity to back insurance policies</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading pool data...</p>
        </div>
      ) : (
        <>
          {/* Pool Statistics */}
          <div className="pool-stats-section">
            <h3>Pool Statistics</h3>
            {poolStats && web3 && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Pool Value</div>
                  <div className="stat-value">
                    {formatCurrency(web3.utils.fromWei(poolStats.totalValue.toString(), 'ether'))} QIE
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Total Liability</div>
                  <div className="stat-value">
                    {formatCurrency(web3.utils.fromWei(poolStats.totalLiability.toString(), 'ether'))} QIE
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Utilization Rate</div>
                  <div className="stat-value">
                    {(poolStats.utilizationRate / 100).toFixed(2)}%
                  </div>
                  <div className="stat-subtext">
                    {poolStats.utilizationRate < 5000 ? 'Low Risk' : 
                     poolStats.utilizationRate < 8000 ? 'Medium Risk' : 'High Risk'}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Total Premiums Collected</div>
                  <div className="stat-value">
                    {formatCurrency(web3.utils.fromWei(poolStats.totalPremiums.toString(), 'ether'))} QIE
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Total Payouts Made</div>
                  <div className="stat-value">
                    {formatCurrency(web3.utils.fromWei(poolStats.totalPayouts.toString(), 'ether'))} QIE
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Available Liquidity</div>
                  <div className="stat-value">
                    {formatCurrency(
                      web3.utils.fromWei(
                        (poolStats.totalValue > poolStats.totalLiability 
                          ? poolStats.totalValue - poolStats.totalLiability 
                          : BigInt(0)
                        ).toString(), 
                        'ether'
                      )
                    )} QIE
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Position */}
          {position && web3 && (
            <div className="position-section">
              <h3>Your Position</h3>
              <div className="position-grid">
                <div className="position-card">
                  <div className="position-label">LP Tokens</div>
                  <div className="position-value">
                    {formatCurrency(web3.utils.fromWei(position.lpTokens.toString(), 'ether'))}
                  </div>
                </div>

                <div className="position-card">
                  <div className="position-label">Pool Share</div>
                  <div className="position-value">
                    {position.poolShare.toFixed(4)}%
                  </div>
                </div>

                <div className="position-card highlight">
                  <div className="position-label">Accumulated Yield</div>
                  <div className="position-value">
                    {formatCurrency(web3.utils.fromWei(position.accumulatedYield.toString(), 'ether'))} QIE
                  </div>
                </div>

                <div className="position-card">
                  <div className="position-label">Deposit Date</div>
                  <div className="position-value">
                    {position.depositTimestamp > 0 ? formatDate(position.depositTimestamp) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deposit and Withdrawal Forms */}
          <div className="forms-section">
            <div className="form-container">
              {/* Deposit Form */}
              <div className="form-card">
                <h3>Deposit Liquidity</h3>
                <form onSubmit={handleDeposit}>
                  <div className="form-group">
                    <label htmlFor="depositAmount">Amount (QIE)</label>
                    <div className="input-with-button">
                      <input
                        type="number"
                        id="depositAmount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.01"
                        min="0"
                      />
                      <button type="button" onClick={setMaxDeposit} className="max-button">
                        MAX
                      </button>
                    </div>
                  </div>

                  {depositAmount && poolStats && web3 && (
                    <div className="projection-display">
                      <div className="projection-item">
                        <span>Estimated LP Tokens:</span>
                        <span>
                          {formatCurrency(
                            (
                              parseFloat(depositAmount) * 
                              (Number(poolStats.totalValue) > 0 
                                ? 1 
                                : 1)
                            ).toString()
                          )}
                        </span>
                      </div>
                      <div className="projection-item">
                        <span>Projected Annual Yield:</span>
                        <span>{formatCurrency(projectedYield)} QIE</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="submit-button"
                    disabled={
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      transactionStatus === TransactionStatus.PENDING
                    }
                  >
                    {transactionStatus === TransactionStatus.PENDING
                      ? 'Processing...'
                      : 'Deposit'}
                  </button>
                </form>
              </div>

              {/* Withdrawal Form */}
              <div className="form-card">
                <h3>Withdraw Liquidity</h3>
                <form onSubmit={handleWithdraw}>
                  <div className="form-group">
                    <label htmlFor="withdrawAmount">LP Tokens</label>
                    <div className="input-with-button">
                      <input
                        type="number"
                        id="withdrawAmount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.01"
                        min="0"
                      />
                      <button type="button" onClick={setMaxWithdraw} className="max-button">
                        MAX
                      </button>
                    </div>
                    {position && web3 && (
                      <span className="help-text">
                        Available: {formatCurrency(web3.utils.fromWei(position.lpTokens.toString(), 'ether'))} LP Tokens
                      </span>
                    )}
                  </div>

                  {withdrawAmount && poolStats && web3 && (
                    <div className="projection-display">
                      <div className="projection-item">
                        <span>You will receive:</span>
                        <span>
                          {formatCurrency(withdrawAmount)} QIE (approx)
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="submit-button withdraw"
                    disabled={
                      !withdrawAmount ||
                      parseFloat(withdrawAmount) <= 0 ||
                      !position ||
                      transactionStatus === TransactionStatus.PENDING
                    }
                  >
                    {transactionStatus === TransactionStatus.PENDING
                      ? 'Processing...'
                      : 'Withdraw'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Transaction Status */}
          {transactionStatus === TransactionStatus.SUCCESS && (
            <div className="transaction-status success">
              <span>✓ Transaction successful!</span>
            </div>
          )}

          {transactionStatus === TransactionStatus.ERROR && (
            <div className="transaction-status error">
              <span>✗ Transaction failed</span>
              {transactionError && <p>{transactionError}</p>}
            </div>
          )}

          {/* Risk Indicators */}
          <div className="risk-section">
            <h3>Risk Indicators</h3>
            <div className="risk-info">
              <div className="risk-card">
                <div className="risk-label">Pool Utilization</div>
                <div className="risk-meter">
                  <div 
                    className="risk-meter-fill"
                    style={{
                      width: `${poolStats ? Math.min(poolStats.utilizationRate / 100, 100) : 0}%`,
                      backgroundColor: 
                        !poolStats || poolStats.utilizationRate < 5000 ? '#4caf50' :
                        poolStats.utilizationRate < 8000 ? '#ff9800' : '#f44336'
                    }}
                  ></div>
                </div>
                <div className="risk-description">
                  {!poolStats || poolStats.utilizationRate < 5000 
                    ? 'Low risk - Pool has ample liquidity'
                    : poolStats.utilizationRate < 8000
                    ? 'Medium risk - Monitor pool utilization'
                    : 'High risk - Pool is highly utilized'}
                </div>
              </div>

              <div className="risk-card">
                <div className="risk-label">Policies Near Trigger</div>
                <div className="risk-value">
                  {riskPolicies.length}
                </div>
                <div className="risk-description">
                  {riskPolicies.length === 0
                    ? 'No policies currently near trigger conditions'
                    : `${riskPolicies.length} policies approaching trigger conditions`}
                </div>
              </div>

              <div className="risk-card">
                <div className="risk-label">Net Pool Performance</div>
                <div className="risk-value">
                  {poolStats && web3 && (
                    <>
                      {poolStats.totalPremiums > poolStats.totalPayouts ? '+' : ''}
                      {formatCurrency(
                        web3.utils.fromWei(
                          (poolStats.totalPremiums - poolStats.totalPayouts).toString(),
                          'ether'
                        )
                      )} QIE
                    </>
                  )}
                </div>
                <div className="risk-description">
                  {poolStats && poolStats.totalPremiums > poolStats.totalPayouts
                    ? 'Pool is profitable'
                    : 'Pool has paid out more than collected'}
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Calculator */}
          <div className="calculator-section">
            <h3>Earnings Calculator</h3>
            <div className="calculator-info">
              <p>
                Liquidity providers earn 70% of premiums collected from policy purchases.
                Yields are distributed proportionally based on your share of the pool.
              </p>
              <div className="calculator-example">
                <h4>Example Calculation:</h4>
                <ul>
                  <li>If you deposit 10 QIE into a 100 QIE pool, you own 10% of the pool</li>
                  <li>If the pool collects 50 QIE in premiums and pays out 20 QIE in claims</li>
                  <li>Net income = 30 QIE</li>
                  <li>Your share = 10% × 30 QIE = 3 QIE</li>
                  <li>Your yield = 70% × 3 QIE = 2.1 QIE</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiquidityProvider;
