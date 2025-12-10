import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import test from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';

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
beforeEach(() => {
  (window as any).ethereum = {
    request: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
});

afterEach(() => {
  delete (window as any).ethereum;
});

test('renders weather insurance heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Weather Insurance dApp/i);
  expect(headingElement).toBeInTheDocument();
});
