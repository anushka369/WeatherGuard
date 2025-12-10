import './App.css';
import { Web3Provider } from './contexts/Web3Context';
import { EventHistoryProvider } from './contexts/EventHistoryContext';
import WalletConnect from './components/WalletConnect';
import PolicyPurchase from './components/PolicyPurchase';
import Dashboard from './components/Dashboard';
import LiquidityProvider from './components/LiquidityProvider';
import AdminPanel from './components/AdminPanel';
import ActivityFeed from './components/ActivityFeed';
import { NotificationContainer } from './components/NotificationContainer';

function App() {
  return (
    <Web3Provider>
      <EventHistoryProvider>
        <div className="App">
          <NotificationContainer />
          <header className="App-header">
            <div className="header-content">
              <div className="header-title">
                <h1>Weather Insurance dApp</h1>
                <p>Decentralized parametric weather insurance on QIE blockchain</p>
              </div>
              <WalletConnect />
            </div>
          </header>
          <main>
            <PolicyPurchase />
            <Dashboard />
            <LiquidityProvider />
            <ActivityFeed />
            <AdminPanel />
          </main>
        </div>
      </EventHistoryProvider>
    </Web3Provider>
  );
}

export default App;
