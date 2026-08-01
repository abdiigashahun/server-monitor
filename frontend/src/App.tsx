
import Sidebar from './components/Sidebar/Sidebar';

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', color: '#ffffff' }}>
        <h1>GovMonitor AI Dashboard</h1>
      </main>
    </div>
  );
}