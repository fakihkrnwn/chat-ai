// src/components/Navbar.jsx
import { useState } from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <button 
        className="hamburger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        ☰
      </button>

      <ul className={`menu ${isMenuOpen ? 'active' : ''}`}>
        <li>
          <button 
            className={activeTab === 'filter' ? 'active' : ''}
            onClick={() => {
              setActiveTab('filter');
              setIsMenuOpen(false);
            }}
          >
            Filter of Standard
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'chat' ? 'active' : ''}
            onClick={() => {
              setActiveTab('chat');
              setIsMenuOpen(false);
            }}
          >
            Chat AI
          </button>
        </li>
      </ul>
    </nav>
  );
}