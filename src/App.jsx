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
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Search in teachers
      const { data: teachers } = await supabase
        .from('teachers')
        .select('*')
        .ilike('name', `%${query}%`);

      // Search in programs
      const { data: programs } = await supabase
        .from('programs')
        .select('*')
        .ilike('title', `%${query}%`);

      const allResults = [
        ...(teachers || []).map(t => ({ 
          title: t.name, 
          content: t.designation, 
          image: t.image_url, 
          link: t.profile_url 
        })),
        ...(programs || []).map(p => ({ 
          title: p.title, 
          content: p.overview, 
          image: null, 
          link: p.program_url 
        }))
      ];

      if (allResults.length > 0) {
        setResults(allResults);
      } else {
        setResults([{ title: 'No Results', content: `No matches found for "${query}".` }]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([{ title: 'Error', content: 'Connection failed.' }]);
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
