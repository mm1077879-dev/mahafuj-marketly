import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessOrder, matchesOrderContact } from './orderAccess';

const guestOrder = {
  customer: {
    email: 'buyer@example.com',
    phone: '+880 1712-345678',
  },
  shippingAddress: {
    email: 'buyer@example.com',
    phone: '+880 1712-345678',
  },
};

test('guest order access requires both matching contact details', () => {
  assert.equal(
    matchesOrderContact(guestOrder, { email: ' BUYER@example.com ', phone: '01712-345678' }),
    true
  );
  assert.equal(matchesOrderContact(guestOrder, { email: 'buyer@example.com' }), false);
  assert.equal(
    matchesOrderContact(guestOrder, { email: 'other@example.com', phone: '+8801712345678' }),
    false
  );
});

test('account order ownership cannot be claimed with a matching email alone', () => {
  const accountOrder = {
    customer: {
      userId: 'user-1',
      email: 'buyer@example.com',
    },
  };

  assert.equal(canAccessOrder(accountOrder, { id: 'user-1', email: 'buyer@example.com' }), true);
  assert.equal(canAccessOrder(accountOrder, { id: 'user-2', email: 'buyer@example.com' }), false);
  assert.equal(canAccessOrder(guestOrder, { id: 'user-2', email: 'buyer@example.com' }), true);
});
