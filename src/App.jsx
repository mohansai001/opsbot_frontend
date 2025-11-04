import React, { useRef } from 'react';
import Layout from './components/Layout';
import ChatBot from './pages/ChatBot';
import './App.css';

function App() {
  const chatBotRef = useRef();

  const handleSendMessage = (message) => {
    if (chatBotRef.current) {
      chatBotRef.current.sendMessage(message);
    }
  };

  return (
    <Layout onSendMessage={handleSendMessage}>
      <ChatBot ref={chatBotRef} />
    </Layout>
  );
}

export default App