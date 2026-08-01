import React from "react";
import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdDns,
  MdBackup,
  MdNotifications,
  MdAnalytics,
  MdSettings,
  MdSecurity
} from "react-icons/md";
import "./Sidebar.css";

export default function Sidebar() {
  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <MdDashboard size={20} />
    },
    {
      name: "Server Inventory",
      path: "/servers",
      icon: <MdDns size={20} />
    },
    {
      name: "Backup Center",
      path: "/backup",
      icon: <MdBackup size={20} />
    },
    {
      name: "Alerts & Logs",
      path: "/alerts",
      icon: <MdNotifications size={20} />
    },
    {
      name: "Reports & Analytics",
      path: "/reports",
      icon: <MdAnalytics size={20} />
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <MdSettings size={20} />
    }
  ];

  return (
    <aside className="sidebar">
      {/* Top Header Logo */}
      <div className="logo">
        <MdSecurity className="logo-icon" size={24} color="#38bdf8" />
        <h2>GovMonitor AI</h2>
      </div>

      {/* Navigation Links */}
      <nav className="menu">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `menu-item ${isActive ? "active" : ""}`
                }
              >
                <span className="item-icon">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
