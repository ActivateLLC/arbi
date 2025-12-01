import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PaymentModal from './components/PaymentModal';
import './components/PaymentModal.css';

// --- Types ---
interface MarketplaceListing {
  listingId: string;
  productTitle: string;
  productDescription: string;
  productImages: string[];
  marketplacePrice: number;
  status: string;
}

type MessageRole = 'user' | 'ai';
type WidgetType = 'none' | 'product-grid' | 'checkout-success' | 'loading';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  widget?: {
    type: WidgetType;
    data?: any;
  };
}

// --- Components ---

const ProductGrid = ({ listings, onBuy }: { listings: MarketplaceListing[], onBuy: (l: MarketplaceListing) => void }) => (
  <div className="product-grid">
    {listings.map(listing => (
      <div key={listing.listingId} className="product-card">
        <img 
          src={listing.productImages[0] || 'https://via.placeholder.com/300'} 
          alt={listing.productTitle} 
          className="product-image"
        />
        <div className="product-info">
          <div className="product-title">{listing.productTitle}</div>
          <div className="product-price">${listing.marketplacePrice.toFixed(2)}</div>
          <button className="buy-btn" onClick={() => onBuy(listing)}>
            Buy Now
          </button>
        </div>
      </div>
    ))}
  </div>
);

const LoadingIndicator = () => (
  <div className="flex gap-2 p-2">
    <span className="animate-bounce">●</span>
    <span className="animate-bounce delay-100">●</span>
    <span className="animate-bounce delay-200">●</span>
  </div>
);

const CheckoutSuccess = ({ order }: { order: any }) => (
  <div style={{ padding: '1rem', background: '#16a34a20', borderRadius: '0.5rem', marginTop: '1rem' }}>
    <h4 style={{ color: '#4ade80', fontWeight: 'bold' }}>🎉 Purchase Complete!</h4>
    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
      Order ID: {order.orderId} <br />
      Amount: ${order.amountPaid.toFixed(2)}
    </p>
    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
      Your item is being processed for direct shipment.
    </p>
  </div>
);


// --- Main App ---

const INITIAL_MESSAGE = `Welcome to the Arbi Command Center.

Your autonomous scouting missions are running in the background.

You can monitor activity here or issue new commands.`;

// --- Main App ---

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'ai', 
      text: INITIAL_MESSAGE,
      widget: { type: 'none' }
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Voice Logic (Web Speech API) ---
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  // --- Action Handlers ---

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 2. Add AI Loading State
    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: loadingId, role: 'ai', text: 'Thinking...', widget: { type: 'loading' } }]);

    try {
      // 3. Process Intent (Simple Heuristics for Demo)
      const lowerText = text.toLowerCase();
      let aiResponseText = '';
      let widgetType: WidgetType = 'none';
      let widgetData = null;

      if (lowerText.includes('deal') || lowerText.includes('product') || lowerText.includes('show') || lowerText.includes('find')) {
        // Fetch listings
        const res = await axios.get('/api/marketplace/listings');
        const listings = res.data.listings;
        
        aiResponseText = `I found ${listings.length} active opportunities for you. Here are the best ones:`;
        widgetType = 'product-grid';
        widgetData = listings;
      } else if (lowerText.includes('hello') || lowerText.includes('hi')) {
        aiResponseText = "Hello! Ready to make some money? What are you looking for today?";
      } else {
        // Fallback to AI chat (mocked for now, or connect to your /api/ai/completion)
        aiResponseText = "I can help with that. Currently I'm optimized for finding deals. Try asking 'Show me deals'.";
      }

      // 4. Update AI Message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { id: loadingId, role: 'ai', text: aiResponseText, widget: { type: widgetType, data: widgetData } }
          : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { id: loadingId, role: 'ai', text: "Sorry, I had trouble connecting to the marketplace.", widget: { type: 'none' } }
          : msg
      ));
    }
  };

  const handleBuy = (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setIsPaymentModalOpen(true);
  };

  const handleSuccessfulCheckout = (order: any) => {
    setIsPaymentModalOpen(false);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'ai',
        text: `Great news! Your purchase for "${selectedListing?.productTitle}" was successful.`,
        widget: {
          type: 'checkout-success',
          data: order,
        }
      }
    ]);
    setSelectedListing(null);
  };

  return (
    <div className="app-root">
      {/* Chat Container */}
      <div className="chat-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'ai' ? '🤖' : '👤'}
            </div>
            <div className="content-wrapper" style={{ maxWidth: '100%' }}>
              <div className="bubble">
                {msg.text}
              </div>
              
              {/* Generative Widgets */}
              {msg.widget?.type === 'product-grid' && (
                <div className="widget-container">
                  <ProductGrid listings={msg.widget.data} onBuy={handleBuy} />
                </div>
              )}
              
              {msg.widget?.type === 'loading' && (
                <div className="widget-container">
                  <LoadingIndicator />
                </div>
              )}

              {msg.widget?.type === 'checkout-success' && (
                <div className="widget-container">
                  <CheckoutSuccess order={msg.widget.data} />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-wrapper">
          <button 
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={startListening}
            title="Speak"
          >
            🎤
          </button>
          <input 
            type="text" 
            className="text-input"
            placeholder="Type or speak..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          />
          <button 
            className="voice-btn" 
            style={{ background: 'var(--accent)' }}
            onClick={() => handleSend(input)}
          >
            ➤
          </button>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        listing={selectedListing}
        onSuccessfulCheckout={handleSuccessfulCheckout}
      />
    </div>
  );
}

export default App;
