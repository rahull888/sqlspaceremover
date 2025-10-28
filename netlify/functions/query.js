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
// Airtable-backed store — now 100% valid CommonJS async usage (no top-level await)

exports.handler = async function (event) {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_TABLE_NAME || 'Queries';

  if (!API_KEY || !BASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Airtable credentials not set in environment variables' }),
    };
  }

  const baseUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
  const authHeader = { Authorization: `Bearer ${API_KEY}` };

  // helper functions (all async-safe)
  async function findLatestRecord() {
    const url = `${baseUrl}?filterByFormula=${encodeURIComponent(`{Name} = "latest"`)}&pageSize=1`;
    const res = await fetch(url, { headers: authHeader });
    if (!res.ok) {
      throw new Error(`Airtable find error: ${res.status}`);
    }
    const data = await res.json();
    return (data.records && data.records[0]) || null;
  }

  async function updateRecord(recordId, queryText) {
    const res = await fetch(`${baseUrl}/${recordId}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { query: queryText } }),
    });
    if (!res.ok) throw new Error(`Airtable patch error: ${res.status}`);
    return res.json();
  }

  async function createRecord(queryText) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Name: 'latest', query: queryText } }),
    });
    if (!res.ok) throw new Error(`Airtable create error: ${res.status}`);
    return res.json();
  }

  try {
    if (event.httpMethod === 'GET') {
      const record = await findLatestRecord();
      const query = record?.fields?.query || '';
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const queryText = body.query || '';

      const record = await findLatestRecord();
      if (record) {
        await updateRecord(record.id, queryText);
      } else {
        await createRecord(queryText);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Airtable function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
