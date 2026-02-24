
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { supabase } from './supabaseClient.js';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import PdfParse from 'pdf-parse';
import { PDFDocument } from "pdf-lib";
import { createRequire } from "module";
import extractTextFromPDF from './test.js';
import OpenAI from 'openai';
import Groq  from 'groq-sdk';

const require = createRequire(import.meta.url);

dotenv.config();

const app = express();

// Validate required environment variables

// Configure CORS for specific origins
const allowedOrigins = ['*']; // Allow all origins for development; replace with specific URLs in production

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(0) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify allowed methods
  credentials: true // Allow cookies to be sent
}));



const openai = new OpenAI({
  baseURL: 'https://api.openllm-platform.com/v1',
  apiKey: 'llm-in-nova-scotia'
});

const groq = new Groq({
  apiKey: process.env.gorq,
});

// Use memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Root route
app.get('/', (req, res) => {
  res.send('Flashcard backend running!');
});

// Authentication middleware
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: no token provided' });

    if (token === process.env.SUPABASE_KEY || token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(401).json({ error: 'Invalid token: project key provided' });
    }

    // Decode token payload lightly for debugging
    // try {
    //   const payloadPart = token.split('.')[1] || '';
    //   const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    //   const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    //   const payload = JSON.parse(decoded);
    //   console.log('Token payload preview:', {
    //     sub: payload.sub,
    //     aud: payload.aud,
    //     role: payload.role,
    //     exp: payload.exp
    //   });
    // } catch {
    //   console.warn('Could not decode token payload');
    // }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('Auth error from Supabase:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Upload and flashcard generation route
app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    let text = req.body.notes || '';
    let uploadedPublicUrl = req.body.isPublic === true;
    const userId = req.user?.id;

    if (!userId) {
      console.error('[Auth] Missing userId');
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    if (req.file) {
      console.log(' Uploaded file:', req.file.originalname, req.file.mimetype);
      const buffer = req.file.buffer;

      try {
        console.log(' Starting file processing for:', req.file.mimetype);
        
        switch (req.file.mimetype) {
          case "application/pdf":
            console.log(" Extracting text from PDF...");
            try {
              const pdfData = await PdfParse(req.file.buffer);
              text = pdfData.text?.trim() || "";
              if (!text) {
                const pdfDoc = await PDFDocument.load(req.file.buffer);
                const numPages = pdfDoc.getPageCount();
                text = await extractTextFromPDF(buffer, numPages);
              }
            } catch (pdfErr) {
              return res.status(400).json({ error: `Failed to parse PDF: ${pdfErr.message}` });
            }
            break;

          case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            try {
              const result = await mammoth.extractRawText({ buffer });
              text = result.value.trim();
            } catch(docxErr) {
              return res.status(400).json({ error: `Failed to parse DOCX: ${docxErr.message}` });
            }
            break;

          case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            try {
              const { PptxParser } = await import('pptx-parser');
              const slides = await PptxParser.parseBuffer(buffer);
              text = Array.isArray(slides) ? slides.join("\n\n") : JSON.stringify(slides);
            } catch(pptxErr) {
              return res.status(400).json({ error: `Failed to parse PPTX: ${pptxErr.message}` });
            }
            break;

          case "text/plain":
            text = buffer.toString("utf-8").trim();
            break;

          default:
            return res.status(415).json({ error: `Unsupported file type: ${req.file.mimetype}` });
        }
      } catch (generalErr) {
        return res.status(500).json({ error: 'Failed to process file: ' + generalErr.message });
      }
    }

    if (!text) {
      return res.status(400).json({ error: 'No text or file provided' });
    }

    // === CHUNKING LOGIC FOR LARGE TEXT ===
    const CHUNK_SIZE = 12000; // Character limit per API call
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.substring(i, i + CHUNK_SIZE));
    }

    console.log(`[AI] Processing ${chunks.length} chunks...`);
    
    let allFlashcards = [];
    let finalTitle = 'Generated Flashcards';

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[AI] Processing chunk ${i + 1}/${chunks.length}`);
      
      const prompt = `
        Create flashcards from the following content. Format your response as a JSON object with a "title" field and a "cards" array. Each card should have a "question" and "answer" field.
        
        Content to convert:
        ${chunks[i]}

        Generate clear, concise flashcards. Return ONLY the JSON string.
      `;

      try {
        const result = await groq.chat.completions.create({
          messages: [
            { role: "system", content: "You are an expert flashcard generator. You respond only in valid JSON." },
            { role: "user", content: prompt }
          ],
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" } // Ensures JSON output if supported
        });

        const content = result.choices[0].message.content.trim();
        const parsed = JSON.parse(content);

        if (i === 0 && parsed.title) finalTitle = parsed.title;
        if (parsed.cards && Array.isArray(parsed.cards)) {
          allFlashcards = allFlashcards.concat(parsed.cards);
        }
      } catch (chunkErr) {
        console.error(`[AI Error] Failed chunk ${i}:`, chunkErr.message);
        // Continue to next chunk or handle as needed
      }
    }

    if (allFlashcards.length === 0) {
      return res.status(500).json({ error: 'Failed to generate any flashcards from the provided text' });
    }

    // === DB INSERTION ===
    try {
      console.log('[DB] Inserting flashcards...');
      const { data: container, error: container_error } = await supabase
        .from('flashcards_container')
        .insert([{ 
          title: finalTitle,
          user_id: userId,
          is_public: req.body.isPublic
        }])
        .select()
        .single();

      if (container_error) throw container_error;
      
      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(allFlashcards.map(card => ({
          container_id: container.id,
          question: card.question,
          answer: card.answer,
          set_id: userId, 
        })));

      if (insertError) throw insertError;

      return res.json({ flashcards: allFlashcards, title: finalTitle, fileUrl: uploadedPublicUrl });
    } catch (dbErr) {
      console.error('[DB Error]', dbErr);
      return res.status(500).json({ error: 'Failed to store flashcards' });
    }

  } catch (error) {
    console.error('[Server Error]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});





// Start server
app.listen(3001, () => console.log('Server listening on http://localhost:3001'));


export default app;
