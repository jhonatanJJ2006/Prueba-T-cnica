import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FlowsPage from './pages/FlowsPage';
import FlowDetailPage from './pages/FlowDetailPage';
import FlowEditPage from './pages/FlowEditPage';
import RedeemPage from './pages/RedeemPage';
import TicketsRedeemPage from './pages/TicketRedeemPage';
import FlowExecutionPage from './pages/MotorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FlowsPage />} />
        <Route path="/flow/:id" element={<FlowDetailPage />} />
        <Route path="/flow/:id/edit" element={<FlowEditPage />} />
        <Route path="/redeem" element={<RedeemPage />} />
        <Route path="/ticket-redeem" element={<TicketsRedeemPage />} />
        <Route path="/flow-execute/:executionId" element={<FlowExecutionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
