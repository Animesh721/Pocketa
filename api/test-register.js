export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Just echo back what we receive
  res.status(200).json({
    method: req.method,
    body: req.body,
    headers: req.headers,
    query: req.query,
    bodyKeys: Object.keys(req.body || {}),
    bodyContent: JSON.stringify(req.body)
  });
}