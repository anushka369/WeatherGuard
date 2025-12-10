/**
 * Application constants and configuration
 */

export const QIE_NETWORK_CONFIG = {
  testnet: {
    chainId: process.env.REACT_APP_QIE_CHAIN_ID_TESTNET || '12345',
    rpcUrl: process.env.REACT_APP_QIE_TESTNET_RPC_URL || 'https://rpc-testnet.qie.network',
    explorerUrl: 'https://explorer-testnet.qie.network',
    name: 'QIE Testnet',
  },
  mainnet: {
    chainId: process.env.REACT_APP_QIE_CHAIN_ID_MAINNET || '67890',
    rpcUrl: process.env.REACT_APP_QIE_MAINNET_RPC_URL || 'https://rpc.qie.network',
    explorerUrl: 'https://explorer.qie.network',
    name: 'QIE Mainnet',
  },
};

export const CONTRACT_ADDRESSES = {
  policyManager: process.env.REACT_APP_POLICY_MANAGER_ADDRESS || '',
  liquidityPool: process.env.REACT_APP_LIQUIDITY_POOL_ADDRESS || '',
  oracleConsumer: process.env.REACT_APP_ORACLE_CONSUMER_ADDRESS || '',
};

export const WEATHER_PARAMETER_LABELS = {
  0: 'Temperature',
  1: 'Rainfall',
  2: 'Wind Speed',
  3: 'Humidity',
};

export const COMPARISON_OPERATOR_LABELS = {
  0: 'Greater Than',
  1: 'Less Than',
  2: 'Equal To',
};

export const POLICY_STATUS_LABELS = {
  0: 'Active',
  1: 'Claimed',
  2: 'Expired',
  3: 'Cancelled',
};
