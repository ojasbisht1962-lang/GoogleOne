import React, { useEffect, useState } from 'react';
import config from '../../config';
import LoadingScreen from '../../components/LoadingScreen';
import './ContactMessages.css';

export default function ContactMessages() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/contact-messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading Contact Messages..." />;

  return (
    <div className="contact-messages-page">
      <div className="contact-messages-container">
        <h2>Contact Messages</h2>
        <table className="contact-messages-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Subject</th>
              <th>Message</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr><td colSpan={5}>No messages found.</td></tr>
            ) : (
              messages.map((msg, idx) => (
                <tr key={idx}>
                  <td>{msg.name}</td>
                  <td>{msg.email}</td>
                  <td>{msg.subject}</td>
                  <td>{msg.message}</td>
                  <td>{msg.created_at ? new Date(msg.created_at).toLocaleString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
