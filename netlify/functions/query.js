// netlify/functions/query.js
// Netlify Function: stores a single 'latest' query in Netlify Blobs store named 'queries'.
// Protect POST writes by setting NETLIFY_SAVE_TOKEN in Netlify site environment variables.
// GET is allowed publicly in this example (change as needed).

// netlify/functions/query.js
// Use dynamic import because @netlify/blobs is an ES module.
// Robust dynamic import for @netlify/blobs (handles multiple export shapes)

exports.handler = async function (event, context) {
  try {
    const blobsModule = await import('@netlify/blobs');
    // resolve getStore from possible shapes:
    let getStore = blobsModule.getStore || (blobsModule.default && blobsModule.default.getStore);

    // also handle case where default itself is getStore (some builds export default function)
    if (!getStore && typeof blobsModule.default === 'function') {
      getStore = blobsModule.default;
    }

    if (!getStore) {
      // helpful debugging message in logs
      const keys = Object.keys(blobsModule).join(', ');
      throw new Error(`getStore not found in @netlify/blobs module. Exports: ${keys}`);
    }

    const expected = process.env.NETLIFY_SAVE_TOKEN || '';
    const provided = (event.headers && (event.headers['x-admin-token'] || event.headers['X-Admin-Token'])) || '';

    // require token for POST if expected is set
    if (event.httpMethod === 'POST' && expected && expected !== provided) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const store = getStore('queries');

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
    console.error('Function error:', err && err.stack ? err.stack : err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
