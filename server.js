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

    console.log('🎨 [Prism Server] Generating interface with premium design constraints...');
    console.log('📏 [Prism Server] Enhanced prompt length:', prompt.length, 'characters');

    // The prompt is already enhanced with premium design constraints from the frontend
    // via enhancePromptWithPremiumDesign() - just pass it directly to Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000, // Very high for testing - ensures complete implementations
      messages: [{
        role: 'user',
        content: prompt // Already contains premium design system constraints + user request
      }]
    });

    const rawResponse = message.content[0].text;
    
    // Extract HTML code from markdown code blocks
    const htmlMatch = rawResponse.match(/```html\s*([\s\S]*?)```/);
    const generatedCode = htmlMatch ? htmlMatch[1].trim() : rawResponse;
    
    // Extract explanation/description (everything outside HTML blocks)
    const explanation = rawResponse.replace(/```html[\s\S]*?```/g, '').trim();
    
    console.log('✅ [Prism Server] Generated code length:', generatedCode.length, 'chars');
    console.log('📊 [Token Usage]:', message.usage);
    console.log('⚠️  [Token Limit Check]:', message.usage.output_tokens >= 15500 ? 'NEAR LIMIT - Consider increasing!' : 'OK');
    console.log('💰 [Estimated Cost]:', `~$${((message.usage.input_tokens * 3 / 1000000) + (message.usage.output_tokens * 15 / 1000000)).toFixed(4)}`);
    
    if (explanation && explanation.length > 50) {
      console.log('\n💬 [AI EXPLANATION - Hidden from user]:\n');
      console.log(explanation);
      console.log('\n========================================\n');
    }
    
    console.log('\n📋 [HTML CODE PREVIEW - First 500 chars]:\n');
    console.log(generatedCode.substring(0, 500));
    console.log('\n...\n');
    console.log('\n📋 [HTML CODE PREVIEW - Last 300 chars]:\n');
    console.log(generatedCode.substring(generatedCode.length - 300));
    console.log('\n========================================\n');
    
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
