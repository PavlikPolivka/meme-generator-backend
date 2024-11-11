// api/generateMeme.js

const axios = require('axios');

module.exports = async (req, res) => {
  // Load environment variables (only in development)
  if (!process.env.OPENAI_API_KEY || !process.env.GIPHY_API_KEY) {
    require('dotenv').config();
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, use POST' });
  }

  const userInput = req.body.userInput;

  if (!userInput) {
    return res.status(400).json({ error: 'Missing "userInput" in request body' });
  }

  try {
    // Step 1: Generate Caption using OpenAI Chat Completion API
    const captionResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: `Create a funny meme caption based on the following topic: "${userInput}"` }
        ],
        max_tokens: 60,
        temperature: 0.8,
        n: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const caption = captionResponse.data.choices[0].message.content.trim();

    // Step 2: Generate Giphy Search Query using OpenAI Chat Completion API
    const searchQueryResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: `Based on the meme caption "${caption}", generate a concise and specific search query (2-3 words) to find an appropriate image or GIF on Giphy.` }
        ],
        max_tokens: 10,
        temperature: 0.7,
        n: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const searchQuery = searchQueryResponse.data.choices[0].message.content.trim();

    // Step 3: Fetch Images from Giphy API using the search query
    const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: GIPHY_API_KEY,
        q: searchQuery,
        limit: 10,
        rating: 'PG-13',
      },
    });

    const images = giphyResponse.data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      imageUrl: gif.images.downsized_still.url,
    }));

    // Step 4: Return Combined Response
    return res.status(200).json({ caption, images });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while generating the meme.' });
  }
};