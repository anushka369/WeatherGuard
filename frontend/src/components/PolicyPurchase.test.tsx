import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PolicyPurchase from './PolicyPurchase';
import { Web3Provider } from '../contexts/Web3Context';

// Mock Web3
jest.mock('web3', () => {
  return jest.fn().mockImplementation(() => ({
    eth: {
      Contract: jest.fn().mockImplementation(() => ({
        methods: {
          calculatePremium: jest.fn().mockReturnValue({
            call: jest.fn().mockResolvedValue('100000000000000000'), // 0.1 ETH
          }),
          createPolicy: jest.fn().mockReturnValue({
            send: jest.fn().mockResolvedValue({
              transactionHash: '0x123',
            }),
          }),
        },
      })),
      getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
    },
    utils: {
      toWei: jest.fn((value) => (parseFloat(value) * 1e18).toString()),
      fromWei: jest.fn((value) => (parseFloat(value) / 1e18).toString()),
      isAddress: jest.fn(() => true),
    },
  }));
});

describe('PolicyPurchase Component', () => {
  beforeEach(() => {
    // Mock window.ethereum
    (window as any).ethereum = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  afterEach(() => {
    delete (window as any).ethereum;
  });

  test('renders policy purchase form', () => {
    render(
      <Web3Provider>
        <PolicyPurchase />
      </Web3Provider>
    );

    expect(screen.getByText(/Purchase Weather Insurance Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a Template/i)).toBeInTheDocument();
  });

  test('renders all policy templates', () => {
    render(
      <Web3Provider>
        <PolicyPurchase />
      </Web3Provider>
    );

    expect(screen.getByText(/Crop Insurance/i)).toBeInTheDocument();
    expect(screen.getByText(/Event Insurance/i)).toBeInTheDocument();
    expect(screen.getByText(/Travel Insurance/i)).toBeInTheDocument();
  });

  test('renders form fields', () => {
    render(
      <Web3Provider>
        <PolicyPurchase />
      </Web3Provider>
    );

    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Coverage Start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Coverage End/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Weather Parameter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Trigger Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Payout Amount/i)).toBeInTheDocument();
  });

  test('displays premium calculation section', () => {
    render(
      <Web3Provider>
        <PolicyPurchase />
      </Web3Provider>
    );

    expect(screen.getByText(/Estimated Premium/i)).toBeInTheDocument();
  });

  test('displays submit button', () => {
    render(
      <Web3Provider>
        <PolicyPurchase />
      </Web3Provider>
    );

    const submitButton = screen.getByRole('button', { name: /Purchase Policy/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled(); // Should be disabled when not connected
  });

  describe('Form Validation', () => {
    test('validates empty location field', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const locationInput = screen.getByLabelText(/Location/i);
      fireEvent.change(locationInput, { target: { value: '' } });
      fireEvent.blur(locationInput);

      // Try to submit
      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Location is required/i)).toBeInTheDocument();
      });
    });

    test('validates coverage period dates', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const startInput = screen.getByLabelText(/Coverage Start/i);
      const endInput = screen.getByLabelText(/Coverage End/i);

      // Set end date before start date
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      const today = new Date().toISOString().slice(0, 16);

      fireEvent.change(startInput, { target: { value: today } });
      fireEvent.change(endInput, { target: { value: yesterday } });

      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/End date must be after start date/i)).toBeInTheDocument();
      });
    });

    test('validates trigger value is a number', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const triggerInput = screen.getByLabelText(/Trigger Value/i);
      fireEvent.change(triggerInput, { target: { value: 'abc' } });

      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Trigger value must be a number/i)).toBeInTheDocument();
      });
    });

    test('validates payout amount minimum', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const payoutInput = screen.getByLabelText(/Payout Amount/i);
      fireEvent.change(payoutInput, { target: { value: '0.001' } });

      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Payout amount must be at least 0.01 QIE/i)).toBeInTheDocument();
      });
    });

    test('validates payout amount maximum', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const payoutInput = screen.getByLabelText(/Payout Amount/i);
      fireEvent.change(payoutInput, { target: { value: '150' } });

      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Payout amount cannot exceed 100 QIE/i)).toBeInTheDocument();
      });
    });

    test('validates coverage period duration minimum', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowPlus1Hour = new Date(tomorrow.getTime() + 60 * 60 * 1000);

      const startInput = screen.getByLabelText(/Coverage Start/i);
      const endInput = screen.getByLabelText(/Coverage End/i);

      fireEvent.change(startInput, { target: { value: tomorrow.toISOString().slice(0, 16) } });
      fireEvent.change(endInput, { target: { value: tomorrowPlus1Hour.toISOString().slice(0, 16) } });

      const form = screen.getByRole('button', { name: /Purchase Policy/i }).closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Coverage period must be at least 1 day/i)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    test('populates form with template defaults when template is selected', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const cropTemplate = screen.getByText(/Crop Insurance/i).closest('.template-card');
      if (cropTemplate) {
        fireEvent.click(cropTemplate);
      }

      await waitFor(() => {
        const triggerInput = screen.getByLabelText(/Trigger Value/i) as HTMLInputElement;
        const payoutInput = screen.getByLabelText(/Payout Amount/i) as HTMLInputElement;

        expect(triggerInput.value).toBe('50');
        expect(payoutInput.value).toBe('5');
      });
    });

    test('highlights selected template', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const eventTemplate = screen.getByText(/Event Insurance/i).closest('.template-card');
      if (eventTemplate) {
        fireEvent.click(eventTemplate);
      }

      await waitFor(() => {
        expect(eventTemplate).toHaveClass('selected');
      });
    });
  });

  describe('Premium Calculation', () => {
    test('displays calculated premium when form is filled', async () => {
      render(
        <Web3Provider>
          <PolicyPurchase />
        </Web3Provider>
      );

      const payoutInput = screen.getByLabelText(/Payout Amount/i);
      fireEvent.change(payoutInput, { target: { value: '5' } });

      await waitFor(() => {
        const premiumDisplay = screen.getByText(/Estimated Premium/i).parentElement;
        expect(premiumDisplay).toBeInTheDocument();
      });
    });
  });
});
