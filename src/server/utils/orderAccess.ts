export interface OrderAccessUser {
  id: string;
  email: string;
  role?: string;
}

export interface OrderContact {
  email?: unknown;
  phone?: unknown;
}

interface OrderAccessRecord {
  customer?: {
    userId?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    email?: string;
    phone?: string;
  };
}

const normalizeBangladeshPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
};

export const matchesOrderContact = (order: OrderAccessRecord, contact: OrderContact): boolean => {
  if (typeof contact.email !== 'string' || typeof contact.phone !== 'string') return false;

  const email = contact.email.trim().toLowerCase();
  const phone = normalizeBangladeshPhone(contact.phone);
  const orderEmail = (order.shippingAddress?.email || order.customer?.email || '').trim().toLowerCase();
  const orderPhone = normalizeBangladeshPhone(order.shippingAddress?.phone || order.customer?.phone || '');

  return Boolean(email && phone && email === orderEmail && phone === orderPhone);
};

export const canAccessOrder = (order: OrderAccessRecord, user: OrderAccessUser): boolean => {
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (order.customer?.userId) return order.customer.userId === user.id;

  return Boolean(
    user.email &&
      order.customer?.email &&
      user.email.trim().toLowerCase() === order.customer.email.trim().toLowerCase()
  );
};
