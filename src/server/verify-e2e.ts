// Comprehensive End-to-End Production Verification Script
import http from 'http';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];
const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';

async function request(path: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      `${baseUrl}${path}`,
      {
        method: options.method || 'GET',
        headers,
        timeout: 5000,
      },
      (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 0, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function assert(condition: boolean, suite: string, test: string, details?: string) {
  if (condition) {
    results.push({ suite, test, status: 'PASS', details });
    console.log(`  ✅ [PASS] ${test}`);
  } else {
    results.push({ suite, test, status: 'FAIL', details });
    console.error(`  ❌ [FAIL] ${test} - ${details || 'Assertion failed'}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('MARKETLY API & PAYMENT-INTEGRITY VERIFICATION');
  console.log('====================================================\n');

  // 1. Health & Database Mode Check
  console.log('👉 Suite 1: System Health & Database Mode');
  try {
    const health = await request('/api/health');
    assert(health.status === 200, 'Health', 'GET /api/health responds with 200 OK');
    assert(health.body.status === 'healthy', 'Health', 'System reports healthy status');
    assert(typeof health.body.database === 'object', 'Health', 'Database status block present');
  } catch (err: any) {
    assert(false, 'Health', 'Health check reachable', err.message);
  }

  // 2. Authentication & Security Audit
  console.log('\n👉 Suite 2: Authentication & Security Controls');
  let adminToken = '';
  let customerToken = '';
  let customerUserId = '';

  try {
    // 2a. Admin Login
    const adminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@marketly.com', password: process.env.ADMIN_PASSWORD || 'Siam12345!' },
    });
    assert(adminLogin.status === 200, 'Auth', 'Admin login succeeds with valid credentials');
    assert(adminLogin.body.user?.role === 'super_admin' || adminLogin.body.user?.role === 'admin', 'Auth', 'Admin login returns admin role');
    assert(!!adminLogin.body.token, 'Auth', 'Admin login returns cryptographic JWT');
    adminToken = adminLogin.body.token;

    // 2b. Customer Login
    const customerLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'customer@marketly.com', password: 'Customer@2026!' },
    });
    assert(customerLogin.status === 200, 'Auth', 'Customer login succeeds with valid credentials');
    assert(customerLogin.body.user?.role === 'customer', 'Auth', 'Customer login returns customer role');
    customerToken = customerLogin.body.token;
    customerUserId = customerLogin.body.user?.id;

    // 2c. Invalid Login Credentials
    const badLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@marketly.com', password: 'WrongPassword!' },
    });
    assert(badLogin.status === 401, 'Auth', 'Invalid password rejected with 401 Unauthorized');

    // 2d. Fake / Tampered JWT Authentication
    const tampered = await request('/api/v1/auth/me', {
      headers: { Authorization: 'Bearer this.is.a.tampered.token' },
    });
    assert(tampered.status === 401, 'Auth', 'Tampered JWT rejected with 401 Unauthorized');

    // 2e. Verification of x-demo-role backdoor removal
    const backdoorAttempt = await request('/api/v1/admin/dashboard', {
      headers: { 'x-demo-role': 'admin' },
    });
    assert(backdoorAttempt.status === 401, 'Auth', 'x-demo-role header backdoor is rejected (401)');

    // 2f. Google & Facebook OAuth endpoints
    const googleUrlRes = await request('/api/v1/auth/google/url');
    // If client ID configured or missing, returns appropriate structured JSON
    assert(googleUrlRes.status === 200 || googleUrlRes.status === 400, 'Auth', 'GET /api/v1/auth/google/url responds safely');
    const fbUrlRes = await request('/api/v1/auth/facebook/url');
    assert(fbUrlRes.status === 200 || fbUrlRes.status === 400, 'Auth', 'GET /api/v1/auth/facebook/url responds safely');
  } catch (err: any) {
    assert(false, 'Auth', 'Authentication suite execution', err.message);
  }

  // 3. Email Verification & Password Reset Flow
  console.log('\n👉 Suite 3: Email Verification & Password Reset Security');
  try {
    const testEmail = `audit_user_${Date.now()}@example.com`;
    const regRes = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { name: 'Audit User', email: testEmail, password: 'SecurePassword2026!' },
    });
    assert(regRes.status === 201, 'Email & Reset', 'User registration succeeds with 201 Created');
    assert(regRes.body.user?.isEmailVerified === false, 'Email & Reset', 'New user is unverified by default');

    const rapidResendRes = await request('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: { email: testEmail },
    });
    assert(rapidResendRes.status === 429, 'Email & Reset', 'Rapid re-request triggers 429 rate limit security');

    const badVerify = await request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: { token: 'invalid_nonexistent_token' },
    });
    assert(badVerify.status === 400, 'Email & Reset', 'Invalid verification token rejected with 400 Bad Request');
  } catch (err: any) {
    assert(false, 'Email & Reset', 'Email & reset suite execution', err.message);
  }

  // 4. Role-Based Access Control (RBAC) & Privilege Separation
  console.log('\n👉 Suite 4: Role-Based Access Control (RBAC) & Privilege Separation');
  try {
    const customerAdminDash = await request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerAdminDash.status === 403, 'RBAC', 'Customer account blocked from /admin/dashboard with 403 Forbidden');

    const adminDash = await request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDash.status === 200, 'RBAC', 'Admin account successfully accesses /admin/dashboard (200 OK)');
  } catch (err: any) {
    assert(false, 'RBAC', 'RBAC suite execution', err.message);
  }

  // 5. Cross-Lingual Bangla-English Search & Catalog
  console.log('\n👉 Suite 5: Cross-Lingual Bangla-English Catalog Search');
  try {
    const engSearch = await request('/api/v1/products?search=watch');
    assert(engSearch.status === 200, 'Search', 'English query "watch" responds 200 OK');
    assert(engSearch.body.data?.length > 0, 'Search', 'English query "watch" returns matching products');

    const banglaWatch = await request(`/api/v1/products?search=${encodeURIComponent('ঘড়ি')}`);
    assert(banglaWatch.status === 200, 'Search', 'Bangla query "ঘড়ি" responds 200 OK');
    assert(banglaWatch.body.data?.length > 0, 'Search', 'Bangla query "ঘড়ি" matches watch products across languages');
  } catch (err: any) {
    assert(false, 'Search', 'Search suite execution', err.message);
  }

  // 6. Order Lifecycle & Customer Data Isolation
  console.log('\n👉 Suite 6: Order Lifecycle & Customer Isolation');
  let placedOrderNumber = '';
  let placedOrderTotal = 0;
  let order2Num = '';

  try {
    const orderRes = await request('/api/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer: {
          userId: customerUserId,
          email: 'customer@marketly.com',
          phone: '+8801712345678',
        },
        shippingAddress: {
          fullName: 'Audit Customer',
          phone: '+8801712345678',
          email: 'customer@marketly.com',
          streetAddress: 'House 42, Road 11, Banani',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Banani',
        },
        items: [
          {
            productId: '1',
            name: 'Chronograph Black Dial Watch',
            price: 250,
            quantity: 1,
          },
        ],
        paymentMethod: 'cod',
      },
    });

    assert(orderRes.status === 201, 'Orders', 'Order placement returns 201 Created');
    assert(orderRes.body.data?.orderStatus === 'Confirmed', 'Orders', 'COD order confirmed for fulfillment');
    assert(orderRes.body.data?.paymentStatus === 'Pending', 'Orders', 'COD order remains unpaid until collection');
    placedOrderNumber = orderRes.body.data?.orderNumber;
    placedOrderTotal = orderRes.body.data?.total;

    const myOrders = await request('/api/v1/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(myOrders.status === 200, 'Orders', 'Customer GET /api/v1/orders succeeds (200 OK)');
    const foundMyOrder = myOrders.body.data?.some((o: any) => o.orderNumber === placedOrderNumber);
    assert(foundMyOrder, 'Orders', 'Customer sees their newly placed order');

    const unauthOrders = await request('/api/v1/orders');
    assert(unauthOrders.status === 401, 'Orders', 'Unauthenticated request to GET /api/v1/orders blocked with 401');
  } catch (err: any) {
    assert(false, 'Orders', 'Order suite execution', err.message);
  }

  // 7. Provider verification and forged transaction rejection
  console.log('\n👉 Suite 7: Provider Verification and Forged Payment Rejection');
  try {
    // 7a. Payment config
    const configRes = await request('/api/v1/payments/config');
    assert(configRes.status === 200, 'Payments', 'GET /api/v1/payments/config returns 200 OK');
    assert(!!configRes.body.data?.bkash && !!configRes.body.data?.nagad, 'Payments', 'Payment configuration is returned');
    assert(configRes.body.data?.nagad?.enabled === false, 'Payments', 'Nagad remains disabled without verified merchant integration');
    assert(configRes.body.data?.card?.enabled === false, 'Payments', 'Card checkout remains disabled without a configured processor');

    // 7b. Payment initiation for bKash
    const initBkash = await request('/api/v1/payments/initiate', {
      method: 'POST',
      body: {
        orderId: placedOrderNumber,
        paymentMethod: 'bkash',
        customerEmail: 'customer@marketly.com',
        customerPhone: '+8801712345678',
      },
    });
    assert(initBkash.status === 400, 'Payments', 'Payment initiation rejects a method that differs from the COD order');

    // 7c. Authoritative Verification with valid TrxID
    const uniqueTrxId = `BKASH_TRX_${Date.now()}`;
    const verifyRes = await request('/api/v1/payments/verify', {
      method: 'POST',
      body: {
        orderNumber: placedOrderNumber,
        paymentMethod: 'bkash',
        transactionId: uniqueTrxId,
        amount: placedOrderTotal,
      },
    });
    assert(verifyRes.status === 400, 'Payments', 'Customer-supplied TrxID is rejected');
    const unchangedPlacedOrder = await request('/api/v1/orders/track', {
      method: 'POST',
      body: {
        orderNumber: placedOrderNumber,
        email: 'customer@marketly.com',
        phone: '+8801712345678',
      },
    });
    assert(unchangedPlacedOrder.body.data?.paymentStatus === 'Pending', 'Payments', 'Unverified transaction leaves order unpaid');

    // 7d. Idempotent Re-verification: Calling verify again with same TrxID returns 200 without duplicate execution
    const reVerifyRes = await request('/api/v1/payments/verify', {
      method: 'POST',
      body: {
        orderNumber: placedOrderNumber,
        paymentMethod: 'bkash',
        transactionId: uniqueTrxId,
        amount: placedOrderTotal,
      },
    });
    assert(reVerifyRes.status === 400, 'Payments', 'Repeated fabricated TrxID remains rejected');

    // 7e. Replay Attack Prevention (Reusing same TrxID on another order)
    const order2Res = await request('/api/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer: { email: 'customer@marketly.com' },
        shippingAddress: {
          fullName: 'Audit Customer',
          phone: '+8801712345678',
          email: 'customer@marketly.com',
          streetAddress: 'House 50, Road 12',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Banani',
        },
        items: [{ productId: '2', name: 'Leather Bag', price: 180, quantity: 1 }],
        paymentMethod: 'cod',
      },
    });
    order2Num = order2Res.body.data?.orderNumber;

    const replayRes = await request('/api/v1/payments/verify', {
      method: 'POST',
      body: {
        orderNumber: order2Num,
        paymentMethod: 'bkash',
        transactionId: uniqueTrxId, // Replayed!
      },
    });
    assert(replayRes.status === 400, 'Payments', 'Fabricated transaction replay is rejected');

    // 7f. Amount Mismatch Prevention
    const uniqueTrx2 = `NAGAD_TRX_${Date.now()}`;
    const mismatchRes = await request('/api/v1/payments/verify', {
      method: 'POST',
      body: {
        orderNumber: order2Num,
        paymentMethod: 'nagad',
        transactionId: uniqueTrx2,
        amount: 999999, // Mismatched forged amount
      },
    });
    assert(mismatchRes.status === 400, 'Payments', 'Unsupported Nagad payment verification is rejected');
  } catch (err: any) {
    assert(false, 'Payments', 'Payment suite execution', err.message);
  }

  // 8. Payment Cancellation & Inventory Restoration
  console.log('\n👉 Suite 8: Payment Cancellation & Stock Restoration');
  try {
    // 8a. Check initial stock of product 1
    const catalogRes1 = await request('/api/v1/products/mens-air-sneakers-running-shoes');
    const initialStock = catalogRes1.body?.data?.inventory ?? 50;

    // 8b. Create a new order that reserves stock
    const cancelTestOrder = await request('/api/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer: { email: 'customer@marketly.com' },
        shippingAddress: {
          fullName: 'Cancel Test Customer',
          phone: '+8801712345678',
          email: 'customer@marketly.com',
          streetAddress: 'House 99, Road 5',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Banani',
        },
        items: [{ productId: '1', name: 'Air Sneakers', price: 160, quantity: 2 }],
        paymentMethod: 'cod',
      },
    });
    assert(cancelTestOrder.status === 201, 'Cancel & Inventory', 'Order created with pending status');
    const cancelOrderNum = cancelTestOrder.body.data?.orderNumber;

    // 8c. Customer cancels the payment session
    const cancelPaymentRes = await request('/api/v1/payments/cancel', {
      method: 'POST',
      body: { orderNumber: cancelOrderNum },
    });
    assert(cancelPaymentRes.status === 200, 'Cancel & Inventory', 'POST /v1/payments/cancel returns 200 OK');
    assert(cancelPaymentRes.body.order?.orderStatus === 'Cancelled', 'Cancel & Inventory', 'Order status marked as Cancelled');
    assert(cancelPaymentRes.body.order?.paymentStatus === 'Cancelled', 'Cancel & Inventory', 'Payment status marked as Cancelled');

    // 8d. Verify inventory is restored back
    const catalogRes2 = await request('/api/v1/products/mens-air-sneakers-running-shoes');
    const restoredStock = catalogRes2.body?.data?.inventory;
    assert(restoredStock === initialStock, 'Cancel & Inventory', `Reserved stock restored to original level (${restoredStock})`);
  } catch (err: any) {
    assert(false, 'Cancel & Inventory', 'Cancellation suite execution', err.message);
  }

  // 9. Admin Payment Management, COD Collection & Refunds
  console.log('\n👉 Suite 9: Admin Payment Management, COD Collection & Refunds');
  try {
    // 9a. Admin retrieves transactions audit ledger
    const txnsRes = await request('/api/v1/admin/payments/transactions', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(txnsRes.status === 200, 'Admin Payments', 'GET /api/v1/admin/payments/transactions returns 200 OK');
    assert(Array.isArray(txnsRes.body.data), 'Admin Payments', 'Transaction ledger array returned');

    // 9b. Customer cannot access transactions ledger
    const customerTxns = await request('/api/v1/admin/payments/transactions', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerTxns.status === 403, 'Admin Payments', 'Customer blocked from admin transactions (403 Forbidden)');

    // 9c. Admin records Cash on Delivery (COD) collection
    const codOrderRes = await request('/api/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer: { email: 'customer@marketly.com' },
        shippingAddress: {
          fullName: 'COD Customer',
          phone: '+8801712345678',
          email: 'customer@marketly.com',
          streetAddress: 'House 1, Road 1',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Banani',
        },
        items: [{ productId: '2', name: 'Leather Bag', price: 180, quantity: 1 }],
        paymentMethod: 'cod',
      },
    });
    const codOrderNum = codOrderRes.body.data?.orderNumber;

    const deliveredOrder = await request(`/api/v1/admin/orders/${codOrderNum}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Delivered', note: 'Delivery test completed' },
    });
    assert(deliveredOrder.body.data?.paymentStatus === 'Pending', 'Admin Payments', 'COD delivery does not automatically mark payment paid');

    const codCollectRes = await request('/api/v1/admin/payments/cod-collect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        orderId: codOrderNum,
        amountCollected: codOrderRes.body.data?.total,
        note: 'Cash collected by Banani hub courier agent',
      },
    });
    assert(codCollectRes.status === 200, 'Admin Payments', 'Admin records COD collection successfully (200 OK)');
    assert(codCollectRes.body.order?.paymentStatus === 'Paid', 'Admin Payments', 'COD order paymentStatus transitions to Paid upon collection');

    const unsupportedCodRefund = await request('/api/v1/admin/payments/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { orderId: codOrderNum, amount: codOrderRes.body.data?.total },
    });
    assert(unsupportedCodRefund.status === 503, 'Admin Payments', 'COD is not falsely marked refunded without a cash-refund workflow');

    // 9d. The unpaid COD order cannot be refunded.
    const refundRes = await request('/api/v1/admin/payments/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        orderId: placedOrderNumber,
        amount: placedOrderTotal,
        reason: 'Customer returned luxury watch in original packaging',
      },
    });
    assert(refundRes.status === 400, 'Admin Payments', 'Refund on unpaid COD order is rejected');

    // 9e. Unpaid order cannot be refunded
    const unpaidRefund = await request('/api/v1/admin/payments/refund', {
      headers: { Authorization: `Bearer ${adminToken}` },
      method: 'POST',
      body: { orderId: order2Num, amount: 50 },
    });
    assert(unpaidRefund.status === 400, 'Admin Payments', 'Refund on unpaid order rejected with 400 Bad Request');
  } catch (err: any) {
    assert(false, 'Admin Payments', 'Admin payments suite execution', err.message);
  }

  // Summary
  console.log('\n====================================================');
  console.log('AUDIT VERIFICATION SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Assertions: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log(`\n🎉 ALL ${passed}/${results.length} API AND PAYMENT-INTEGRITY CHECKS PASSED!\n`);
    process.exit(0);
  } else {
    console.error(`\n⚠️ ${failed} test(s) failed. Please review.\n`);
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
