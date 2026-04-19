import React, { useState } from 'react';
import './index.css';
import logo from '../DU logo.png';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // 1. Fetch Context from Supabase
      const { data: teachers } = await supabase.from('teachers').select('*').ilike('name', `%${query}%`).limit(3);
      const { data: programs } = await supabase.from('programs').select('*').ilike('title', `%${query}%`).limit(2);

      const context = `
        Teachers: ${teachers?.map(t => `${t.name} (${t.designation})`).join(', ')}
        Programs: ${programs?.map(p => `${p.title}: ${p.overview}`).join('; ')}
      `;

      // 2. Call Groq AI
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an AI assistant for the MIS Department of Dhaka University. Use the provided context to answer the user query. Be professional and helpful.' },
            { role: 'user', content: `Context: ${context}\n\nUser Question: ${query}` }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
      }

      const aiData = await response.json();
      const aiAnswer = aiData.choices && aiData.choices[0] ? aiData.choices[0].message.content : "No answer generated.";

      setResults([{ 
        title: 'AI Agent Response', 
        content: aiAnswer,
        isAI: true 
      }]);

    } catch (error) {
      console.error('Search error:', error);
      setResults([{ 
        title: 'Error', 
        content: `AI Brain Error: ${error.message}. Please check your API keys and restart the server.` 
      }]);
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

      {loading && (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      )}

      <main className="app-main">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Ask about teachers, courses, programs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>

        <section className="results-section">
          {results.length === 0 ? (
            <p className="placeholder-text">Enter a question to see results.</p>
          ) : (
            results.map((item, idx) => (
              <div key={idx} className="result-card glass">
                <div className="result-header">
                  {item.image && <img src={item.image} alt={item.title} className="result-thumb" />}
                  <h3>{item.title}</h3>
                </div>
                <p className="result-content">{item.content}</p>
                {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="result-link">View Details →</a>}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
