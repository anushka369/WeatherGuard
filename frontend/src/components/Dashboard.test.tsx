import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { useWeb3 } from '../contexts/Web3Context';

// Mock the Web3 context
jest.mock('../contexts/Web3Context');

// Mock the contract ABI
jest.mock('../contracts/PolicyManager.json', () => ({
  abi: [],
}));

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect wallet message when not connected', () => {
    mockUseWeb3.mockReturnValue({
      account: null,
      chainId: null,
      balance: null,
      isConnected: false,
      isCorrectNetwork: false,
      error: null,
      web3: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchToQIENetwork: jest.fn(),
    });

    render(<Dashboard />);
    
    expect(screen.getByText(/Please connect your wallet to view your policies/i)).toBeInTheDocument();
  });

  it('renders network switch message when on wrong network', () => {
    mockUseWeb3.mockReturnValue({
      account: '0x123',
      chainId: '1',
      balance: '10',
      isConnected: true,
      isCorrectNetwork: false,
      error: null,
      web3: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchToQIENetwork: jest.fn(),
    });

    render(<Dashboard />);
    
    expect(screen.getByText(/Please switch to the QIE network to view your policies/i)).toBeInTheDocument();
  });
});
