import assert from 'node:assert/strict';
import test from 'node:test';
import uiReducer, { addNotification, removeNotification } from './uiSlice';

test('notifications are newest first and dismiss independently', () => {
  let state = uiReducer(undefined, { type: 'test/init' });
  state = uiReducer(state, addNotification({ type: 'info', message: 'First' }));
  state = uiReducer(state, addNotification({ type: 'success', message: 'Second' }));
  state = uiReducer(state, addNotification({ type: 'error', message: 'Third' }));

  assert.deepEqual(
    state.notifications.map((notification) => notification.message),
    ['Third', 'Second', 'First']
  );
  assert.equal(new Set(state.notifications.map((notification) => notification.id)).size, 3);

  const dismissedId = state.notifications[1].id;
  state = uiReducer(state, removeNotification(dismissedId));

  assert.deepEqual(
    state.notifications.map((notification) => notification.message),
    ['Third', 'First']
  );
});

test('notification queue keeps only the five most recent messages', () => {
  let state = uiReducer(undefined, { type: 'test/init' });

  for (let index = 1; index <= 7; index += 1) {
    state = uiReducer(state, addNotification({ type: 'info', message: `Message ${index}` }));
  }

  assert.deepEqual(
    state.notifications.map((notification) => notification.message),
    ['Message 7', 'Message 6', 'Message 5', 'Message 4', 'Message 3']
  );
});
