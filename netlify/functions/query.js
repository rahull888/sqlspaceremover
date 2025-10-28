// netlify/functions/query.js
// Netlify Function: stores a single 'latest' query in Netlify Blobs store named 'queries'.
// Protect POST writes by setting NETLIFY_SAVE_TOKEN in Netlify site environment variables.
// GET is allowed publicly in this example (change as needed).

// netlify/functions/query.js
// Use dynamic import because @netlify/blobs is an ES module.
// Robust dynamic import for @netlify/blobs (handles multiple export shapes)

// Robust loader for @netlify/blobs when module exports a `Blobs` object.

// including when the package exports a Blobs class that must be `new`-ed.

// netlify/functions/query.js
exports.handler = async function(event) {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_TABLE_NAME || 'Queries';
  const baseUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
  const authHeader = { Authorization: `Bearer ${API_KEY}` };

  try {
    async function findLatestRecord() {
      const url = `${baseUrl}?filterByFormula=${encodeURIComponent(`{Name} = "latest"`)}&pageSize=1`;
      const res = await fetch(url, { headers: { ...authHeader } });
      const data = await res.json();
      return (data.records && data.records[0]) || null;
    }

    if (event.httpMethod === 'GET') {
      const rec = await findLatestRecord();
      const query = rec && rec.fields && rec.fields.query ? rec.fields.query : '';
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) };
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const queryText = body.query || '';
      const existing = await findLatestRecord();

      if (existing) {
        const patchRes = await fetch(`${baseUrl}/${existing.id}`, {
          method: 'PATCH',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { query: queryText } })
        });
        const patched = await patchRes.json();
        return { statusCode: 200, body: JSON.stringify({ ok: true, id: patched.id }) };
      } else {
        const postRes = await fetch(baseUrl, {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Name: 'latest', query: queryText } })
        });
        const created = await postRes.json();
        return { statusCode: 200, body: JSON.stringify({ ok: true, id: created.id }) };
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Airtable function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};


    // 4) if default itself is a class/function
    if (!getStore && typeof blobsModule.default === 'function') {
      try {
        const instance = new blobsModule.default();
        getStore = findGetStore(instance) || (typeof instance === 'function' ? instance : null);
      } catch (e) {
        // fallback: maybe default itself is the getStore function
        if (typeof blobsModule.default === 'function' && blobsModule.default.name && blobsModule.default.name.toLowerCase().includes('getstore')) {
          getStore = blobsModule.default;
        }
      }
    }

    // 5) final fallback: check top-level keys for anything helpful (for logs only)
    if (!getStore) {
      const keys = Object.keys(blobsModule).join(', ');
      throw new Error(`getStore not found in @netlify/blobs module. Exports: ${keys}`);
    }

    const expected = process.env.NETLIFY_SAVE_TOKEN || '';
    const provided = (event.headers && (event.headers['x-admin-token'] || event.headers['X-Admin-Token'])) || '';

    // require token for POST if expected is set
    if (event.httpMethod === 'POST' && expected && expected !== provided) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Ensure getStore is a callable function; if it's a method on an instance that requires binding, handle it:
    let storeFunc = getStore;
    if (typeof getStore === 'function') {
      // some getStore values are methods that expect `this` to be an instance; we attempt to bind if necessary.
      // If getStore has no `this` dependency it will work as-is.
      try {
        // call getStore to obtain store object
        const store = await (storeFunc('queries'));
        // store should be an object with get/set methods
        if (!store || typeof store.get !== 'function') {
          throw new Error('Blobs store object invalid');
        }

        if (event.httpMethod === 'GET') {
          const blob = await store.get('latest', { type: 'json' }).catch(() => null);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: (blob && blob.query) || '' })
          };
        }

        if (event.httpMethod === 'POST') {
          const body = event.body ? JSON.parse(event.body) : {};
          const queryText = body.query || '';
          await store.setJSON('latest', { query: queryText, updatedAt: new Date().toISOString() });
          return { statusCode: 200, body: JSON.stringify({ ok: true }) };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };
      } catch (err) {
        // If direct calling failed, try alternative: if getStore is a method on an instance, attempt to locate instance.
        // For safety, fall through to an explicit error below to capture a helpful message.
        console.error('Attempt to call getStore failed:', err && err.stack ? err.stack : err);
        throw err;
      }
    } else {
      throw new Error('Resolved getStore is not a function');
    }

  } catch (err) {
    console.error('Function error:', err && err.stack ? err.stack : err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};


