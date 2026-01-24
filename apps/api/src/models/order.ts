import type { ModelDefinition } from '@arbi/data';

/**
 * Order Model
 * Stores customer orders for automated fulfillment
 */
const OrderModel: ModelDefinition = {
  name: 'Order',
  attributes: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
      allowNull: false
    },
    orderId: {
      type: 'string',
      unique: true,
      allowNull: false
    },
    stripeSessionId: {
      type: 'string',
      unique: true,
      allowNull: false
    },
    listingId: {
      type: 'string',
      allowNull: false
    },
    quantity: {
      type: 'integer',
      allowNull: false,
      defaultValue: 1
    },
    customerEmail: {
      type: 'string',
      allowNull: false
    },
    customerName: {
      type: 'string',
      allowNull: true
    },
    shippingAddress: {
      type: 'json', // Stripe shipping address object
      allowNull: false
    },
    amountPaid: {
      type: 'decimal',
      allowNull: false
    },
    supplierPrice: {
      type: 'decimal',
      allowNull: false
    },
    estimatedProfit: {
      type: 'decimal',
      allowNull: false
    },
    supplierUrl: {
      type: 'text',
      allowNull: true
    },
    supplierOrderId: {
      type: 'string',
      allowNull: true // Set when order is placed with supplier
    },
    trackingNumber: {
      type: 'string',
      allowNull: true // Set when supplier ships
    },
    trackingCarrier: {
      type: 'string',
      allowNull: true
    },
    status: {
      type: 'string',
      allowNull: false,
      defaultValue: 'payment_received'
      // payment_received -> purchasing_from_supplier -> shipped -> delivered -> refunded
    },
    fulfillmentStatus: {
      type: 'string',
      allowNull: false,
      defaultValue: 'pending'
      // pending -> processing -> fulfilled -> failed
    },
    createdAt: {
      type: 'timestamp',
      allowNull: false,
      defaultValue: 'CURRENT_TIMESTAMP'
    },
    updatedAt: {
      type: 'timestamp',
      allowNull: false,
      defaultValue: 'CURRENT_TIMESTAMP'
    },
    shippedAt: {
      type: 'timestamp',
      allowNull: true
    },
    deliveredAt: {
      type: 'timestamp',
      allowNull: true
    }
  },
  indexes: [
    {
      name: 'idx_order_stripe_session',
      columns: ['stripeSessionId']
    },
    {
      name: 'idx_order_listing',
      columns: ['listingId']
    },
    {
      name: 'idx_order_status',
      columns: ['status']
    },
    {
      name: 'idx_order_email',
      columns: ['customerEmail']
    }
  ]
};

export default OrderModel;
