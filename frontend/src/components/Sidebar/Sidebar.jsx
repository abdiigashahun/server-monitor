import "./Sidebar.css";
import {
  MdDashboard,
  MdDns,
  MdBackup,
  MdNotifications,
  MdAnalytics,
  MdSettings
} from "react-icons/md";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <h2>GovMonitor</h2>
      </div>

      <nav className="menu">
        <a href="/" className="active">
          <MdDashboard />
          <span>Dashboard</span>
        </a>

        <a href="/servers">
          <MdDns />
          <span>Server Inventory</span>
        </a>

        <a href="/backup">
          <MdBackup />
          <span>Backup Center</span>
        </a>

        <a href="/alerts">
          <MdNotifications />
          <span>Alerts & Logs</span>
        </a>

        <a href="/reports">
          <MdAnalytics />
          <span>Reports & Analytics</span>
        </a>

        <a href="/settings">
          <MdSettings />
          <span>Settings</span>
        </a>
      </nav>
    </aside>
  );
}