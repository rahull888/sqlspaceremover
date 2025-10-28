// netlify/functions/query.js
// Netlify Function: stores a single 'latest' query in Netlify Blobs store named 'queries'.
// Protect POST writes by setting NETLIFY_SAVE_TOKEN in Netlify site environment variables.
// GET is allowed publicly in this example (change as needed).

// netlify/functions/query.js
// Use dynamic import because @netlify/blobs is an ES module.
// Robust dynamic import for @netlify/blobs (handles multiple export shapes)

// Robust loader for @netlify/blobs when module exports a `Blobs` object.

// including when the package exports a Blobs class that must be `new`-ed.

exports.handler = async function (event, context) {
  try {
    const blobsModule = await import('@netlify/blobs');

    // helper to try to extract getStore from an object
    const findGetStore = (obj) => {
      if (!obj) return null;
      if (typeof obj.getStore === 'function') return obj.getStore;
      if (obj.default && typeof obj.default.getStore === 'function') return obj.default.getStore;
      return null;
    };

    // 1) direct named export getStore
    let getStore = findGetStore(blobsModule);

    // 2) try blobsModule.default if required
    if (!getStore) getStore = findGetStore(blobsModule.default);

    // 3) try Blobs export which might be a class or function
    if (!getStore && blobsModule.Blobs) {
      const Candidate = blobsModule.Blobs;
      // If Blobs is a class/function that we can instantiate, try new
      try {
        const instance = new Candidate();
        getStore = findGetStore(instance) || findGetStore(instance.default) || (typeof instance === 'function' ? instance : null);
      } catch (e) {
        // If `new Candidate()` failed, maybe Blobs is a factory function or exposes getStore on prototype
        try {
          // attempt to access prototype.getStore
          if (Candidate.prototype && typeof Candidate.prototype.getStore === 'function') {
            // bind to a dummy instance if needed
            const dummy = Object.create(Candidate.prototype);
            getStore = dummy.getStore;
          }
        } catch (ee) { /* ignore */ }
      }
    }

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


