
// This route acts as a thin proxy to the dedicated Express backend running
// separately. The frontend's own `commandService` is retained for offline
// testing, but in a normal development/demo setup we forward every request to
// the backend so that both UI and API share the same logic and data.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth header is simply passed through to the backend; key checking is done
  // server-side there so we don't replicate that logic here.
  const apiKey = req.headers['x-api-key'];

  if (process.env.NODE_ENV === 'development' && process.env.API_KEY) {
    console.warn('API key check bypassed in development');
  }

  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'No command provided' });
    }

    // Priority route for LOCAL development to bypass Render cloud sleep resets!
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000'
      : (process.env.BACKEND_URL || 'http://localhost:5000');

    const fetchRes = await fetch(`${backendUrl}/api/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
      },
      body: JSON.stringify({ command }),
    });

    const data = await fetchRes.json();
    return res.status(fetchRes.status).json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
