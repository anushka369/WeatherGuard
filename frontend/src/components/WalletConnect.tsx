import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './WalletConnect.css';

/**
 * WalletConnect Component
 * Handles wallet connection with MetaMask and network switching
 * Displays account information and balance
 */
const WalletConnect: React.FC = () => {
  const {
    account,
    balance,
    isConnected,
    isCorrectNetwork,
    error,
    connect,
    disconnect,
    switchToQIENetwork,
  } = useWeb3();

  /**
   * Format account address for display
   */
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  /**
   * Format balance for display
   */
  const formatBalance = (bal: string | null): string => {
    if (!bal) return '0.00';
    const numBalance = parseFloat(bal);
    return numBalance.toFixed(4);
  };

  /**
   * Handle connect button click
   */
  const handleConnect = async () => {
    await connect();
  };

  /**
   * Handle disconnect button click
   */
  const handleDisconnect = () => {
    disconnect();
  };

  /**
   * Handle network switch button click
   */
  const handleSwitchNetwork = async () => {
    await switchToQIENetwork();
  };

  return (
    <div className="wallet-connect">
      {error && (
        <div className="wallet-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          {!isCorrectNetwork && isConnected && (
            <button 
              className="switch-network-btn"
              onClick={handleSwitchNetwork}
            >
              Switch Network
            </button>
          )}
        </div>
      )}

      {!isConnected ? (
        <button 
          className="connect-btn"
          onClick={handleConnect}
        >
          <span className="wallet-icon">🦊</span>
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <div className="account-info">
            <div className="account-details">
              <div className="account-address">
                <span className="address-label">Account:</span>
                <span className="address-value" title={account || ''}>
                  {account ? formatAddress(account) : ''}
                </span>
              </div>
              <div className="account-balance">
                <span className="balance-label">Balance:</span>
                <span className="balance-value">
                  {formatBalance(balance)} QIE
                </span>
              </div>
            </div>
            
            {!isCorrectNetwork && (
              <button 
                className="network-warning-btn"
                onClick={handleSwitchNetwork}
              >
                Wrong Network
              </button>
            )}
            
            <button 
              className="disconnect-btn"
              onClick={handleDisconnect}
              title="Disconnect wallet"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {!window.ethereum && !isConnected && (
        <div className="install-metamask">
          <p>MetaMask not detected.</p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="install-link"
          >
            Install MetaMask
          </a>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
