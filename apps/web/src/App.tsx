import React, { useState } from 'react';
import axios from 'axios';

interface AIResponse {
  result: {
    content: string;
  };
}

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await axios.post<AIResponse>('/api/ai/completion', {
        input,
        temperature: 0.7,
        maxTokens: 1000,
      });

      setResponse(result.data.result.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🤖 Arbi AI Platform</h1>
        <p>Advanced AI Orchestration & Automation Services</p>
      </header>

      <div className="services">
        <div className="service-card">
          <h3>AI Completion API</h3>
          <p>Access powerful GPT-4 powered AI completions for your applications</p>
          <div className="price">
            $0.10 <span className="price-unit">per request</span>
          </div>
          <ul className="features">
            <li>GPT-4 powered responses</li>
            <li>Customizable temperature & tokens</li>
            <li>JSON API access</li>
            <li>99.9% uptime SLA</li>
          </ul>
          <button className="btn">Get API Key</button>
        </div>

        <div className="service-card">
          <h3>Voice AI Interface</h3>
          <p>Speech recognition and synthesis powered by Whisper & ElevenLabs</p>
          <div className="price">
            $0.05 <span className="price-unit">per minute</span>
          </div>
          <ul className="features">
            <li>Whisper speech recognition</li>
            <li>ElevenLabs voice synthesis</li>
            <li>Wake word detection</li>
            <li>Real-time processing</li>
          </ul>
          <button className="btn">Get API Key</button>
        </div>

        <div className="service-card">
          <h3>Web Automation</h3>
          <p>Automate web browsing tasks with AI-powered browser control</p>
          <div className="price">
            $0.25 <span className="price-unit">per task</span>
          </div>
          <ul className="features">
            <li>AI-controlled browsing</li>
            <li>Data extraction</li>
            <li>Form automation</li>
            <li>Screenshot capture</li>
          </ul>
          <button className="btn">Get API Key</button>
        </div>
      </div>

      <div className="demo-section">
        <h2>Try AI Completion (Free Demo)</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="input">Ask me anything:</label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Write a professional email introducing our AI platform to potential customers..."
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Processing...' : 'Generate Response'}
          </button>
        </form>

        {loading && <div className="loading">Processing your request...</div>}

        {response && (
          <div className="response">
            <h4>AI Response:</h4>
            <p>{response}</p>
          </div>
        )}

        {error && (
          <div className="response error">
            <h4>Error:</h4>
            <p>{error}</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>&copy; 2025 Arbi AI Platform. Powered by OpenAI, Whisper, ElevenLabs & Hyperswitch.</p>
      </footer>
    </div>
  );
}

export default App;
