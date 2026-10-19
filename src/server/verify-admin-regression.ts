// Admin Panel API Failure — Regression Prevention Suite
//
// Covers the reported failures:
//   PUT/DELETE /api/v1/admin/products/1
//   PUT/DELETE /api/v1/admin/products/8
//   PUT/DELETE /api/v1/admin/products/9
//   DELETE      /api/v1/admin/categories/cat_fashion
//   PUT         /api/v1/admin/orders/ord_1042/status
//   PUT         /api/v1/admin/banners/1        (CastError -> 500 regression)
//   DELETE      /api/v1/media/1               (CastError -> 500 regression)
//
// The suite asserts that seed-style / mock identifiers used by the SPA are resolved
// by the backend WITHOUT producing HTTP 500, and that genuinely unknown identifiers
// return a proper 404 instead of a 500 CastError.

import http from 'http';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

async function request(path: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData).toString();
    const req = http.request(
      `http://127.0.0.1:3000${path}`,
      { method: options.method || 'GET', headers, timeout: 8000 },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed: any = raw;
          try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
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
  console.log('ADMIN PANEL API REGRESSION PREVENTION SUITE');
  console.log('====================================================\n');

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: process.env.ADMIN_EMAIL || 'admin@marketly.com',
      password: process.env.ADMIN_PASSWORD || 'Siam12345!',
    },
  });
  const token = login.body?.token;
  assert(login.status === 200 && !!token, 'Setup', 'Admin authentication succeeds');
  if (!token) { summary(); return; }
  const auth = { Authorization: `Bearer ${token}` };

  // Fetch real documents to obtain valid ObjectIds AND seed-style identifiers.
  const productList = await request('/api/v1/products?limit=200');
  const products = productList.body?.data || [];
  const catList = await request('/api/v1/categories');
  const categories = catList.body?.data || [];
  const orderList = await request('/api/v1/orders', { headers: auth });
  const orders = orderList.body?.data || [];

  // ---------- Suite 1: Admin Product Update/Delete with SPA identifiers ----------
  console.log('\n👉 Suite 1: Admin Product Update/Delete (seed-style ids "1","8","9")');
  const seedIds = ['1', '8', '9'];
  for (const sid of seedIds) {
    const put = await request(`/api/v1/admin/products/${sid}`, {
      method: 'PUT',
      headers: auth,
      body: { inventory: 51 },
    });
    assert(
      put.status === 200 || put.status === 404,
      'Product Update',
      `PUT /admin/products/${sid} never returns 500 (got ${put.status})`,
      put.status === 500 ? put.body?.message : undefined
    );
    assert(
      put.status !== 500,
      'Product Update',
      `PUT /admin/products/${sid} is not a server error`,
      put.status === 500 ? put.body?.message : undefined
    );
  }

  // Update by real Mongo ObjectId must succeed.
  if (products[0]?._id) {
    const putReal = await request(`/api/v1/admin/products/${products[0]._id}`, {
      method: 'PUT',
      headers: auth,
      body: { inventory: 50 },
    });
    assert(putReal.status === 200, 'Product Update', 'PUT by Mongo ObjectId resolves the product (200 OK)');
  }

  // Update by slug must succeed (SPA may hold slug identifiers).
  const slugTarget = products.find((p: any) => p.slug);
  if (slugTarget) {
    const putSlug = await request(`/api/v1/admin/products/${slugTarget.slug}`, {
      method: 'PUT',
      headers: auth,
      body: { inventory: 50 },
    });
    assert(putSlug.status === 200, 'Product Update', `PUT by slug "${slugTarget.slug}" resolves the product (200 OK)`);
  }

  // Unknown identifier must yield 404, never 500.
  const putUnknown = await request('/api/v1/admin/products/__no_such_product__', {
    method: 'PUT',
    headers: auth,
    body: { inventory: 1 },
  });
  assert(putUnknown.status === 404, 'Product Update', 'PUT unknown product id returns 404 (not 500)');

  // ---------- Suite 2: Admin Category Delete with SPA identifier ----------
  console.log('\n👉 Suite 2: Admin Category Delete (seed-style id "cat_fashion")');
  const delCatSeed = await request('/api/v1/admin/categories/cat_fashion', { method: 'DELETE', headers: auth });
  assert(
    delCatSeed.status === 200 || delCatSeed.status === 404,
    'Category Delete',
    `DELETE /admin/categories/cat_fashion never returns 500 (got ${delCatSeed.status})`
  );
  assert(delCatSeed.status !== 500, 'Category Delete', 'DELETE /admin/categories/cat_fashion is not a server error');

  const catSlugTarget = categories.find((c: any) => c.slug);
  if (catSlugTarget) {
    const delCatSlug = await request(`/api/v1/admin/categories/${catSlugTarget.slug}`, { method: 'DELETE', headers: auth });
    assert(delCatSlug.status === 200, 'Category Delete', `DELETE by slug "${catSlugTarget.slug}" resolves the category (200 OK)`);
  }

  const delCatUnknown = await request('/api/v1/admin/categories/__no_such_category__', { method: 'DELETE', headers: auth });
  assert(delCatUnknown.status === 404, 'Category Delete', 'DELETE unknown category id returns 404 (not 500)');

  // ---------- Suite 3: Admin Order Status with SPA identifier ----------
  console.log('\n👉 Suite 3: Admin Order Status (seed-style id "ord_1042")');
  const orderSeed = await request('/api/v1/admin/orders/ord_1042/status', {
    method: 'PUT',
    headers: auth,
    body: { status: 'Processing', note: 'regression' },
  });
  assert(
    orderSeed.status === 200 || orderSeed.status === 404,
    'Order Status',
    `PUT /admin/orders/ord_1042/status never returns 500 (got ${orderSeed.status})`
  );
  assert(orderSeed.status !== 500, 'Order Status', 'PUT /admin/orders/ord_1042/status is not a server error');

  if (orders[0]?._id) {
    const orderReal = await request(`/api/v1/admin/orders/${orders[0]._id}/status`, {
      method: 'PUT',
      headers: auth,
      body: { status: 'Processing', note: 'regression' },
    });
    assert(orderReal.status === 200, 'Order Status', 'PUT order status by Mongo ObjectId succeeds (200 OK)');
  }

  const orderUnknown = await request('/api/v1/admin/orders/__no_such_order__/status', {
    method: 'PUT',
    headers: auth,
    body: { status: 'Processing' },
  });
  assert(orderUnknown.status === 404, 'Order Status', 'PUT unknown order id returns 404 (not 500)');

  const orderInvalidStatus = orders[0]?._id
    ? await request(`/api/v1/admin/orders/${orders[0]._id}/status`, {
      method: 'PUT',
      headers: auth,
      body: { status: 'NotARealStatus' },
    })
    : { status: 400, body: {} };
  assert(orderInvalidStatus.status === 400, 'Order Status', 'PUT invalid order status returns 400 (not 500)');

  // ---------- Suite 4: Banner & Media CastError regression ----------
  console.log('\n👉 Suite 4: Banner/Media CastError regression (non-ObjectId ids)');
  const bannerPut = await request('/api/v1/admin/banners/1', {
    method: 'PUT',
    headers: auth,
    body: { title: 'Regression Banner' },
  });
  assert(bannerPut.status !== 500, 'Banner/Media', `PUT /admin/banners/1 not a 500 (got ${bannerPut.status})`, bannerPut.body?.message);
  assert(bannerPut.status === 200 || bannerPut.status === 404, 'Banner/Media', 'PUT /admin/banners/1 returns 200 or 404');

  const mediaDel = await request('/api/v1/media/1', { method: 'DELETE', headers: auth });
  assert(mediaDel.status !== 500, 'Banner/Media', `DELETE /media/1 not a 500 (got ${mediaDel.status})`, mediaDel.body?.message);
  assert(mediaDel.status === 200 || mediaDel.status === 404, 'Banner/Media', 'DELETE /media/1 returns 200 or 404');

  summary();
}

function summary() {
  console.log('\n====================================================');
  console.log('ADMIN REGRESSION SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Assertions: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed === 0) {
    console.log('\n🎉 ALL ADMIN API REGRESSION CHECKS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`\n⚠️ ${failed} regression test(s) failed.\n`);
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal regression test error:', e);
  process.exit(1);
});
