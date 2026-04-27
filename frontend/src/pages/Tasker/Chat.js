import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import './Chat.css';

export default function TaskerChat() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState(user?.preferred_language || 'en');
  const [showOriginal, setShowOriginal] = useState({});
  const [translating, setTranslating] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const messagesEndRef = useRef(null);

  const languages = [
    { code: 'original', name: 'Original Language' },
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'zh', name: '中文 (Chinese)' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'pt', name: 'Português (Portuguese)' },
    { code: 'bn', name: 'বাংলা (Bengali)' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'mr', name: 'मराठी (Marathi)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
    { code: 'ur', name: 'اردو (Urdu)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' }
  ];

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChatMessages(chatId);
    }
  }, [chatId]);

  // Translate messages when language changes
  useEffect(() => {
    if (messages.length > 0 && displayLanguage !== 'original') {
      translateAllMessages();
    }
  }, [displayLanguage, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (id) => {
    try {
      const response = await api.get(`/chat/${id}`);
      setSelectedChat(response.data);
      const fetchedMessages = response.data.messages || [];
      
      
      setMessages(fetchedMessages);
      setTranslatedMessages({}); // Reset translations when fetching new chat
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const translateTextWithPuter = async (text, targetLang, sourceLang = 'auto') => {
    if (!window.puter) {
      console.error('Puter.js not loaded');
      return text;
    }

    try {
      const languageNames = {
        'en': 'English', 'hi': 'Hindi', 'es': 'Spanish', 'fr': 'French',
        'de': 'German', 'ja': 'Japanese', 'zh': 'Chinese', 'ar': 'Arabic',
        'pt': 'Portuguese', 'bn': 'Bengali', 'pa': 'Punjabi', 'te': 'Telugu',
        'mr': 'Marathi', 'ta': 'Tamil', 'gu': 'Gujarati', 'ur': 'Urdu',
        'kn': 'Kannada', 'ml': 'Malayalam', 'ru': 'Russian', 'it': 'Italian', 'ko': 'Korean'
      };

      const targetLangName = languageNames[targetLang] || targetLang;
      const prompt = `Translate the following text to ${targetLangName}. Return ONLY the translated text, nothing else. Maintain the tone and context.

Text: ${text}`;

      const response = await window.puter.ai.chat(prompt);
      
      // Debug: Log the full response structure
      
      // Extract text from response object - handle various response formats
      let translatedText;
      if (typeof response === 'string') {
        translatedText = response;
      } else if (response && typeof response === 'object') {
        // Try various common properties
        translatedText = response.message || response.content || response.text || 
                        response.response || response.output || response.result;
        
        // If still an object, try to get first text value
        if (typeof translatedText === 'object' && translatedText !== null) {
          translatedText = translatedText.message || translatedText.content || translatedText.text;
        }
        
        // Last resort: stringify
        if (!translatedText || typeof translatedText === 'object') {
          console.warn('Could not extract text, using JSON.stringify');
          translatedText = JSON.stringify(response);
        }
      } else {
        translatedText = String(response || text);
      }
      
      // Ensure it's a string and trim
      translatedText = String(translatedText).trim();
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const translateAllMessages = async () => {
    if (!window.puter || translating) {
      return;
    }

    setTranslating(true);
    const newTranslations = {};

    try {
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgKey = `${i}-${msg.timestamp}`;
        
        // Skip if already translated to this language
        if (translatedMessages[msgKey]?.[displayLanguage]) {
          newTranslations[msgKey] = translatedMessages[msgKey];
          continue;
        }

        const originalLang = msg.original_language || 'en';
        
        // If same language, no translation needed
        if (originalLang === displayLanguage) {
          newTranslations[msgKey] = {
            ...translatedMessages[msgKey],
            [displayLanguage]: msg.content
          };
        } else {
          // Translate with Puter.js
          const translated = await translateTextWithPuter(msg.content, displayLanguage, originalLang);
          newTranslations[msgKey] = {
            ...translatedMessages[msgKey],
            [displayLanguage]: translated
          };
        }
      }

      setTranslatedMessages(prev => ({ ...prev, ...newTranslations }));
    } catch (error) {
      console.error('Translation batch error:', error);
      toast.error('Translation failed. Showing original text.');
    } finally {
      setTranslating(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    // Check if messaging is disabled
    if (selectedChat.is_messaging_disabled) {
      toast.error('Cannot send messages after booking is completed. Chat history is read-only.');
      return;
    }

    try {
      setSending(true);
      const recipientId = selectedChat.customer_id;
      
      const response = await api.post('/chat/send', {
        recipient_id: recipientId,
        content: newMessage.trim()
      });

      setMessages([...messages, response.data.message]);
      setNewMessage('');
      
      // Update conversation in list
      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <>
  <LoadingScreen message="Firing Up The Engines" />
      </>
    );
  }

  return (
    <>
      <div className="chat-page-container">
      {/* Conversations Sidebar */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>💬 Messages</h2>
          <p>Chat with your customers</p>
        </div>

        {conversations.length === 0 ? (
          <div className="empty-conversations">
            <div className="empty-icon">💬</div>
            <p>No conversations yet</p>
            <small>Customers will appear here when they message you</small>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map(conv => (
              <div
                key={conv._id}
                className={`conversation-item ${selectedChat?._id === conv._id ? 'active' : ''}`}
                onClick={() => {
                  navigate(`/tasker/chat/${conv._id}`);
                  setSelectedChat(conv);
                  setMessages(conv.messages || []);
                }}
              >
                <div className="conversation-avatar">
                  {conv.other_user?.profile_picture ? (
                    <img src={conv.other_user.profile_picture} alt={conv.other_user.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {conv.other_user?.name?.charAt(0) || 'C'}
                    </div>
                  )}
                </div>
                <div className="conversation-info">
                  <div className="conversation-header">
                    <h4>{conv.other_user?.name || 'Customer'}</h4>
                    <span className="conversation-time">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="last-message">{conv.last_message}</p>
                  <p className="last-message">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="unread-badge">{conv.unread_count}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {!selectedChat ? (
          <div className="no-chat-selected">
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the left to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  {selectedChat.other_user?.profile_picture ? (
                    <img src={selectedChat.other_user.profile_picture} alt={selectedChat.other_user.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedChat.other_user?.name?.charAt(0) || 'C'}
                    </div>
                  )}
                </div>
                <div>
                  <h3>{selectedChat.other_user?.name || 'Customer'}</h3>
                  <p>Customer</p>
                </div>
              </div>
              <div className="language-selector">
                <label>🌐</label>
                <select 
                  value={displayLanguage} 
                  onChange={(e) => setDisplayLanguage(e.target.value)}
                  className="language-dropdown"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {translating && (
                <div className="translation-loading">
                  <span>🌐 Translating messages...</span>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg, index) => {
                    const msgKey = `${index}-${msg.timestamp}`;
                    
                    // Determine what text to display
                    let displayText = msg.content;
                    let showTranslationToggle = false;
                    
                    if (displayLanguage !== 'original') {
                      // Check if we have a cached translation
                      const cachedTranslation = translatedMessages[msgKey]?.[displayLanguage];
                      if (cachedTranslation && cachedTranslation !== msg.content) {
                        displayText = showOriginal[index] ? msg.content : cachedTranslation;
                        showTranslationToggle = true;
                      }
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`message ${msg.sender_id === user._id ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <p>{displayText}</p>
                          {showTranslationToggle && (
                            <div className="translation-controls">
                              <button 
                                className="show-original-btn"
                                onClick={() => setShowOriginal(prev => ({...prev, [index]: !prev[index]}))}
                                type="button"
                              >
                                {showOriginal[index] ? '🔄 Show Translation' : '👁️ See Original'}
                              </button>
                              {showOriginal[index] && (
                                <div className="original-text">
                                  <small>Original ({msg.original_language || 'unknown'}): {msg.content}</small>
                                </div>
                              )}
                            </div>
                          )}
                          <span className="message-time">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            {selectedChat?.is_messaging_disabled ? (
              <div className="messaging-disabled-notice">
                <span className="notice-icon">🔒</span>
                <p>Messaging is disabled - Booking has been completed</p>
                <small>You can view your chat history but cannot send new messages</small>
              </div>
            ) : (
              <form className="message-input-container" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? '⏳' : '📤'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
