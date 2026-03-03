
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
import JSZip from 'jszip';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';


const require = createRequire(import.meta.url);


dotenv.config();

const app = express();
app.use(express.json());


// Configure CORS for specific origins
const allowedOrigins = [
  'https://sensational-mooncake-205e97.netlify.app',
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://learnthentakeoutthel.netlify.app'
]; // Allow all origins for development; replace with specific URLs in production

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // FIX: Check if the incoming 'origin' is in your 'allowedOrigins' array
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));





// const openai = new OpenAI({
//   baseURL: 'https://api.openllm-platform.com/v1',
//   apiKey: process.env.OPENAI_API_KEY,
// });

const groq = new Groq({
  apiKey: process.env.GORQ_API_KEY,
});
// Use in‑memory storage for file uploads (no files written to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max per file to protect memory
  },
});

// Root route
app.get('/', (req, res) => {
  res.send('Flashcard backend running!');
});

// Authentication middleware

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // This checks if the token is a valid USER session JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}


// Helper: extract readable text from a PPTX buffer without saving to disk
async function extractTextFromPptxBuffer(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // Collect slide XML files
  const slideNames = Object.keys(zip.files)
    .filter((name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
    .sort((a, b) => {
      const getNum = (n) => parseInt(n.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);
      return getNum(a) - getNum(b);
    });

  const texts = [];

  for (const name of slideNames) {
    const file = zip.file(name);
    if (!file) continue;

    const xml = await file.async('text');
    // Very simple tag stripper for text content
    const withoutTags = xml.replace(/<[^>]+>/g, ' ');
    const normalized = withoutTags.replace(/\s+/g, ' ').trim();
    if (normalized) texts.push(normalized);
  }

  return texts.join('\n\n');
}

// Upload and flashcard generation route
app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    let text = (req.body.notes || '').toString();
    const uploadedPublicUrl = req.body.isPublic === true || req.body.isPublic === 'true';
    const userId = req.user?.id;

    if (!userId) {
      console.error('[Auth] Missing userId');
      return res.status(401).json({ error: 'Unauthorized user' });
    }

    // 1. Parse uploaded file (from memory) into text
    if (req.file) {
      console.log(' Uploaded file:', req.file.originalname, req.file.mimetype);
      const buffer = req.file.buffer;

      if (!buffer) {
        return res.status(400).json({ error: 'Uploaded file buffer is empty' });
      }

      console.log(' Starting in‑memory file processing for:', req.file.mimetype);

      switch (req.file.mimetype) {
        case 'application/pdf':
          console.log('[Parser] Extracting text from PDF (buffer)...');
          try {
            const pdfData = await PdfParse(buffer);
            let extractedText = pdfData.text?.trim() || '';

            if (!extractedText) {
              console.log('[Parser] Standard PDF parse empty, trying deep OCR extraction...');
              const pdfDoc = await PDFDocument.load(buffer);
              const numPages = pdfDoc.getPageCount();
              extractedText = await extractTextFromPDF(buffer, numPages);
            }

            if (!extractedText) {
              throw new Error('PDF appears to be empty or contains only images/scans.');
            }

            text = text
              ? `${text}\n\n${extractedText}`
              : extractedText;
          } catch (pdfErr) {
            console.error('PDF Parsing Error:', pdfErr);
            return res.status(400).json({ error: `Failed to parse PDF: ${pdfErr.message || pdfErr}` });
          }
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          console.log(' Extracting text from DOCX (buffer)...');
          try {
            const result = await mammoth.extractRawText({ buffer });
            const extractedText = result.value?.trim() || '';
            if (!extractedText) {
              throw new Error('DOCX appears to be empty.');
            }
            text = text
              ? `${text}\n\n${extractedText}`
              : extractedText;
          } catch (docxErr) {
            console.error('DOCX Parsing Error:', docxErr);
            return res.status(400).json({ error: `Failed to parse DOCX: ${docxErr.message || docxErr}` });
          }
          break;

        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          console.log('[Parser] Extracting text from PPTX (buffer)...');
          try {
            const extractedText = (await extractTextFromPptxBuffer(buffer)).trim();
            if (!extractedText) {
              throw new Error('PPTX appears to be empty.');
            }
            text = text
              ? `${text}\n\n${extractedText}`
              : extractedText;
            console.log(`[Parser] Successfully extracted ${extractedText.length} characters from PPTX`);
          } catch (pptErr) {
            console.error('PPTX Parsing Error:', pptErr);
            return res.status(500).json({ error: `Failed to parse PPTX file: ${pptErr.message || pptErr}` });
          }
          break;

        case 'text/plain':
          console.log('[Parser] Extracting text from plain text (buffer)...');
          try {
            const extractedText = buffer.toString('utf-8').trim();
            if (!extractedText) {
              throw new Error('Text file appears to be empty.');
            }
            text = text
              ? `${text}\n\n${extractedText}`
              : extractedText;
          } catch (txtErr) {
            console.error('Text Parsing Error:', txtErr);
            return res.status(400).json({ error: `Failed to parse text file: ${txtErr.message || txtErr}` });
          }
          break;

        default:
          console.error('Unsupported file type:', req.file.mimetype);
          return res.status(415).json({ error: `Unsupported file type: ${req.file.mimetype}` });
      }
    }

    // Nothing to process
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text or file provided' });
    }

    // 2. Chunking logic for large text (for LLM)
    const CHUNK_SIZE = 12000; // Character limit per API call
    const chunks = [];
    const sourceText = text.trim();
    for (let i = 0; i < sourceText.length; i += CHUNK_SIZE) {
      chunks.push(sourceText.substring(i, i + CHUNK_SIZE));
    }

    console.log(`[AI] Processing ${chunks.length} chunks...`);
    
    let allFlashcards = [];
    let finalTitle = 'Generated Flashcards';

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[AI] Processing chunk ${i + 1}/${chunks.length}`);
      
      const prompt = `
Create flashcards from the following content. Format your response as a JSON object with a "title" field and a "cards" array. Each card should have a "question" and "answer" field.
IMPORTANT: You must always provide a descriptive "title" that summarizes the topic. If the content is brief or lacks a clear heading, infer the most appropriate subject matter to create a meaningful title.
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

        let content = result.choices[0].message.content.trim();
          // --- DEBUGGING LOGS ---
    console.log(`[DEBUG] Raw Content from AI for Chunk ${i + 1}:`, content);

    // SAFETY: Remove markdown code blocks if the model included them
    if (content.startsWith('```')) {
      content = content.replace(/^```json\n?|```\$/g, '').trim();
    }


        const parsed = JSON.parse(content);

         // Validate the structure
    if (!parsed.title || !Array.isArray(parsed.cards)) {
      console.warn(`[DEBUG] Chunk ${i + 1} returned unexpected JSON structure:`, parsed);
    }

    console.log(`[AI] Chunk ${i + 1} generated ${parsed.cards?.length || 0} flashcards with title: "${parsed.title}"`);


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

    // 3. DB insertion
    try {
      console.log('[DB] Inserting flashcards...');
      const { data: container, error: container_error } = await supabase
        .from('flashcards_container')
        .insert({ title: finalTitle, user_id: userId, is_public: uploadedPublicUrl })
        .select()
        .single();

      if (container_error) {
        console.error(container_error.message);
        return res.status(500).json({ error: 'Failed to create flashcard container' });
      }
      
      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(allFlashcards.map((card) => ({
          container_id: container.id,
          question: card.question,
          answer: card.answer,
          set_id: userId,
        })));

      if (insertError) {
        console.error('[DB Error] insert flashcards', insertError);
        return res.status(500).json({ error: 'Failed to store flashcards' });
      }

      // Return container id so frontend can route user to the new flashcard set
      return res.json({
        containerId: container.id,
        flashcards: allFlashcards,
        title: finalTitle,
        fileUrl: uploadedPublicUrl,
      });
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
  console.log('Finished processing upload request');
});

// Feedback route: send email only (nothing stored)
// const resend = new Resend(process.env.RESEND_API_KEY);
// const FEEDBACK_TO_EMAIL = 'el797555@dal.ca';

// app.post('/api/feedback', async (req, res) => {
//   try {
//     const { user_email, subject, message } = req.body || {};
//     if (!message || typeof message !== 'string' || !message.trim()) {
//       return res.status(400).json({ error: 'Message is required' });
//     }
//     if (!process.env.RESEND_API_KEY) {
//       console.error('[Feedback] RESEND_API_KEY is not set');
//       return res.status(500).json({ error: 'Email is not configured' });
//     }
//     const fromEmail = (user_email && typeof user_email === 'string') ? user_email : 'feedback@resend.dev';
//     const subj = (subject && typeof subject === 'string') ? subject.trim() : 'App feedback';
//     const body = message.trim();
//     const textBody = body + (user_email ? `\n\n— From: ${user_email}` : '');

//     const { error } = await resend.emails.send({
//       from: 'Feedback <onboarding@resend.dev>',
//       to: [FEEDBACK_TO_EMAIL],
//       replyTo: fromEmail.includes('@') ? fromEmail : undefined,
//       subject: subj,
//       text: textBody,
//     });
//     if (error) {
//       console.error('[Feedback] Resend error:', error);
//       return res.status(500).json({ error: 'Failed to send feedback' });
//     }
//     return res.status(200).json({ success: true });
//   } catch (err) {
//     console.error('[Feedback] Error:', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Start server
app.listen(3001, () => console.log('Server listening on http://localhost:3001'));


export default app;
