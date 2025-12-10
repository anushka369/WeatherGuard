import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiquidityProvider from './LiquidityProvider';
import { useWeb3 } from '../contexts/Web3Context';

// Mock the Web3 context
jest.mock('../contexts/Web3Context');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;

// Mock Web3 instance
const mockWeb3 = {
  eth: {
    Contract: jest.fn().mockImplementation(() => ({
      methods: {
        getPoolStats: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue({
            totalValue: '10000000000000000000', // 10 ETH
            liability: '5000000000000000000', // 5 ETH
            utilizationRate: '5000', // 50%
            totalPremiums: '2000000000000000000', // 2 ETH
            totalPayouts: '1000000000000000000', // 1 ETH
          }),
        }),
        totalLPTokens: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue('10000000000000000000'),
        }),
        lpTokenBalances: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue('1000000000000000000'), // 1 LP token
        }),
        depositTimestamps: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue('1640000000'),
        }),
        calculateYield: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue('100000000000000000'), // 0.1 ETH
        }),
        deposit: jest.fn().mockReturnValue({
          send: jest.fn().mockResolvedValue({
            transactionHash: '0x123',
          }),
        }),
        withdraw: jest.fn().mockReturnValue({
          send: jest.fn().mockResolvedValue({
            transactionHash: '0x456',
          }),
        }),
      },
    })),
    getBalance: jest.fn().mockResolvedValue('5000000000000000000'), // 5 ETH
  },
  utils: {
    toWei: jest.fn((value) => (parseFloat(value) * 1e18).toString()),
    fromWei: jest.fn((value) => (parseFloat(value) / 1e18).toString()),
  },
};

describe('LiquidityProvider Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders connect wallet message when not connected', () => {
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

    render(<LiquidityProvider />);
    
    expect(screen.getByText(/Please connect your wallet to provide liquidity/i)).toBeInTheDocument();
  });

  test('renders network switch message when on wrong network', () => {
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

    render(<LiquidityProvider />);
    
    expect(screen.getByText(/Please switch to the QIE network/i)).toBeInTheDocument();
  });

  describe('Pool Statistics Display', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('displays pool statistics when connected', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Total Pool Value/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Liability/i)).toBeInTheDocument();
        expect(screen.getByText(/Utilization Rate/i)).toBeInTheDocument();
      });
    });

    test('displays utilization rate correctly', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/50\.00%/i)).toBeInTheDocument();
      });
    });

    test('displays risk level based on utilization', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Medium Risk/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Position Display', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('displays user LP tokens', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/LP Tokens/i)).toBeInTheDocument();
      });
    });

    test('displays pool share percentage', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Pool Share/i)).toBeInTheDocument();
      });
    });

    test('displays accumulated yield', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Accumulated Yield/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deposit Functionality', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('renders deposit form', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Deposit Liquidity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Amount \(QIE\)/i)).toBeInTheDocument();
      });
    });

    test('allows user to enter deposit amount', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const depositInput = screen.getByLabelText(/Amount \(QIE\)/i) as HTMLInputElement;
        fireEvent.change(depositInput, { target: { value: '5' } });
        expect(depositInput.value).toBe('5');
      });
    });

    test('MAX button sets maximum deposit amount', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const maxButton = screen.getAllByText(/MAX/i)[0];
        fireEvent.click(maxButton);
      });

      await waitFor(() => {
        const depositInput = screen.getByLabelText(/Amount \(QIE\)/i) as HTMLInputElement;
        expect(parseFloat(depositInput.value)).toBeGreaterThan(0);
      });
    });

    test('displays projected yield for deposit', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const depositInput = screen.getByLabelText(/Amount \(QIE\)/i);
        fireEvent.change(depositInput, { target: { value: '5' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Projected Annual Yield/i)).toBeInTheDocument();
      });
    });

    test('disables deposit button when amount is invalid', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const depositButton = screen.getByRole('button', { name: /^Deposit$/i });
        expect(depositButton).toBeDisabled();
      });
    });
  });

  describe('Withdrawal Functionality', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('renders withdrawal form', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Withdraw Liquidity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/LP Tokens/i)).toBeInTheDocument();
      });
    });

    test('allows user to enter withdrawal amount', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const withdrawInput = screen.getByLabelText(/LP Tokens/i) as HTMLInputElement;
        fireEvent.change(withdrawInput, { target: { value: '0.5' } });
        expect(withdrawInput.value).toBe('0.5');
      });
    });

    test('MAX button sets maximum withdrawal amount', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const maxButtons = screen.getAllByText(/MAX/i);
        const withdrawMaxButton = maxButtons[1]; // Second MAX button is for withdrawal
        fireEvent.click(withdrawMaxButton);
      });

      await waitFor(() => {
        const withdrawInput = screen.getByLabelText(/LP Tokens/i) as HTMLInputElement;
        expect(parseFloat(withdrawInput.value)).toBeGreaterThan(0);
      });
    });

    test('displays available LP tokens', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Available:/i)).toBeInTheDocument();
      });
    });

    test('disables withdrawal button when amount is invalid', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const withdrawButton = screen.getByRole('button', { name: /^Withdraw$/i });
        expect(withdrawButton).toBeDisabled();
      });
    });
  });

  describe('Risk Indicators', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('displays risk indicators section', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Indicators/i)).toBeInTheDocument();
      });
    });

    test('displays pool utilization meter', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        const meterFill = document.querySelector('.risk-meter-fill');
        expect(meterFill).toBeInTheDocument();
      });
    });

    test('displays net pool performance', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Net Pool Performance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Earnings Calculator', () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        account: '0x123',
        chainId: '0x3039',
        balance: '10',
        isConnected: true,
        isCorrectNetwork: true,
        error: null,
        web3: mockWeb3 as any,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchToQIENetwork: jest.fn(),
      });
    });

    test('displays earnings calculator section', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Earnings Calculator/i)).toBeInTheDocument();
      });
    });

    test('displays example calculation', async () => {
      render(<LiquidityProvider />);

      await waitFor(() => {
        expect(screen.getByText(/Example Calculation/i)).toBeInTheDocument();
      });
    });
  });
});
