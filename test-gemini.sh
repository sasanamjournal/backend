# Replace YOUR_API_KEY with your actual Gemini API key
# This is a minimal test for the Gemini API endpoint using curl
# Save this as test-gemini.sh and run: sh test-gemini.sh

API_KEY="YOUR_API_KEY"
ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$API_KEY"

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      { "parts": [ { "text": "Say hello world" } ] }
    ]
  }'
