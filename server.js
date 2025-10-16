import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env.local');

console.log('🔍 Debug info:');
console.log('Current directory:', __dirname);
console.log('Looking for .env.local at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

// Load environment variables
const result = dotenv.config({ path: envPath });
console.log('Dotenv result:', result);

const app = express();
const port = 3001;

// Debug: Check if API key is loaded
console.log('Environment check:');
console.log('CLAUDE_API_KEY exists:', !!process.env.CLAUDE_API_KEY);
console.log('CLAUDE_API_KEY length:', process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.length : 0);
console.log('CLAUDE_API_KEY preview:', process.env.CLAUDE_API_KEY ? `${process.env.CLAUDE_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('CLAUDE')));

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// API endpoint to generate web interface
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ 
        error: 'Claude API key not configured',
        details: 'Please check your .env.local file',
        debug: {
          envPath,
          fileExists: fs.existsSync(envPath),
          allEnvVars: Object.keys(process.env).filter(key => key.includes('CLAUDE'))
        }
      });
    }

    console.log('Generating interface for prompt:', prompt);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a web developer. Create a complete, functional HTML/CSS/JavaScript web interface based on this description: "${prompt}"

Requirements:
- Return ONLY valid HTML code (no markdown, no explanations)
- Include all necessary CSS and JavaScript inline
- Make it responsive and modern
- Use a clean, professional design
- Ensure it's fully functional when rendered
- Use modern CSS features like flexbox/grid
- Include smooth animations and transitions
- Make it mobile-friendly

Return the complete HTML document:`
      }]
    });

    const generatedCode = message.content[0].text;
    
    console.log('Generated code length:', generatedCode.length);
    
    res.json({ 
      success: true, 
      code: generatedCode,
      prompt: prompt 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate interface',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    apiKeyConfigured: !!process.env.CLAUDE_API_KEY,
    debug: {
      envPath,
      fileExists: fs.existsSync(envPath),
      allEnvVars: Object.keys(process.env).filter(key => key.includes('CLAUDE'))
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on http://localhost:${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/api/generate`);
});
