import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../superbaseClient';

const NewItem = () => {
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Set isLoading to false by default so the form shows up
  const [isLoading] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");

  // Mode toggle: manual text vs voice input
  const [mode, setMode] = useState<'manual' | 'voice'>('manual');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const generateFlashcards = async (notesInput: string, fileInput: File | null) => {
    // 1. VALIDATION
    if (!fileInput && !notesInput.trim()) {
      setError('Please enter notes or select a file to upload.');
      return;
    }

    // 2. START LOADING STATES
    setIsProcessing(true);
    setStatus("Uploading and analyzing content...");
    setError(""); 

    try {
      const formData = new FormData();
      formData.append('notes', notesInput);
      if (fileInput) {
        formData.append('file', fileInput);
      }
      formData.append('isPublic', isPublic ? 'true' : 'false');

      // 3. AUTHENTICATION
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 4. THE FETCH CALL
      const response = await fetch(`${import.meta.env.VITE_BACKEND}/api/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        const message =
          (errorData?.error && (errorData.error.message || errorData.error)) ||
          errorData?.message ||
          `Server error: ${response.status}`;

        // Log full error context for debugging
        console.error("Upload failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorData,
          message,
        });

        throw new Error(message);
      }

      const result = await response.json();
      console.log("Result from server:", result);

      // 5. HANDLE SUCCESS
      const isSuccess = result.success || (Array.isArray(result.flashcards) && result.flashcards.length > 0);

      if (isSuccess) {
        setNotes('');
        setFile(null);
        setIsPublic(true);
        setStatus("Success! Redirecting...");
        setTimeout(() => navigate('/Home'), 1000);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsProcessing(false); // Stop processing so user can see the error and retry
    } finally {
      // Cleanup is only called on success via timeout or if you want to reset here
      if (status !== "Success! Redirecting...") {
        setIsProcessing(false);
        setStatus("");
      }
    }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    await generateFlashcards(notes, file);
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setStatus("Transcribing audio...");
    setError("");

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${import.meta.env.VITE_BACKEND}/api/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({} as any));

      if (!response.ok) {
        const message =
          (data?.error && (data.error.message || data.error)) ||
          data?.message ||
          `Server error: ${response.status}`;

        console.error("Transcription failed:", {
          status: response.status,
          statusText: response.statusText,
          body: data,
          message,
        });

        throw new Error(message);
      }

      const text = (data as any).text as string | undefined;
      if (!text) {
        throw new Error('No transcription text returned from server.');
      }

      setNotes(text);
      // Immediately generate flashcards from the transcribed text
      await generateFlashcards(text, file);
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio.');
      setIsProcessing(false);
      setStatus("");
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Your browser does not support audio recording.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioForTranscription(audioBlob);
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();
    } catch (err) {
      console.error("Recording error:", err);
      setError('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  // --- RENDERING LOGIC ---

  if (isProcessing) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] mt-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-blue-500 text-lg font-medium animate-pulse">
          {status}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Please wait, this usually takes about 10-20 seconds.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex justify-center items-center flex-col mt-4'>
        <p className='text-blue-500 text-lg mt-4'>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex justify-center items-center flex-col mt-4 p-6'>
        <p className='text-red-500 text-lg mt-4 text-center'>
          {error}
          <br />
          Please try again later or make cards manually.
        </p>
        <button 
          onClick={() => { setError(''); setIsProcessing(false); }} 
          className='mt-4 p-2 bg-blue-500 text-white rounded px-6'
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-40 p-2 backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-gray-100 rounded-full transition-all flex items-center justify-center active:scale-95 bg-white/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      <form onSubmit={handleGenerate} className="newitem-form">
        
        {/* Mode toggle: Manual vs Voice */}
        <div className="flex gap-2 mb-4 justify-center">
          <button
            type="button"
            className={`px-4 py-2 rounded-full border text-sm ${mode === 'manual' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => navigate('/cards')} 
          >
            Manual Entry
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full border text-sm ${mode === 'voice' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setMode('voice')}
          >
            Voice Mode
          </button>
        </div>

        {mode === 'manual' && (
          <>
            <div>
              <label className='size-lg p-4 text-secondary-p'>Handwritten Notes:</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Type your notes here..."
                rows={6}
                style={{ width: '100%' }}
              />
            </div>

            <div className='size-lg text-secondary-p'>
              <label>Or upload a file (PDF, PPTX, DOC):</label>
              <input
                type="file"
                accept=".pdf,.pptx,.docx"
                onChange={handleFileChange}
              />
              {file && (
                <div className='size-md p-4 text-secondary-p'>
                  Selected file: {file.name}
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'voice' && (
          <div className="size-lg p-4 text-secondary-p">
            <p className="mb-2">
              Use your voice to create flashcards. We&apos;ll transcribe your speech and generate cards automatically.
            </p>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-full text-white ${isRecording ? 'bg-red-600' : 'bg-green-600'}`}
              disabled={isProcessing}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {isRecording && (
              <div className="flex items-center mt-2">
                <span className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-ping mr-2" />
                <span className="text-red-500 text-sm">Recording...</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className='m-2 p-4 size-lg text-secondary-p'>
            <input
              className='text-gray-200 dark:text-gray-800 mr-2'
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
            />
            Make this note public
          </label>
        </div>

        <button 
          type="submit" 
          className="submit"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Submit'}
        </button>
      </form>
    </div>  
  );
};

export default NewItem;
