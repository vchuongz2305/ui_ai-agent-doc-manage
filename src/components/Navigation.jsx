import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../App.css';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/analyze', label: 'Phân Tích', icon: '🔍' },
    { path: '/gdpr', label: 'GDPR', icon: '⚖️' },
    { path: '/sharing', label: 'Chia Sẻ', icon: '📤' }
  ];

  return (
    <nav className="modern-sidebar">
      <div className="sidebar-content">
        <Link to="/" className="sidebar-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <span className="logo-text">DocAgent</span>
        </Link>
        
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-upgrade">
          <div className="upgrade-illustration">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <rect x="10" y="15" width="40" height="30" rx="2" fill="currentColor" opacity="0.1"/>
              <rect x="15" y="20" width="30" height="20" rx="1" fill="currentColor" opacity="0.2"/>
              <circle cx="30" cy="30" r="3" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
          <h3 className="upgrade-title">Nâng Cấp</h3>
          <p className="upgrade-text">Nâng cấp để có thêm nhiều tính năng</p>
          <button className="upgrade-btn">Tìm hiểu thêm</button>
        </div>

        <div className="sidebar-footer">
          <Link to="/logout" className="sidebar-logout">
            <span className="logout-icon">🚪</span>
            <span>Đăng xuất</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

