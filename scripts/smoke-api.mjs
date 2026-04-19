const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:5000/api/v1';
const EMAIL = process.env.SMOKE_EMAIL || 'admin@paikar.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin123';

function fail(message) {
  throw new Error(message);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.message || `Request failed: ${method} ${path} (${res.status})`;
    fail(msg);
  }
  return payload;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

async function run() {
  console.log(`Smoke test target: ${API_BASE}`);

  const health = await call('/health');
  if (health?.success !== true) fail('Health check failed');

  const login = await call('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const token = login?.data?.accessToken;
  if (!token) fail('Login did not return access token');

  const purchase = await call('/purchase-orders', { token });
  const sales = await call('/sales-orders', { token });
  const vouchers = await call('/cashbook/vouchers', { token });
  const inventory = await call('/inventory/dashboard?page=1&pageSize=10', { token });
  const lots = await call('/lots', { token });
  const investors = await call('/investors', { token });

  const purchaseList = asArray(purchase?.data);
  const salesList = asArray(sales?.data);
  const voucherList = asArray(vouchers?.data);
  const lotList = asArray(lots?.data);
  const investorList = asArray(investors?.data);

  if (!Array.isArray(inventory?.data?.items)) {
    fail('Inventory dashboard payload missing items array');
  }

  if (purchaseList.some((po) => po?.poNo && typeof po.poNo !== 'string')) {
    fail('Invalid PO numbering shape');
  }
  if (salesList.some((so) => so?.soNo && typeof so.soNo !== 'string')) {
    fail('Invalid SO numbering shape');
  }
  if (voucherList.some((v) => v?.voucherNo && typeof v.voucherNo !== 'string')) {
    fail('Invalid voucher numbering shape');
  }

  if (investorList.length > 0) {
    const first = investorList[0];
    const bal = await call(`/investors/${first.id}/balance`, { token });
    if (!bal?.data || typeof bal.data.net !== 'number') {
      fail('Investor balance payload is invalid');
    }
  }

  console.log('Smoke checks passed');
  console.log(
    JSON.stringify(
      {
        purchaseCount: purchaseList.length,
        salesCount: salesList.length,
        voucherCount: voucherList.length,
        lotCount: lotList.length,
        investorCount: investorList.length,
      },
      null,
      2,
    ),
  );
}

run().catch((err) => {
  console.error('Smoke checks failed');
  console.error(err?.message || err);
  process.exit(1);
});
