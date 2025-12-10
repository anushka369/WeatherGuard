import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import Web3 from 'web3';
import { QIE_NETWORK_CONFIG } from '../utils/constants';

/**
 * Web3 Context for managing wallet connection and blockchain state
 */

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  chainId: string | null;
  balance: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  web3: Web3 | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToQIENetwork: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);

  // Determine which network to use based on environment
  const targetNetwork = process.env.REACT_APP_NETWORK === 'mainnet' 
    ? QIE_NETWORK_CONFIG.mainnet 
    : QIE_NETWORK_CONFIG.testnet;

  // Convert chainId to hex format for comparison
  const targetChainIdHex = `0x${parseInt(targetNetwork.chainId).toString(16)}`;
  const isCorrectNetwork = chainId === targetChainIdHex || chainId === targetNetwork.chainId;

  /**
   * Fetch account balance
   */
  const fetchBalance = useCallback(async (web3Instance: Web3, accountAddress: string) => {
    try {
      const balanceWei = await web3Instance.eth.getBalance(accountAddress);
      const balanceEth = web3Instance.utils.fromWei(balanceWei, 'ether');
      setBalance(balanceEth);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('0');
    }
  }, []);

  /**
   * Handle account changes
   */
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected wallet
      disconnect();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      setIsConnected(true);
      setError(null);
      
      // Fetch balance for new account
      if (web3) {
        fetchBalance(web3, accounts[0]);
      }
    }
  }, [account, web3, fetchBalance]);

  /**
   * Handle chain changes
   */
  const handleChainChanged = useCallback((newChainId: string) => {
    setChainId(newChainId);
    // Reload to avoid state inconsistencies
    window.location.reload();
  }, []);

  /**
   * Connect wallet (MetaMask)
   */
  const connect = async () => {
    try {
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to use this dApp.');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        setError('No accounts found. Please unlock your wallet.');
        return;
      }

      // Initialize Web3
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);

      // Get chain ID
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setIsConnected(true);

      // Fetch balance
      await fetchBalance(web3Instance, accounts[0]);

      // Check if on correct network
      if (currentChainId !== targetChainIdHex && currentChainId !== targetNetwork.chainId) {
        setError(`Please switch to ${targetNetwork.name}`);
      }

    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      
      if (err.code === 4001) {
        setError('Connection request rejected. Please approve the connection request.');
      } else if (err.code === -32002) {
        setError('Connection request already pending. Please check MetaMask.');
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
      
      setIsConnected(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setIsConnected(false);
    setError(null);
    setWeb3(null);
  };

  /**
   * Switch to QIE network
   */
  const switchToQIENetwork = async () => {
    try {
      setError(null);

      if (!window.ethereum) {
        setError('MetaMask is not installed.');
        return;
      }

      // Try to switch to the network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: targetChainIdHex,
                  chainName: targetNetwork.name,
                  nativeCurrency: {
                    name: 'QIE',
                    symbol: 'QIE',
                    decimals: 18,
                  },
                  rpcUrls: [targetNetwork.rpcUrl],
                  blockExplorerUrls: [targetNetwork.explorerUrl],
                },
              ],
            });
          } catch (addError: any) {
            console.error('Error adding network:', addError);
            setError('Failed to add QIE network to MetaMask.');
          }
        } else {
          console.error('Error switching network:', switchError);
          setError('Failed to switch to QIE network.');
        }
      }
    } catch (err) {
      console.error('Error in switchToQIENetwork:', err);
      setError('Failed to switch network. Please try manually in MetaMask.');
    }
  };

  /**
   * Check for existing connection on mount
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });

          if (accounts.length > 0) {
            const web3Instance = new Web3(window.ethereum);
            setWeb3(web3Instance);

            const currentChainId = await window.ethereum.request({ 
              method: 'eth_chainId' 
            });

            setAccount(accounts[0]);
            setChainId(currentChainId);
            setIsConnected(true);

            // Fetch balance
            await fetchBalance(web3Instance, accounts[0]);

            // Check network
            if (currentChainId !== targetChainIdHex && currentChainId !== targetNetwork.chainId) {
              setError(`Please switch to ${targetNetwork.name}`);
            }
          }
        } catch (err) {
          console.error('Error checking connection:', err);
        }
      }
    };

    checkConnection();
  }, [targetChainIdHex, targetNetwork, fetchBalance]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged]);

  /**
   * Update balance periodically
   */
  useEffect(() => {
    if (isConnected && account && web3) {
      // Update balance every 10 seconds
      const interval = setInterval(() => {
        fetchBalance(web3, account);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isConnected, account, web3, fetchBalance]);

  const value: Web3ContextType = {
    account,
    chainId,
    balance,
    isConnected,
    isCorrectNetwork,
    error,
    web3,
    connect,
    disconnect,
    switchToQIENetwork,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
