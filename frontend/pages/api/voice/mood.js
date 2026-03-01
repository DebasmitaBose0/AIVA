export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = req.headers['x-api-key'];

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const fetchRes = await fetch(`${backendUrl}/api/voice/mood`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
            },
            body: JSON.stringify({ image }),
        });

        const data = await fetchRes.json();
        return res.status(fetchRes.status).json(data);
    } catch (error) {
        console.error('Error proxying mood to backend:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
