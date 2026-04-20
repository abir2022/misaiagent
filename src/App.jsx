import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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

      // 1. Fetch entire context (since dataset is small: ~28 teachers, ~6 programs)
      // This allows the LLM to act as the ultimate search engine
      const { data: teachers } = await supabase.from('teachers').select('*');
      const { data: programs } = await supabase.from('programs').select('*');

      // 2. Format detailed context
      const context = `
        DEPARTMENT DATA
        Teachers:
        ${teachers?.map(t => `
          - Name: ${t.name}
          - Designation: ${t.designation || 'N/A'}
          - Image URL: ${t.image_url || ''}
          - Profile URL: ${t.profile_url || ''}
          - Phone: ${t.metadata?.phone || 'N/A'}
          - Email: ${t.metadata?.email || 'N/A'}
          - Room: ${t.metadata?.room || 'N/A'}
          - Biography & Background: ${t.metadata?.bio || 'N/A'}
        `).join('\n')}

        Programs:
        ${programs?.map(p => `
          - Title: ${p.title}
          - Duration: ${p.duration || 'N/A'}
          - Overview: ${p.overview || 'N/A'}
          - URL: ${p.program_url || ''}
        `).join('\n')}
      `;

      // 3. System Prompt specifying Markdown usage and fuzzy matching
      const systemPrompt = `You are the official AI assistant for the Management Information Systems (MIS) Department of Dhaka University.
Your job is to accurately answer user questions using ONLY the provided DEPARTMENT DATA context.
CRITICAL INSTRUCTIONS:
1. When a user asks about a specific person (teacher/faculty/staff), you MUST use Markdown to format their profile.
2. If an Image URL is available for a person, display it exactly like this at the top of their profile: ![Profile Picture](Image URL)
3. Include all available details cleanly (Biography, Phone, Email, Room, Profile link).
4. FUZZY MATCHING: Users may enter short names or wrongly spelled names (e.g., "Rakb" instead of "Rakibul"). You MUST intelligently find the closest matching faculty member based on the context and provide their full profile.
5. PROGRAM REPORTS: If asked about a program (e.g., EMBA, BBA, PhD), you MUST provide a comprehensive, well-structured report. Use Markdown headers for sections like "Admission Requirements", "Credit System", and "List of Courses". Use bullet points and bold text to make it highly readable based on the extensive data provided in the overview.
6. Do not make up information that is not in the context.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: `Context:\n${context}\n\nUser Question: ${currentQuery}` }
      ];

      // 4. Call Groq AI
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
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown className="markdown-content">{msg.content}</ReactMarkdown>
                  )}
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
