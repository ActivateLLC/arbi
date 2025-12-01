import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';
import './PaymentModal.css';

// --- Types ---
interface MarketplaceListing {
  listingId: string;
  productTitle: string;
  marketplacePrice: number;
}

// --- Checkout Form ---
const CheckoutForm = ({ listing, onSuccessfulCheckout, onClose }: { listing: MarketplaceListing, onSuccessfulCheckout: (order: any) => void, onClose: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }
    
    setProcessing(true);
    setError(null);

    const { error: createPaymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        email: email,
      },
    });

    if (createPaymentMethodError) {
      setError(createPaymentMethodError.message || 'An unknown error occurred.');
      setProcessing(false);
      return;
    }

    try {
      const { data } = await axios.post('/api/marketplace/checkout', {
        listingId: listing.listingId,
        buyerEmail: email,
        paymentMethodId: paymentMethod.id,
        // Dummy shipping address for now
        shippingAddress: {
          name: 'Guest Buyer',
          line1: '123 Guest Lane',
          city: 'Anytown',
          state: 'CA',
          postal_code: '12345',
          country: 'US',
        },
      });

      onSuccessfulCheckout(data.order);

    } catch (apiError: any) {
      setError(apiError.response?.data?.message || 'Checkout failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="text-input"
          required
          style={{ width: '100%', background: '#0f172a', padding: '12px 15px', borderRadius: '0.5rem' }}
        />
      </div>
      <div className="form-row">
        <CardElement options={{
          style: {
            base: {
              color: '#f8fafc',
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              '::placeholder': {
                color: '#94a3b8',
              },
            },
            invalid: {
              color: '#f87171',
            },
          },
        }} />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button type="submit" className="submit-btn" disabled={!stripe || processing}>
        {processing ? 'Processing...' : `Pay $${listing.marketplacePrice.toFixed(2)}`}
      </button>
    </form>
  );
};


// --- Main Modal Component ---
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const PaymentModal = ({ listing, isOpen, onClose, onSuccessfulCheckout }: { listing: MarketplaceListing | null, isOpen: boolean, onClose: () => void, onSuccessfulCheckout: (order: any) => void }) => {
  if (!isOpen || !listing) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Complete Your Purchase</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>You are purchasing: <strong>{listing.productTitle}</strong></p>
        <Elements stripe={stripePromise}>
          <CheckoutForm listing={listing} onSuccessfulCheckout={onSuccessfulCheckout} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
};

export default PaymentModal;
