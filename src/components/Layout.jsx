import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  Award, 
  BarChart3, 
  MessageSquare, 
  Menu,
  X 
} from 'lucide-react';
import './Layout.css';

const Layout = ({ children, onSendMessage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('chatbot');

  const navItems = [
    { 
      id: 'account', 
      name: 'Account', 
      icon: User,
      message: "Provide account details including name of the account, name, email, and role"
    },
    { 
      id: 'bench-report', 
      name: 'Bench Report', 
      icon: FileText,
      message: "Generate a bench report showing current employee availability, skills, and bench duration"
    },
    { 
      id: 'certification', 
      name: 'Certification', 
      icon: Award,
      message: "Show me certification tracking information including completed, in-progress, and planned certifications"
    },
    { 
      id: 'gt-allocation', 
      name: 'GT Allocation', 
      icon: BarChart3,
      message: "Provide GT allocation details including their name and project details"
    },
    { 
      id: 'rrf', 
      name: 'RRF', 
      icon: MessageSquare,
      message: "Display RRF (Request for Resource) information and management options"
    },
    { 
      id: 'Utilization Reports', 
      name: 'Utilization Reports', 
      icon: BarChart3,
      message: "Display Utilization Reports information and management options"
    }
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavClick = (item) => {
    setActiveItem(item.id);
    setSidebarOpen(false);
    
    if (item.message && onSendMessage) {
      onSendMessage(item.message);
    }
  };

  return (
    <div className="layout">
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>OpsBot</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;