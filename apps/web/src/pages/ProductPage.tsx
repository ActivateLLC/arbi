import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import PaymentModal from '../components/PaymentModal';
import './ProductPage.css';

// --- Types ---
interface MarketplaceListing {
  listingId: string;
  productTitle: string;
  productDescription: string;
  productImages: string[];
  marketplacePrice: number;
  sourcePrice: number;
  potentialProfit: number;
  status: string;
}

const ProductPage = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/marketplace/listings/${listingId}`);
        setListing(response.data);
        if (response.data.productImages && response.data.productImages.length > 0) {
          setSelectedImage(response.data.productImages[0]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load product. It might have been sold or is no longer available.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  const handleSuccessfulCheckout = (order: any) => {
    setIsPaymentModalOpen(false);
    // Potentially redirect to a thank you page or show a success message
    alert(`Purchase successful! Your order ID is ${order.orderId}`);
  };

  if (isLoading) {
    return <div className="product-page-loading">Loading Product...</div>;
  }

  if (error) {
    return <div className="product-page-error">{error}</div>;
  }

  if (!listing) {
    return <div className="product-page-error">Product not found.</div>;
  }

  return (
    <div className="product-page-container">
      <motion.div 
        className="product-page-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="product-gallery">
          <div className="main-image-container">
            {selectedImage && <img src={selectedImage} alt={listing.productTitle} className="main-image" />}
          </div>
          <div className="thumbnail-container">
            {listing.productImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Thumbnail ${index + 1}`}
                className={`thumbnail-image ${selectedImage === img ? 'selected' : ''}`}
                onClick={() => setSelectedImage(img)}
                onMouseEnter={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>
        <div className="product-details">
          <motion.h1 
            className="product-title-main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {listing.productTitle}
          </motion.h1>
          <motion.p 
            className="product-description-main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {listing.productDescription}
          </motion.p>
          <motion.div 
            className="price-container"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <span className="price-main">${listing.marketplacePrice.toFixed(2)}</span>
            <span className="price-original">${(listing.marketplacePrice * 1.4).toFixed(2)}</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <button className="buy-button-main" onClick={() => setIsPaymentModalOpen(true)}>
              Buy Now
            </button>
          </motion.div>
          <div className="trust-badges">
            <span>✓ Secure Checkout with Stripe</span>
            <span>✓ Fast & Free Shipping</span>
          </div>
        </div>
      </motion.div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        listing={listing}
        onSuccessfulCheckout={handleSuccessfulCheckout}
      />
    </div>
  );
};

export default ProductPage;
