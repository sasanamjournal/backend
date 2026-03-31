// genAI.js
// Basic Gemini API client wrapper for Node.js
// Replace with actual Gemini SDK or REST API logic as needed

// Example: Using fetch for REST API (update with real endpoint and API key)
const fetch = require('node-fetch');

require('dotenv').config();

// Use the official Google Gemini API endpoint and your API key
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getGenerativeModel({ model }) {
  if (!API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in environment variables');
  }
  return {
    async generateContent(inputs) {
      // inputs: [prompt, { inlineData: { data, mimeType } }]
      const [prompt, fileObj] = inputs;
      const payload = JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: fileObj.inlineData.data,
                  mimeType: fileObj.inlineData.mimeType
                }
              }
            ]
          }
        ]
      });
      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload, "utf8")
        },
        timeout: 200_000
      };
      const https = require('https');
      const text = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error('Gemini API error: ' + res.statusCode + ': ' + data));
            }
          });
        });
        req.on("error", (err) => reject(err));
        req.on("timeout", () => { req.destroy(new Error("Gemini request timeout")); });
        req.write(payload);
        req.end();
      });
      // Simulate Gemini SDK's response structure
      return {
        response: {
          text: () => text
        }
      };
    }
  };
}

module.exports = { getGenerativeModel };