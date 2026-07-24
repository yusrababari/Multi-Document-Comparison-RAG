import React from 'react';
import { BookOpen, Settings } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import KBPanel from './components/KnowledgeBase/KBPanel.jsx';
import SettingsPanel from './components/Settings/SettingsPanel.jsx';
import ChatWindow from './components/Chat/ChatWindow.jsx';

function Sidebar() {
  const { sidebarTab, dispatch } = useApp();
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${sidebarTab === 'kb' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', tab: 'kb' })}
          id="tab-kb"
          aria-selected={sidebarTab === 'kb'}
        >
          <BookOpen size={14} /> Knowledge Base
        </button>
        <button
          className={`sidebar-tab ${sidebarTab === 'settings' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_SIDEBAR_TAB', tab: 'settings' })}
          id="tab-settings"
          aria-selected={sidebarTab === 'settings'}
        >
          <Settings size={14} /> Settings
        </button>
      </div>
      {sidebarTab === 'kb' ? <KBPanel /> : <SettingsPanel />}
    </aside>
  );
}

function AppInner() {
  return (
    <div className="app-root">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
