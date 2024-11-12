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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Handle preflight OPTIONS request
    return res.status(200).end();
  }


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
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `
              Create a meme caption based on the following topic: "${userInput}".
              Provide the caption split into a top and bottom text.
              Generate a concise and specific search query (2-3 words) to find an appropriate image on Giphy.
              Format your response exactly as JSON: {"topText": "Top caption", "bottomText": "Bottom caption", "searchQuery": "Search Query"}.
              Do not include any extra text outside of the JSON format.
              `
          }
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

    let topText = '';
    let bottomText = '';
    let searchQuery = '';

    try {
      const jsonResponse = captionResponse.data.choices[0].message.content.trim();
      const parsedResponse = JSON.parse(jsonResponse);
      topText = parsedResponse.topText || '';
      bottomText = parsedResponse.bottomText || '';
      searchQuery = parsedResponse.searchQuery || '';
    } catch (parseError) {
      console.error('Error parsing caption JSON:', parseError);
      return res.status(500).json({ error: 'Failed to generate meme captions.' });
    }

    // Step 2: Fetch Images from Giphy API using the search query
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

    // Step 3: Return Combined Response
    return res.status(200).json({ topText, bottomText, searchQuery, images, userInput });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'An error occurred while generating the meme.' });
  }
};