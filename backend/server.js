
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import { supabase } from './supabaseClient.js';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { pipeline } from '@xenova/transformers';
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


// Middleware: log incoming requests
app.use((req, res, next) => {
  // console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Middleware: CORS

app.use(cors({
  origin: 'http://localhost:3000',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
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
        console.log(buffer.length, 'bytes');

      // ===============================
      // FIXED DOCUMENT PARSING CODE
      // ===============================

    try {
      console.log(' Starting file processing for:', req.file.mimetype);
      
      switch (req.file.mimetype) {

        case "application/pdf":
      console.log(" Extracting text from PDF...");

      try {
        // Step 1: Try pdf-parse for embedded text
        const pdfData = await PdfParse(req.file.buffer);
        text = pdfData.text?.trim() || "";
        console.log(` Extracted text length: ${text.length} characters`);

        // Step 2: If no text, fallback to OCR
        if (!text) {
          console.log("[OCR] PDF appears image-only, starting OCR fallback...");

          // Get number of pages using pdf-lib
          const pdfDoc = await PDFDocument.load(req.file.buffer);
          const numPages = pdfDoc.getPageCount();
          console.log(`[OCR] PDF has ${numPages} pages`);

          if (numPages === 0) {
            throw new Error("PDF contains no pages");
          }


          text = await extractTextFromPDF(buffer, numPages);
          console.log(`[OCR] Total OCR text length: ${text.length} characters it was successful`);
        }

        if (!text) {
          throw new Error("PDF appears to contain no readable text");
        }

        console.log("[PDF] Text extraction completed successfully");

      } catch (pdfErr) {
        console.error("[PDF] Parsing error:", pdfErr);
        return res.status(400).json({ error: `Failed to parse PDF: ${pdfErr.message}` });
      }

      break;


        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          console.log('[Parse] Extracting text from DOCX...');
          try {
            console.log('[DOCX] Processing buffer length:', buffer.length);
            
            const result = await mammoth.extractRawText({ buffer });
            
            // FIXED: Check mammoth result structure
            if (!result || typeof result.value !== 'string') {
              throw new Error('Invalid response from mammoth parser');
            }
            
            text = result.value.trim();
            console.log(`[DOCX] Extracted text length: ${text.length} characters`);
            
            // FIXED: Log warnings from mammoth
            if (result.messages && result.messages.length > 0) {
              console.warn('[DOCX] Mammoth warnings:', result.messages);
            }
            
            if (!text) {
              throw new Error('DOCX file appears to be empty or contains no readable text');
            }
            
          } catch(docxErr) {
            console.error('[DOCX] Parsing error:', docxErr);
            return res.status(400).json({ error: `Failed to parse DOCX: ${docxErr.message}` });
          }
          break;

        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          console.log('[Parse] Extracting text from PPTX...');
          try {
            console.log('[PPTX] Processing buffer length:', buffer.length);
            
            // FIXED: Add multiple fallback methods
            let pptxText = '';
            
            try {
              // Method 1: Try pptx-parser
              const { PptxParser } = await import('pptx-parser');
              const slides = await PptxParser.parseBuffer(buffer);
              
              console.log('[PPTX] pptx-parser result type:', typeof slides);
              console.log('[PPTX] pptx-parser result length/value:', Array.isArray(slides) ? slides.length : 'not array');
              
              // FIXED: Handle different return types from pptx-parser
              if (Array.isArray(slides)) {
                // Filter out empty slides
                const validSlides = slides.filter(slide => 
                  slide && (typeof slide === 'string' ? slide.trim() : JSON.stringify(slide).trim())
                );
                pptxText = validSlides.join("\n\n");
              } else if (typeof slides === 'string') {
                pptxText = slides;
              } else if (slides && typeof slides === 'object') {
                pptxText = JSON.stringify(slides);
              } else {
                throw new Error('Unexpected return format from pptx-parser');
              }
              
            } catch (pptxParserErr) {
              console.warn('[PPTX] pptx-parser failed:', pptxParserErr.message);
              
              // Method 2: Manual ZIP extraction fallback
              console.log('[PPTX] Trying manual ZIP extraction...');
              
              const JSZip = require('jszip');
              const zip = await JSZip.loadAsync(buffer);
              
              const extractedTexts = [];
              let slideCount = 0;
              
              // Look for slide files
              for (const [filename, file] of Object.entries(zip.files)) {
                if (filename.match(/ppt\/slides\/slide\d+\.xml$/)) {
                  slideCount++;
                  console.log(`[PPTX] Processing ${filename}`);
                  
                  const content = await file.async('text');
                  
                  // Basic XML text extraction
                  const textContent = content
                    .replace(/<\/[^>]+>/g, '\n')  // Replace closing tags with newlines
                    .replace(/<[^>]*>/g, ' ')     // Remove all XML tags
                    .replace(/&lt;/g, '<')       // Decode HTML entities
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')        // Normalize whitespace
                    .trim();
                  
                  if (textContent && textContent.length > 10) {
                    extractedTexts.push(`--- Slide ${slideCount} ---\n${textContent}`);
                    console.log(`[PPTX] Extracted ${textContent.length} chars from ${filename}`);
                  }
                }
              }
              
              if (extractedTexts.length === 0) {
                throw new Error(`No readable text found in PowerPoint file (${slideCount} slides processed)`);
              }
              
              pptxText = extractedTexts.join('\n\n');
            }
            
            text = pptxText.trim();
            console.log(`[PPTX] Final extracted text length: ${text.length} characters`);
            
            if (!text) {
              throw new Error('PowerPoint file contains no readable text content');
            }
            
          } catch(pptxErr) {
            console.error('[PPTX] Parsing error:', pptxErr);
            
            // FIXED: Check if it's a dependency issue
            if (pptxErr.message.includes('Cannot resolve module') || pptxErr.message.includes('pptx-parser')) {
              return res.status(500).json({ 
                error: 'PowerPoint processing library not available. Please install required dependencies.' 
              });
            } else {
              return res.status(400).json({ error: `Failed to parse PowerPoint: ${pptxErr.message}` });
            }
          }
          break;

        case "text/plain":
          console.log('[Parse] Reading plain text file...');
          try {
            text = buffer.toString("utf-8").trim();
            console.log(`[TXT] Extracted text length: ${text.length} characters`);
            
            if (!text) {
              throw new Error('Text file is empty');
            }
            
          } catch(txtErr) {
            console.error('[TXT] Error reading text file:', txtErr);
            return res.status(400).json({ error: 'Failed to read text file: ' + txtErr.message });
          }
          break;

        default:
          console.warn('[Parse] Unsupported file type:', req.file.mimetype);
          // FIXED: Return error immediately for unsupported types
          return res.status(415).json({ 
            error: `Unsupported file type: ${req.file.mimetype}. Supported formats: PDF, DOCX, PPTX, TXT` 
          });
      }

    // Continue with the rest of your code...

        }
        catch (generalErr) {
          console.error('[Parse] General file processing error:', generalErr);
          return res.status(500).json({ error: 'Failed to process uploaded file: ' + generalErr.message });
        }

        
        if (!text) {
          console.warn('[Validation] No text extracted from input');
          return res.status(400).json({ error: 'No text or file provided' });
        }

    // Replace Hugging Face API call with local @xenova/transformer

    // Inside your /api/upload route
      let generatedText;
      try{
        console.log('[AI] Generating flashcards...');

        const prompt = `
    Create flashcards from the following content. Format your response as a JSON object with a "title" field and a "cards" array. Each card should have a "question" (question) and "answer" (answer) field.

    Example format:
    {
      "title": "Topic Name",
      "cards": [
        {
          "question": "Question or prompt",
          "answer": "Answer or explanation"
        },
        {
          "question": "Another question",
          "answer": "Another answer"
        }
      ]
    }

    Content to convert into flashcards:
    ${text}

    Generate clear, concise flashcards that test key concepts and understanding. Give the JSON string like that nothing else at all.

      `;
        
        // Load model (downloads first time, then cached)
        const result = await groq.chat.completions.create
        ({ 
          messages: [
            { role:  "system", content: "You are an expert flashcard generator." },
          { role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
        });
        console.log('Raw response:', result);

        let content = result.choices[0].message.content.trim();

        if (!content) {
          throw new Error('Empty response from AI model');
        }


        let parsedResponse;

        try {
          console.log('raw airesposne:', content);
          parsedResponse = JSON.parse(content);
          console.log('Parsed successfully:', parsedResponse);

        } catch (parseError) {
          console.error('Parse error details:', parseError.message);
          console.error('Failed to parse JSON:', content);
          throw new Error('AI returned invalid JSON');
        }

        generatedText = parsedResponse;
   
      } catch (aiErr) {
        console.error('[AI Error]', aiErr);
        return res.status(500).json({ error: 'Failed to generate flashcards' });
      }


      let title = '';
      let flashcards = [];
      console.log('[Flashcards] Parsing generated text...');
      if (generatedText.title && generatedText.cards) {
        console.log(generatedText.title);
        console.log(generatedText.cards);
        title = generatedText.title;
        flashcards = generatedText.cards;
      }
      // If it's just an array: [...]
      else if (Array.isArray(generatedText)) {
        title = 'Untitled Flashcard Set'; // or get from elsewhere
        flashcards = generatedText;
      }
      // If it's nested differently
      else {
        console.error('Unexpected structure:', generatedText);
      }
      
      console.log('Title:', title);
      console.log('Flashcards:', flashcards);



        try {
          console.log('[DB] Inserting flashcards...');

            const { data: container, error: container_error} = await supabase
              .from('flashcards_container')
              .insert([{ 
                title: title,
                user_id: userId,
                is_public: req.body.isPublic
                 // Current user's ID
              }])
              .select()
              .single();
          
            if (container_error) throw error;
            
            console.log('[DB] Container created:', container);
          
            let containerId = container.id;
            const { data: insertData, error: insertError } = await supabase
              .from('flashcards')
              .insert(flashcards.map(card => ({

                container_id: containerId,  // ← Link to container (was "id")
                question: card.question,
                answer: card.answer,
                set_id: userId,  // ← Changed from "set_id" to "user_id"
              })))
              .select();
          
            if (insertError) throw insertError;
          
            console.log('[DB] Flashcards inserted:', insertData.length);
          

        } catch (dbErr) {
          console.error('[DB Error]', dbErr);
          return res.status(500).json({ error: 'Failed to store flashcards' });
          }
                res.json({ flashcards, fileUrl: uploadedPublicUrl }); 
      }  

  }
    catch (error) {
      console.error('[Server Error]', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });




// Start server
app.listen(3001, () => console.log('Server listening on http://localhost:3001'));


export default app;
