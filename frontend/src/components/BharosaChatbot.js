import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const initialPrompt = `You are TrustedHands AI Assistant, a friendly chatbot for TrustedHands (https://trusted-hands.vercel.app), a trusted marketplace for freelance and gig services. Your job is to help users understand every feature and section of the website, including: Customer, Tasker, and Admin roles; Service categories (Electrician, Plumber, Carpenter, AC Servicing, RO Servicing, Home Cleaning, Car Washing, Assignment Writing); Safety & Trust features (background verification, secure payments, rating/review system, 24/7 support, service quality guarantee); AMC Services (Annual Maintenance Contracts for businesses and societies); How to use the chat, booking, and payment features; How to sign up, login, and switch roles; Contact info: Punjab Engineering College, Sector-12, Chandigarh; caretrustedhands@gmail.com; +91 (555) 123-4567. 

IMPORTANT: If a user mentions any of these keywords, IMMEDIATELY suggest they create a support ticket for human assistance:
- Safety issues, harassment, threat, danger, assault, abuse
- Disputes, refunds, complaints, poor service
- Fraud, scam, illegal activity
- Urgent or critical problems
- Complex issues you cannot solve

Always answer in a helpful, clear, and friendly way. If asked about TrustedHands, explain its features in detail. When escalation is needed, tell them: "This seems like an important issue that requires human attention. I recommend creating a support ticket so our team can help you properly. Visit the Customer Support section to create a ticket."`;

export default function BharosaChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [puterReady, setPuterReady] = useState(false);

  // Initialize puter.js
  useEffect(() => {
    if (window.puter) {
      setPuterReady(true);
    } else {
      // Wait for puter.js to load
      const checkPuter = setInterval(() => {
        if (window.puter) {
          setPuterReady(true);
          clearInterval(checkPuter);
        }
      }, 100);
      
      return () => clearInterval(checkPuter);
    }
  }, []);

  const checkForEscalation = (userMessage) => {
    const escalationKeywords = [
      'safety', 'danger', 'threat', 'harass', 'assault', 'abuse',
      'fraud', 'scam', 'dispute', 'refund', 'complaint', 'angry',
      'urgent', 'critical', 'serious', 'lawsuit', 'police', 'emergency'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return escalationKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  const sendMessage = async (text) => {
    if (!puterReady) {
      setMessages([...messages, 
        { role: "user", text },
        { role: "assistant", text: "⚠️ AI service is initializing. Please wait a moment and try again." }
      ]);
      return;
    }

    setLoading(true);
    const userMessage = { role: "user", text };
    setMessages(prev => [...prev, userMessage]);
    
    // Check if escalation is needed
    const needsEscalation = checkForEscalation(text);
    
    try {
      // Build conversation context for puter.js
      const conversationHistory = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text
      }));
      
      // Add system prompt and current message
      const prompt = `${initialPrompt}\n\nConversation history:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${text}\n\nAssistant:`;
      
      // Call puter.js AI
      const response = await window.puter.ai.chat(prompt);
      let reply = response || "Sorry, I couldn't get a response.";
      
      // Add escalation suggestion if needed
      if (needsEscalation) {
        reply += `\n\n🚨 **Important:** This seems like a critical issue that requires human attention. I strongly recommend creating a support ticket so our team can assist you properly.\n\n📋 **[Click here to create a support ticket](/customer/support)** - Our human agents will help you resolve this issue.`;
      }
      
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error('Puter.js AI error:', err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: "Sorry, I'm having trouble connecting to the AI service. Please try again in a moment. If the problem persists, please contact support at caretrustedhands@gmail.com" 
      }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        style={{
          position: "fixed", bottom: 32, right: 32, zIndex: 9999,
          background: "linear-gradient(135deg, #FDB913 0%, #F5A623 100%)", 
          color: "#000", 
          borderRadius: "50%", 
          width: 64, 
          height: 64, 
          fontSize: 32, 
          border: "2px solid #FDB913", 
          boxShadow: "0 4px 20px rgba(253, 185, 19, 0.5)",
          cursor: "pointer",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 25px rgba(253, 185, 19, 0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(253, 185, 19, 0.5)";
        }}
        onClick={() => setOpen(!open)}
        aria-label="Open TrustedHands Chatbot"
      >
        💬
      </button>
      {open && (
        <div style={{
          position: "fixed", 
          bottom: 110, 
          right: 32, 
          zIndex: 9999,
          width: 380, 
          maxHeight: 550, 
          background: "#1a1a1a", 
          borderRadius: 16, 
          boxShadow: "0 8px 40px rgba(253, 185, 19, 0.4)", 
          display: "flex", 
          flexDirection: "column",
          border: "2px solid #FDB913"
        }}>
          <div style={{ 
            padding: 20, 
            borderBottom: "2px solid #FDB913", 
            background: "linear-gradient(135deg, #FDB913 0%, #F5A623 100%)", 
            color: "#000", 
            borderTopLeftRadius: 14, 
            borderTopRightRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ fontSize: "24px" }}>🤖</span>
            <strong style={{ fontSize: "18px", fontWeight: "700" }}>TrustedHands Chatbot</strong>
          </div>
          <div style={{ 
            flex: 1, 
            overflowY: "auto", 
            padding: 16,
            background: "#0a0a0a"
          }}>
            {messages.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#888"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
                <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#FDB913" }}>
                  Welcome to TrustedHands AI Assistant!
                </p>
                <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
                  Ask me anything about our services, features, or how to use the platform.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                marginBottom: 12, 
                textAlign: msg.role === "user" ? "right" : "left" 
              }}>
                <div style={{
                  display: "inline-block", 
                  background: msg.role === "user" 
                    ? "linear-gradient(135deg, #FDB913 0%, #F5A623 100%)" 
                    : "#2a2a2a",
                  color: msg.role === "user" ? "#000" : "#fff", 
                  borderRadius: 12, 
                  padding: "10px 14px", 
                  maxWidth: "80%",
                  border: msg.role === "user" ? "2px solid #FDB913" : "2px solid #3a3a3a",
                  boxShadow: msg.role === "user" 
                    ? "0 2px 8px rgba(253, 185, 19, 0.3)" 
                    : "0 2px 8px rgba(0, 0, 0, 0.3)",
                  fontWeight: msg.role === "user" ? "600" : "400",
                  textAlign: "left"
                }}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ margin: "8px 0", lineHeight: "1.6" }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ fontWeight: "700", color: "#FDB913" }}>{children}</strong>,
                        em: ({ children }) => <em style={{ fontStyle: "italic", color: "#FFD700" }}>{children}</em>,
                        ul: ({ children }) => <ul style={{ marginLeft: "20px", marginTop: "8px", marginBottom: "8px" }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ marginLeft: "20px", marginTop: "8px", marginBottom: "8px" }}>{children}</ol>,
                        li: ({ children }) => <li style={{ marginBottom: "4px", lineHeight: "1.6" }}>{children}</li>,
                        a: ({ href, children }) => <a href={href} style={{ color: "#FDB913", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">{children}</a>,
                        h1: ({ children }) => <h1 style={{ fontSize: "1.4em", fontWeight: "700", marginTop: "12px", marginBottom: "8px", color: "#FDB913" }}>{children}</h1>,
                        h2: ({ children }) => <h2 style={{ fontSize: "1.3em", fontWeight: "700", marginTop: "10px", marginBottom: "6px", color: "#FDB913" }}>{children}</h2>,
                        h3: ({ children }) => <h3 style={{ fontSize: "1.2em", fontWeight: "600", marginTop: "8px", marginBottom: "4px", color: "#FDB913" }}>{children}</h3>,
                        code: ({ children }) => <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: "4px", fontSize: "0.9em", color: "#FFD700" }}>{children}</code>,
                        blockquote: ({ children }) => <blockquote style={{ borderLeft: "4px solid #FDB913", paddingLeft: "12px", marginTop: "8px", marginBottom: "8px", fontStyle: "italic", color: "#ccc" }}>{children}</blockquote>
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ 
                textAlign: "center", 
                color: "#FDB913",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                <span className="spinner" style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "3px solid rgba(253, 185, 19, 0.3)",
                  borderTopColor: "#FDB913",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }}></span>
                TrustedHands is typing...
              </div>
            )}
          </div>
          <form
            style={{ 
              display: "flex", 
              borderTop: "2px solid #FDB913", 
              padding: 12,
              background: "#1a1a1a"
            }}
            onSubmit={e => { 
              e.preventDefault(); 
              if (input.trim()) { 
                sendMessage(input); 
                setInput(""); 
              } 
            }}
          >
            <input
              style={{ 
                flex: 1, 
                border: "2px solid #2a2a2a", 
                outline: "none", 
                padding: 12, 
                fontSize: 16, 
                borderRadius: 8, 
                background: "#0a0a0a",
                color: "#fff",
                transition: "all 0.3s"
              }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={e => e.target.style.borderColor = "#FDB913"}
              onBlur={e => e.target.style.borderColor = "#2a2a2a"}
              placeholder="Ask TrustedHands anything..."
              disabled={loading}
            />
            <button 
              type="submit" 
              style={{ 
                marginLeft: 8, 
                background: "linear-gradient(135deg, #FDB913 0%, #F5A623 100%)", 
                color: "#000", 
                border: "2px solid #FDB913", 
                borderRadius: 8, 
                padding: "10px 20px", 
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #FFCE3D 0%, #FDB913 100%)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(253, 185, 19, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #FDB913 0%, #F5A623 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
              disabled={loading}
            >
              Send
            </button>
          </form>
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
