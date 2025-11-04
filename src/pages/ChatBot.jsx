import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import './ChatBot.css';

const API_URL = 'http://127.0.0.1:8000/query';

window.tableData = {};

window.changePage = (tableId, page, totalPages) => {
  const data = window.tableData[tableId];
  if (!data) return;
  
  const rowsPerPage = 5;
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const columns = Object.keys(data[0]);
  
  document.getElementById(`tbody-${tableId}`).innerHTML = data.slice(start, end).map(row => `
    <tr>
      ${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}
    </tr>
  `).join('');
  
  document.getElementById(`page-${tableId}`).textContent = `Page ${page} of ${totalPages}`;
  document.getElementById(`prev-${tableId}`).disabled = page === 1;
  document.getElementById(`next-${tableId}`).disabled = page === totalPages;
  
  if (page > 1) document.getElementById(`prev-${tableId}`).onclick = () => window.changePage(tableId, page - 1, totalPages);
  if (page < totalPages) document.getElementById(`next-${tableId}`).onclick = () => window.changePage(tableId, page + 1, totalPages);
};

window.toggleAllRows = (tableId, hiddenRowsCount) => {
  const hiddenRows = document.querySelectorAll(`[id^="hidden-row-${tableId}"]`);
  const expandRow = document.getElementById(`expand-row-${tableId}`);
  const expandText = expandRow?.querySelector('.expand-text');
  const collapseText = expandRow?.querySelector('.collapse-text');
  
  if (hiddenRows.length === 0) return;
  
  const isHidden = hiddenRows[0].style.display === 'none' || hiddenRows[0].style.display === '';
  
  hiddenRows.forEach(row => row.style.display = isHidden ? 'table-row' : 'none');
  expandRow?.classList.toggle('expanded', isHidden);
  if (expandText) expandText.style.display = isHidden ? 'none' : 'inline';
  if (collapseText) collapseText.style.display = isHidden ? 'inline' : 'none';
};

const ChatBot = forwardRef((props, ref) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "🎉 Welcome to OpsBot! I'm your AI-powered operations assistant.\n\n✨ I can help you with:\n\n📊 **Account Details** - Platform, App & Infrastructure team information\n📈 **Bench Reports** - Employee availability and status\n🎓 **Certification Data** - Professional certifications tracking\n👥 **GT Allocation** - Graduate Trainee allocation details\n📋 **RRF Data** - Request for Resources management\n📊 **Utilization Reports** - Resource utilization analysis\n\n💬 Just ask me to show you any of these reports or use the sidebar navigation!",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Also scroll when loading states change
    if (!isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isScrolledToBottom = scrollHeight - scrollTop <= clientHeight + 50;
        setShowScrollButton(!isScrolledToBottom);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleManualScrollToBottom = () => {
    setShowScrollButton(false);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    // Add a small delay to ensure DOM is updated
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
      // Alternative method if the first doesn't work
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    // Add a slight delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // All requests now go directly to API - no blob loading

      // Send message directly to API without modification

      // Create the request body for custom API
      const requestBody = {
        query: messageText
      };
        console.log('🚀 Sent request to Gemini API:', requestBody);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
     
      });
      console.log('📥 Received response from Gemini API:', response);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Parsed API response:', data);
      
      let rawText = data.success ? (data.result.output || data.result) : `Error: ${data.error || 'Sorry, I could not generate a response.'}`;
      
      // Ensure rawText is a string and clean it immediately
      if (typeof rawText !== 'string') {
        rawText = JSON.stringify(rawText);
      }
      
      // Clean excessive newlines and whitespace early
      rawText = rawText.replace(/\\n/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Check if response contains structured data
      let botMessage;
      
      // Check if LLM response contains structured data or tables
      if (data.success && data.result && typeof data.result === 'object' && data.result.analysis) {
        // Handle LLM analysis response
        botMessage = {
          id: Date.now() + 1,
          text: data.result.analysis,
          sender: 'bot',
          timestamp: new Date()
        };
      } else if (data.success && data.result && data.result.result && data.result.result.tableData && Array.isArray(data.result.result.tableData) && data.result.result.tableData.length > 0) {
        // Handle table data extracted from image
        const tableHtml = generateTableFromData(data.result.result.tableData, 'Utilization Report Data');
        botMessage = {
          id: Date.now() + 1,
          text: data.result.result.text || 'Data extracted from image:',
          sender: 'bot',
          timestamp: new Date(),
          tableData: {
            html: tableHtml,
            rowCount: data.result.result.tableData.length
          }
        };
      } else if (data.success && data.result && data.result.result && data.result.result.images && Array.isArray(data.result.result.images) && data.result.result.images.length > 0) {
        // Handle proper JSON response with images
        botMessage = {
          id: Date.now() + 1,
          text: data.result.result.text || 'Images found:',
          sender: 'bot',
          timestamp: new Date(),
          images: data.result.result.images
        };
      } else if (data.success && data.result && data.result.images && Array.isArray(data.result.images) && data.result.images.length > 0) {
        // Handle proper JSON response with images (non-nested)
        botMessage = {
          id: Date.now() + 1,
          text: data.result.text || 'Images found:',
          sender: 'bot',
          timestamp: new Date(),
          images: data.result.images
        };
      } else if (rawText.includes('Selected file:') && rawText.includes('image') && rawText.includes('data')) {
        try {
          // Extract the tuple content from the response
          const tupleMatch = rawText.match(/Selected file: \(([^)]+)\)/s);
          if (tupleMatch) {
            const tupleContent = tupleMatch[1];
            // Parse the images array from the tuple
            const imagesMatch = tupleContent.match(/\[\{[^}]+\}\]/s);
            if (imagesMatch) {
              const imagesStr = imagesMatch[0].replace(/&#39;/g, '"');
              const images = JSON.parse(imagesStr);
              const textPart = tupleContent.split(',')[0].replace(/&#39;/g, '').trim();
              
              botMessage = {
                id: Date.now() + 1,
                text: textPart,
                sender: 'bot',
                timestamp: new Date(),
                images: images
              };
            } else {
              throw new Error('No images found');
            }
          } else {
            throw new Error('No tuple found');
          }
        } catch (e) {
          // Fallback to regular text if parsing fails
          const cleanedText = cleanTextFormatting(rawText);
          botMessage = {
            id: Date.now() + 1,
            text: cleanedText,
            sender: 'bot',
            timestamp: new Date()
          };
        }
      } else if (data.success && Array.isArray(data.result) && data.result.length > 1 && Array.isArray(data.result[1])) {
        // Handle image response - backend returns [text, images_array]
        botMessage = {
          id: Date.now() + 1,
          text: data.result[0] || rawText,
          sender: 'bot',
          timestamp: new Date(),
          images: data.result[1]
        };
      } else if (rawText.includes('<table') || rawText.includes('<div') || rawText.includes('<html')) {
        // Handle HTML response
        botMessage = {
          id: Date.now() + 1,
          text: '',
          sender: 'bot',
          timestamp: new Date(),
          htmlContent: rawText
        };
      } else if (rawText.includes('Their details are:') || (rawText.includes('•') && rawText.includes(':'))) {
        // Handle structured data with bullet points
        const tableData = parseStructuredData(rawText);
        if (tableData.length > 0) {
          const tableHtml = generateTableFromData(tableData, 'Associates Details');
          botMessage = {
            id: Date.now() + 1,
            text: rawText.split('Their details are:')[0]?.trim() || 'Here are the details:',
            sender: 'bot',
            timestamp: new Date(),
            tableData: {
              html: tableHtml,
              rowCount: tableData.length
            }
          };
        } else {
          const cleanedText = cleanTextFormatting(rawText);
          botMessage = {
            id: Date.now() + 1,
            text: cleanedText,
            sender: 'bot',
            timestamp: new Date()
          };
        }
      } else {
        // Handle regular text response
        const cleanedText = cleanTextFormatting(rawText);
        botMessage = {
          id: Date.now() + 1,
          text: cleanedText,
          sender: 'bot',
          timestamp: new Date()
        };
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      let errorText = "I'm sorry, I encountered an error while processing your request.";
      
      if (error.message?.includes('403')) {
        errorText = "❌ API access error. Please verify the API endpoint is accessible.";
      } else if (error.message?.includes('429')) {
        errorText = "⏳ API rate limit exceeded. Please try again later.";
      } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
        errorText = "🌐 Network error. Please check your connection to the API server and try again.";
      } else {
        errorText += ` Details: ${error.message}`;
      }

      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const parseStructuredData = (text) => {
    const lines = text.split('\n').filter(line => line.trim() && line.includes('•'));
    const data = [];
    
    lines.forEach(line => {
      const cleanLine = line.replace('•', '').trim();
      const pairs = cleanLine.split(',').map(pair => pair.trim());
      const row = {};
      
      pairs.forEach(pair => {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
          const key = pair.substring(0, colonIndex).trim();
          const value = pair.substring(colonIndex + 1).trim();
          row[key] = value;
        }
      });
      
      if (Object.keys(row).length > 0) {
        data.push(row);
      }
    });
    
    return data;
  };

  const generateTableFromData = (data, title) => {
    if (!data || data.length === 0) return '<p>No data available</p>';
    
    const columns = Object.keys(data[0]);
    const tableId = `table-${Date.now()}`;
    const rowsPerPage = 5; // Changed from 10 to 5 to show pagination more often
    const totalPages = Math.ceil(data.length / rowsPerPage);
    
    // Store data globally for pagination
    window.tableData[tableId] = data;
    
    return `
      <div class="api-response-table">
        <div class="table-header">
          <h4>📊 ${title}</h4>
          <span class="row-count">${data.length} records found</span>
        </div>
        <div class="table-container">
          <table class="response-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="tbody-${tableId}">
              ${data.slice(0, rowsPerPage).map(row => `
                <tr>
                  ${columns.map(col => `<td>${row[col] || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `<div class="pagination"><button onclick="window.changePage('${tableId}', 1, ${totalPages})" id="prev-${tableId}" disabled>Previous</button><span id="page-${tableId}">Page 1 of ${totalPages}</span><button onclick="window.changePage('${tableId}', 2, ${totalPages})" id="next-${tableId}">Next</button></div>` : ''}
      </div>
    `;
  };

  const cleanTextFormatting = (text) => {
    return text
      .replace(/\\n/g, ' ') // Remove \n characters
      .replace(/\n/g, ' ') // Remove actual newlines
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown  
      .replace(/`(.*?)`/g, '$1') // Remove inline code markdown
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/^\s*[-*+]\s/gm, '• ') // Convert markdown lists to bullet points
      .replace(/^\s*\d+\.\s/gm, (match, offset, string) => {
        // Convert numbered lists but preserve the numbers
        const num = match.match(/\d+/)[0];
        return `${num}. `;
      })
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (message) => {
      sendMessage(message);
    }
  }));

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <Bot className="bot-icon" />
          <div className="header-text">
            <h2>OpsBot Assistant</h2>
          </div>
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {/* Quick Action Buttons */}
        <div className="quick-actions">
          <h3>🚀 Quick Actions</h3>
          <div className="action-buttons">
            <button 
              className="action-btn" 
              onClick={() => sendMessage("Show me the bench report")}
              disabled={isLoading}
            >
              📈 Bench Report
            </button>
            <button 
              className="action-btn" 
              onClick={() => sendMessage("Show me certification data")}
              disabled={isLoading}
            >
              🎓 Certifications
            </button>
            <button 
              className="action-btn" 
              onClick={() => sendMessage("Show me GT allocation")}
              disabled={isLoading}
            >
              👥 GT Allocation
            </button>
            <button 
              className="action-btn" 
              onClick={() => sendMessage("Show me RRF data")}
              disabled={isLoading}
            >
              📋 RRF Data
            </button>
                 <button 
              className="action-btn" 
              onClick={() => sendMessage("Show me RRF data")}
              disabled={isLoading}
            >
              Utilization Reports
            </button>
          </div>
        </div>

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender} ${message.excelData ? 'excel-message' : ''}`}>
            <div className="message-avatar">
              {message.sender === 'bot' ? <Bot size={24} /> : <User size={24} />}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.images ? (
                  <div className="image-content">
                    <pre className="message-text-content">{message.text}</pre>
                    {message.images.map((img, index) => (
                      <div key={index} className="image-container">
                        <img 
                          src={`data:image/png;base64,${img.data}`} 
                          alt={img.filename}
                          className="response-image"
                        />
                        <p className="image-filename">{img.filename}</p>
                      </div>
                    ))}
                  </div>
                ) : message.excelData ? (
                  <div 
                    className="excel-content"
                    dangerouslySetInnerHTML={{ __html: message.excelData.html }}
                  />
                ) : message.tableData ? (
                  <div 
                    className="table-content"
                    dangerouslySetInnerHTML={{ __html: message.tableData.html }}
                  />
                ) : message.htmlContent ? (
                  <div 
                    className="html-content"
                    dangerouslySetInnerHTML={{ __html: message.htmlContent }}
                  />
                ) : (
                  <pre className="message-text-content">{message.text}</pre>
                )}
              </div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot">
            <div className="message-avatar">
              <Bot size={24} />
            </div>
            <div className="message-content">
              <div className="message-text">
                <div className="typing-indicator">
                  <span>OpsBot is thinking</span>
                  <div className="dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button 
          className="scroll-to-bottom-btn"
          onClick={handleManualScrollToBottom}
          title="Scroll to bottom"
        >
          ↓
        </button>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about reports, data, or any questions..."
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !inputMessage.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
});

ChatBot.displayName = 'ChatBot';

export default ChatBot;