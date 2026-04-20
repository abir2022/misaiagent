import React, { useState, useRef, useEffect } from 'react';
import './index.css';
import logo from '../DU logo.png';

function App() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    const currentQuery = query;
    
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // 1. Fetch Context from Supabase based on the current query
      const { data: teachers } = await supabase.from('teachers').select('*').ilike('name', `%${currentQuery}%`).limit(3);
      const { data: programs } = await supabase.from('programs').select('*').ilike('title', `%${currentQuery}%`).limit(2);

      const context = `
        Teachers: ${teachers?.map(t => `${t.name} (${t.designation})`).join(', ')}
        Programs: ${programs?.map(p => `${p.title}: ${p.overview}`).join('; ')}
      `;

      // 2. Prepare Messages for Groq API
      // Only attach context to the latest user question behind the scenes
      const apiMessages = [
        { role: 'system', content: 'You are an AI assistant for the MIS Department of Dhaka University. Use the provided context to answer the user query. Be professional and helpful.' },
        ...chatHistory,
        { role: 'user', content: `Context: ${context}\n\nUser Question: ${currentQuery}` }
      ];

      // 3. Call Groq AI
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: apiMessages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
      }

      const aiData = await response.json();
      const aiAnswer = aiData.choices && aiData.choices[0] ? aiData.choices[0].message.content : "No answer generated.";

      setChatHistory(prev => [...prev, { role: 'assistant', content: aiAnswer }]);

    } catch (error) {
      console.error('Search error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `AI Brain Error: ${error.message}. Please check your API keys and restart the server.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass">
        <img src={logo} alt="DU Logo" className="logo" />
        <h1 className="title">MIS AI Agent</h1>
      </header>

      <main className="app-main">
        <section className="chat-container">
          {chatHistory.length === 0 ? (
            <p className="placeholder-text">Enter a question to start the conversation.</p>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className={`message-bubble ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message-row ai">
              <div className="message-bubble ai-message" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </section>

        <form className="chat-input-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Ask about teachers, courses, programs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            disabled={loading}
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
