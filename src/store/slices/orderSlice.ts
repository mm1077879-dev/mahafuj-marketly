import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order, OrderStatus } from '../../types';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
}

const initialOrders: Order[] = [
  {
    id: 'ord_1042',
    orderNumber: 'MKT-2026-1042',
    customer: {
      userId: 'usr_cust_2',
      name: 'Emily Johnson',
      email: 'emily.johnson@example.com',
      phone: '+880 1819-987654',
    },
    shippingAddress: {
      fullName: 'Emily Johnson',
      phone: '+880 1819-987654',
      email: 'emily.johnson@example.com',
      division: 'Chittagong',
      district: 'Chittagong',
      upazila: 'Panchlaish',
      union: 'GEC Circle',
      streetAddress: 'Apartment 5B, Rose Valley, Nasirabad',
      postalCode: '4000',
    },
    items: [
      {
        productId: '1',
        variantId: 'v1_2',
        name: "Men's Air Sneakers Running Shoes",
        sku: 'NK-AIR-001-42-WHT',
        price: 59.99,
        quantity: 1,
        image: '/src/assets/images/sneakers_white_air_1790933024489.jpg',
        selectedAttributes: { size: '42', color: 'Pure White' },
      },
      {
        productId: '2',
        variantId: 'v2_1',
        name: 'Premium Wireless Earbuds Pro',
        sku: 'SNY-WF-WHT',
        price: 69.99,
        quantity: 1,
        image: '/src/assets/images/earbuds_pro_white_1790933037064.jpg',
        selectedAttributes: { color: 'Glacier White' },
      },
    ],
    subtotal: 129.98,
    discount: 0,
    shippingFee: 0,
    total: 129.98,
    paymentMethod: 'cod',
    paymentStatus: 'Pending',
    orderStatus: 'Shipped',
    statusHistory: [
      { status: 'Confirmed', timestamp: '2026-09-30T10:14:00Z', note: 'Cash on Delivery order confirmed; collection is still pending.' },
      { status: 'Processing', timestamp: '2026-09-30T14:30:00Z', note: 'Quality inspect & gift packaging complete' },
      { status: 'Shipped', timestamp: '2026-10-01T09:00:00Z', note: 'Dispatched via Paperfly Express (Tracking #PF-88392)' },
    ],
    createdAt: '2026-09-30T10:12:00Z',
  },
];

const initialState: OrderState = {
  orders: initialOrders,
  currentOrder: null,
};

export const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    createOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
      state.currentOrder = action.payload;
    },
    updateOrderStatus: (
      state,
      action: PayloadAction<{ orderId: string; status: OrderStatus; note?: string }>
    ) => {
      const order = state.orders.find((o) => o.id === action.payload.orderId || o.orderNumber === action.payload.orderId);
      if (order) {
        order.orderStatus = action.payload.status;
        order.statusHistory.push({
          status: action.payload.status,
          timestamp: new Date().toISOString(),
          note: action.payload.note,
        });
      }
    },
    updatePaymentState: (
      state,
      action: PayloadAction<{
        orderId: string;
        paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded' | 'Cancelled';
        orderStatus?: OrderStatus;
        note?: string;
      }>
    ) => {
      const order = state.orders.find(
        (o) => o.id === action.payload.orderId || o.orderNumber === action.payload.orderId
      );
      if (order) {
        order.paymentStatus = action.payload.paymentStatus;
        if (action.payload.orderStatus) {
          order.orderStatus = action.payload.orderStatus;
        }
        if (action.payload.note) {
          order.statusHistory.push({
            status: action.payload.orderStatus || order.orderStatus,
            timestamp: new Date().toISOString(),
            note: action.payload.note,
          });
        }
      }
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
  },
});

export const {
  createOrder,
  updateOrderStatus,
  updatePaymentState,
  setCurrentOrder,
} = orderSlice.actions;

export const selectAllOrders = (state: { orders: OrderState }) => state.orders.orders;
export const selectCurrentOrder = (state: { orders: OrderState }) => state.orders.currentOrder;
export const selectOrderByNumber = (orderNumber: string) => (state: { orders: OrderState }) =>
  state.orders.orders.find(
    (o) =>
      o.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase() ||
      o.id.toLowerCase() === orderNumber.trim().toLowerCase()
  );

export default orderSlice.reducer;
