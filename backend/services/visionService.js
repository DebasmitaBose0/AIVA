const fetch = require('node-fetch');
const logger = require('../logger');

class VisionService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
    }
    async detectMood(base64Image) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.warn("GEMINI_API_KEY not configured for mood scan.");
            throw new Error("GEMINI_API_KEY not configured.");
        }

        try {
            // Clean base64 string
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const payload = {
                contents: [
                    {
                        parts: [
                            { text: "Analyze the facial expression in this image. Respond with only ONE of these moods: HAPPY, SAD, ANGRY, CALM, SURPRISED, TIRED." },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 10
                }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Gemini Vision API Error: ${err}`);
            }

            const data = await res.json();
            const moodRes = data.candidates[0].content.parts[0].text.trim().toUpperCase();

            // Map to AIVA personalities/voices
            const moodMap = {
                'HAPPY': 'AIVA is feeling energetic and happy! Using Energetic voice.',
                'SAD': 'AIVA is feeling empathetic. Switching to soft and soothing voice.',
                'ANGRY': 'AIVA noticed you are upset. Staying calm and helpful.',
                'CALM': 'AIVA is in peaceful mode. Using steady voice.',
                'SURPRISED': 'AIVA is excited! Personality set to witty and fun.',
                'TIRED': 'AIVA is in power-save mode. Keeping it concise and helpful.'
            };

            return {
                mood: moodRes,
                response: moodMap[moodRes] || "Mood recognized! Adjusting personality.",
                voiceProfile: moodRes === 'HAPPY' ? 'Energetic' : moodRes === 'SAD' ? 'Soothing' : 'Default'
            };

        } catch (e) {
            logger.error('Vision detection failed:', e.message);
            return { mood: 'CALM', response: "I couldn't detect your mood clearly, so I'll stay calm and helpful! 😄" };
        }
    }
}

module.exports = new VisionService();
