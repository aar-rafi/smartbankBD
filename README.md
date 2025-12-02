<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rHgyh7gC_qrcEDcornMCQNnc-sGJAoo9

## Project Structure

- `src/`: Frontend application code (React)
- `server/`: Backend server code (Node.js/Express)
- `shared/`: Shared types and utilities

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.
3. Start the Backend Server:
   `npm run start:server`
4. Start the Frontend Development Server (in a new terminal):
   `npm run dev`
