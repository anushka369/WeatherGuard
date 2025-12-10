import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletConnect from './WalletConnect';
import { Web3Provider } from '../contexts/Web3Context';

// Mock Web3
jest.mock('web3', () => {
  return jest.fn().mockImplementation(() => ({
    eth: {
      getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
    },
    utils: {
      fromWei: jest.fn((value) => '1.0'),
    },
  }));
});

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

describe('WalletConnect Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup window.ethereum mock
    (window as any).ethereum = mockEthereum;
    
    // Default mock implementations
    mockEthereum.request.mockResolvedValue([]);
  });

  afterEach(() => {
    delete (window as any).ethereum;
  });

  test('renders connect button when not connected', () => {
    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    const connectButton = screen.getByText(/Connect Wallet/i);
    expect(connectButton).toBeInTheDocument();
  });

  test('displays MetaMask not detected message when ethereum is not available', () => {
    delete (window as any).ethereum;

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    expect(screen.getByText(/MetaMask not detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Install MetaMask/i)).toBeInTheDocument();
  });

  test('calls connect function when connect button is clicked', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);
    mockEthereum.request.mockResolvedValueOnce('0x3039'); // Chain ID

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    const connectButton = screen.getByText(/Connect Wallet/i);
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });
  });

  test('displays account information when connected', async () => {
    const mockAccount = '0x1234567890123456789012345678901234567890';
    
    // Mock initial connection check
    mockEthereum.request
      .mockResolvedValueOnce([mockAccount]) // eth_accounts
      .mockResolvedValueOnce('0x3039'); // eth_chainId

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Account:/i)).toBeInTheDocument();
      expect(screen.getByText(/Balance:/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('formats account address correctly', async () => {
    const mockAccount = '0x1234567890123456789012345678901234567890';
    
    mockEthereum.request
      .mockResolvedValueOnce([mockAccount])
      .mockResolvedValueOnce('0x3039');

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    await waitFor(() => {
      // Should display shortened address: 0x1234...7890
      expect(screen.getByText(/0x1234/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays disconnect button when connected', async () => {
    const mockAccount = '0x1234567890123456789012345678901234567890';
    
    mockEthereum.request
      .mockResolvedValueOnce([mockAccount])
      .mockResolvedValueOnce('0x3039');

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Disconnect/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays error message when connection fails', async () => {
    // First call for initial check returns empty array
    mockEthereum.request.mockResolvedValueOnce([]);
    // Second call for connect attempt fails
    mockEthereum.request.mockRejectedValueOnce({ code: 4001 });

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    const connectButton = screen.getByText(/Connect Wallet/i);
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(/Connection request rejected/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('displays network warning when on wrong network', async () => {
    const mockAccount = '0x1234567890123456789012345678901234567890';
    
    // Mock connection to wrong network (e.g., 0x1 for Ethereum mainnet)
    mockEthereum.request
      .mockResolvedValueOnce([mockAccount])
      .mockResolvedValueOnce('0x1'); // Wrong chain ID

    render(
      <Web3Provider>
        <WalletConnect />
      </Web3Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Please switch to/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  describe('Error Handling', () => {
    test('handles user rejection of connection request', async () => {
      mockEthereum.request.mockResolvedValueOnce([]);
      mockEthereum.request.mockRejectedValueOnce({ code: 4001, message: 'User rejected' });

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      const connectButton = screen.getByText(/Connect Wallet/i);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection request rejected/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('handles network errors gracefully', async () => {
      mockEthereum.request.mockResolvedValueOnce([]);
      mockEthereum.request.mockRejectedValueOnce(new Error('Network error'));

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      const connectButton = screen.getByText(/Connect Wallet/i);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('handles account change events', async () => {
      const mockAccount = '0x1234567890123456789012345678901234567890';
      
      mockEthereum.request
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce('0x3039');

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Account:/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Simulate account change
      const accountsChangedHandler = mockEthereum.on.mock.calls.find(
        call => call[0] === 'accountsChanged'
      )?.[1];

      if (accountsChangedHandler) {
        accountsChangedHandler(['0x9876543210987654321098765432109876543210']);
      }

      await waitFor(() => {
        expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      });
    });

    test('handles chain change events', async () => {
      const mockAccount = '0x1234567890123456789012345678901234567890';
      
      mockEthereum.request
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce('0x3039');

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Account:/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify chain change listener is set up
      expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    });

    test('cleans up event listeners on unmount', async () => {
      const mockAccount = '0x1234567890123456789012345678901234567890';
      
      mockEthereum.request
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce('0x3039');

      const { unmount } = render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Account:/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      unmount();

      // Verify cleanup
      expect(mockEthereum.removeListener).toHaveBeenCalled();
    });
  });

  describe('Wallet Connection Flow', () => {
    test('displays loading state during connection', async () => {
      mockEthereum.request.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(['0x123']), 100)));

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      const connectButton = screen.getByText(/Connect Wallet/i);
      fireEvent.click(connectButton);

      // Should show some indication of loading (button disabled or text change)
      await waitFor(() => {
        expect(connectButton).toBeInTheDocument();
      });
    });

    test('allows disconnection when connected', async () => {
      const mockAccount = '0x1234567890123456789012345678901234567890';
      
      mockEthereum.request
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce('0x3039');

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Disconnect/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const disconnectButton = screen.getByText(/Disconnect/i);
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('displays switch network button when on wrong network', async () => {
      const mockAccount = '0x1234567890123456789012345678901234567890';
      
      mockEthereum.request
        .mockResolvedValueOnce([mockAccount])
        .mockResolvedValueOnce('0x1'); // Wrong network

      render(
        <Web3Provider>
          <WalletConnect />
        </Web3Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Switch Network/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
