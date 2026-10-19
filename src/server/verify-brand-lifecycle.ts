import http from 'http';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload).toString();

    const req = http.request(`http://127.0.0.1:3000${path}`, { method: options.method || 'GET', headers, timeout: 8000 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed: any = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // keep raw text when response is not JSON
        }
        resolve({ status: res.statusCode || 0, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
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
  const brandName = `Brand-${Date.now()}`;
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: process.env.ADMIN_EMAIL || 'admin@marketly.com', password: process.env.ADMIN_PASSWORD || 'Siam12345!' },
  });

  assert(login.status === 200 && !!login.body?.token, 'Setup', 'Admin authentication succeeds');
  if (!login.body?.token) {
    console.log('No admin token available; aborting brand lifecycle test.');
    return;
  }

  const auth = { Authorization: `Bearer ${login.body.token}` };

  const createRes = await request('/api/v1/admin/brands', {
    method: 'POST',
    headers: auth,
    body: {
      name: brandName,
      logo: 'https://example.com/logo.png',
      description: 'Brand created by regression test',
    },
  });

  assert(createRes.status === 201, 'Brand CRUD', `POST /admin/brands creates brand ${brandName}`);
  const createdBrand = createRes.body?.data;
  assert(!!createdBrand && createdBrand.name === brandName, 'Brand CRUD', 'Created brand has expected name and payload');

  const listRes = await request('/api/v1/brands');
  const listed = Array.isArray(listRes.body?.data) ? listRes.body.data : [];
  assert(listed.some((brand: any) => brand.name === brandName), 'Brand CRUD', 'Brand appears in public brand listing');

  const updateRes = await request(`/api/v1/admin/brands/${createdBrand.id}`, {
    method: 'PUT',
    headers: auth,
    body: { name: `${brandName}-Updated`, description: 'Updated by regression test' },
  });
  assert(updateRes.status === 200, 'Brand CRUD', 'PUT /admin/brands/:id updates existing brand');
  const updatedBrand = updateRes.body?.data;
  assert(updatedBrand && updatedBrand.name === `${brandName}-Updated`, 'Brand CRUD', 'Updated brand name persists');

  const productByBrand = await request(`/api/v1/products?brand=${encodeURIComponent(updatedBrand.name)}`);
  assert(productByBrand.status === 200, 'Brand CRUD', 'Brand filter endpoint remains accessible after updates');

  const deleteRes = await request(`/api/v1/admin/brands/${updatedBrand.id}`, {
    method: 'DELETE',
    headers: auth,
  });
  assert(deleteRes.status === 200, 'Brand CRUD', 'DELETE /admin/brands/:id removes test brand');

  console.log('\n====================================================');
  console.log('BRAND LIFECYCLE REGRESSION SUMMARY');
  console.log('====================================================');
  results.forEach((result) => {
    console.log(`${result.status === 'PASS' ? 'PASS' : 'FAIL'} | ${result.suite} | ${result.test}`);
  });
}

runAllTests().catch((error: unknown) => {
  console.error('Brand lifecycle verification failed unexpectedly:', error);
  process.exitCode = 1;
});
