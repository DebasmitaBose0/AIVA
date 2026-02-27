const auth = (req, res, next) => {
  // If no API_KEY is set in .env, skip auth (development mode)
  if (!process.env.API_KEY) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

module.exports = auth;