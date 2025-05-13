// src/App.jsx
import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import FilterStandard from './components/FilterStandard';
import Chatbot from './components/ChatAI';
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState('filter');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articles] = useState([
    { id: 1, 
      title: "Reboot Computer", 
      content: "Use Ctrl+Alt+Delete or the Login Screen And finally, there's also an easy way to restart from either the Ctrl+Alt+Delete menu (that appears when you press that key combination) or the login screen. On either screen, click the power icon in the lower-right corner, then select Restart in the small menu that pops up. Windows 11 will restart your PC, and youll be back in business",
      link: "https://www.techtarget.com/searchwindowsserver/definition/Ctrl-Alt-Delete"
    },
    { id: 2, title: "Fire Alarm", content: " immediately evacuate the building using the nearest emergency exit" },
    { id: 3, title: "Smartphone", content: "This is an article about smartphones." }
  ]);

  const [conversationState, setConversationState] = useState({
    filter: [],
    chatbot: []
  });

  const updateConversation = useCallback((tab, messages) => {
    setConversationState(prev => ({
      ...prev,
      [tab]: messages
    }));
  }, []);

  const [hasUserInputFilter, setHasUserInputFilter] = useState(false);
  const [showSaveButtonFilter, setShowSaveButtonFilter] = useState(false);


  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="content">
        {activeTab === 'filter' ? (
          <FilterStandard 
          articles={articles}
          onSelectArticle={setSelectedArticle}
          selectedArticle={selectedArticle}
          initialMessages={conversationState.filter}
          onSaveMessages={(messages) => {
            setConversationState(prev => ({
              ...prev,
              filter: messages
            }));
          }}
          hasUserInputFilter={hasUserInputFilter}
          setHasUserInputFilter={setHasUserInputFilter}
          showSaveButtonFilter={showSaveButtonFilter}
          setShowSaveButtonFilter={setShowSaveButtonFilter}
          />
        ) : (
          <Chatbot 
          selectedArticle={selectedArticle}
          articles={articles}
          initialMessages={conversationState.chatbot}
          onSaveMessages={(messages) => {
            setConversationState(prev => ({
              ...prev,
              chatbot: messages
            }));
          }}
          />
        )}
      </main>
    </div>
  );
}