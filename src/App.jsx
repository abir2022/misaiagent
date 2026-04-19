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
    // TODO: replace with real Supabase edge function
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResults([{ title: 'You searched for', content: query }]);
    setLoading(false);
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
                <h3>{item.title}</h3>
                <p>{item.content}</p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
