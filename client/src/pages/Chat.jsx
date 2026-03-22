import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Chat = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const chatMessagesRef = useRef(null);
  const imageInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        loadSession(data[0]._id);
      } else if (data.length === 0) {
        startNewChat();
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const startNewChat = async () => {
    try {
      const { data } = await api.post('/sessions');
      setCurrentSessionId(data._id);
      setMessages([{ 
        message: "Hi! I'm FitBot 🏋️. I'm here to help you crush your fitness goals! Ask me for a workout plan or diet tips.", 
        sender: 'bot',
        timestamp: getCurrentTime()
      }]);
      loadSessions();
    } catch (err) {
      console.error('Failed to start new chat', err);
    }
  };

  const loadSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    try {
      const { data } = await api.get(`/chat/history?sessionId=${sessionId}`);
      const history = data.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || getCurrentTime() // Fallback
      }));
      setMessages(history.length > 0 ? history : [{ 
        message: "Hi! I'm FitBot 🏋️. Ready for a new workout?", 
        sender: 'bot',
        timestamp: getCurrentTime()
      }]);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !selectedImage) return;
    if (isThinking) return;

    const userMsg = {
      message: inputValue || 'Sent an image',
      sender: 'user',
      image: previewImage,
      timestamp: getCurrentTime()
    };

    setMessages(prev => [...prev, userMsg]);
    const textToSubmit = inputValue;
    const imageToSubmit = previewImage;
    
    setInputValue('');
    setPreviewImage(null);
    setSelectedImage(null);
    setIsThinking(true);

    try {
      const { data } = await api.post('/chat/message', {
        message: textToSubmit,
        sessionId: currentSessionId,
        image: imageToSubmit
      });

      setMessages(prev => [...prev, {
        message: data.reply,
        sender: 'bot',
        timestamp: getCurrentTime()
      }]);
    } catch (err) {
      console.error('Error sending message', err);
      setMessages(prev => [...prev, {
        message: "Sorry, I encountered an error connecting to the server.",
        sender: 'bot',
        timestamp: getCurrentTime()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
    };
    reader.readAsDataURL(file);
    setSelectedImage(file);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseMarkdown = (text) => {
    // Basic markdown parsing logic similar to original script.js
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/### (.*?)\n/g, '<h3>$1</h3>');
    
    const lines = html.split('\n');
    let inList = false;
    let newElements = [];

    lines.forEach((line, i) => {
      if (line.trim().startsWith('* ')) {
        if (!inList) {
          inList = true;
          newElements.push(<ul key={`ul-${i}`}></ul>);
        }
        // This is a bit tricky with React, so for now let's just use dangerouslySetInnerHTML for simplicity matching original
      }
    });

    return <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(text) }} />;
  };

  const simpleMarkdownToHtml = (text) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/### (.*?)\n/g, '<h3>$1</h3>');
    
    const lines = html.split('\n');
    let result = [];
    let inList = false;

    lines.forEach(line => {
      if (line.trim().startsWith('* ')) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${line.trim().substring(2)}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        if (line.trim()) result.push(`<p>${line}</p>`);
      }
    });
    if (inList) result.push('</ul>');
    return result.join('');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button className="new-chat-btn" onClick={startNewChat}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5V19M5 12H19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Chat
          </button>
        </div>
        <div className="session-list">
          {sessions.map(session => (
            <div 
              key={session._id} 
              className={`session-item ${session._id === currentSessionId ? 'active' : ''}`}
              onClick={() => loadSession(session._id)}
            >
              <span>{session.title}</span>
              <button className="delete-session-btn" onClick={(e) => deleteSession(e, session._id)}>&times;</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-container">
        <header className="chat-header">
          <div className="avatar-container">
            <div className="avatar-img" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" fill="white" />
              </svg>
              <span className="status-dot"></span>
            </div>
          </div>
          <div className="chat-info">
            <h1>FitBot Coach</h1>
            <span className="status-text">{isThinking ? 'Typing...' : 'Ready to Train'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="icon" style={{ marginRight: '5px' }}>
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </header>

        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message-group ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="message-avatar">
                  <svg viewBox="0 0 24 24" fill="none" className="bot-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
                  </svg>
                </div>
              )}
              <div className="message-content">
                {msg.image && <img src={msg.image} className="chat-image" alt="Uploaded" />}
                {msg.sender === 'bot' ? (
                  <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.message) }} />
                ) : (
                  <p>{msg.message}</p>
                )}
                <span className="timestamp">{msg.timestamp || getCurrentTime()}</span>
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="message-group bot typing-indicator-group">
                <div className="message-avatar">
                  <svg viewBox="0 0 24 24" fill="none" className="bot-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="message-content typing">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            </div>
          )}
        </div>

        <footer className="chat-input-area">
          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          
          {previewImage && (
            <div className="image-preview-container">
              <img src={previewImage} alt="Preview" />
              <button 
                className="remove-image-btn" 
                onClick={() => { setPreviewImage(null); setSelectedImage(null); }}
              >
                &times;
              </button>
            </div>
          )}

          <div className="input-controls-wrapper">
            <button className="attach-btn" onClick={() => imageInputRef.current.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16.5 6V17.5C16.5 19.71 14.71 21.5 12.5 21.5C10.29 21.5 8.5 19.71 8.5 17.5V5C8.5 3.62 9.62 2.5 11 2.5C12.38 2.5 13.5 3.62 13.5 5V15.5C13.5 16.05 13.05 16.5 12.5 16.5C11.95 16.5 11.5 16.05 11.5 15.5V6H10V15.5C10 16.88 11.12 18 12.5 18C13.88 18 15 16.88 15 15.5V5C15 2.79 13.21 1 11 1C8.79 1 7 2.79 7 5V17.5C7 20.54 9.46 23 12.5 23C15.54 23 18 20.54 18 17.5V6H16.5Z" fill="currentColor" />
              </svg>
            </button>
            <div className="input-wrapper">
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            <button className="send-btn" onClick={handleSend}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white" />
              </svg>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Chat;
