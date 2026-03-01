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
  const [isLoading, setIsLoading] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();

    // 1. VALIDATION
    if (!file && !notes.trim()) {
      setError('Please enter notes or select a file to upload.');
      return;
    }

    // 2. START LOADING STATES
    setIsProcessing(true);
    setStatus("Uploading and analyzing content...");
    setError(""); 

    try {
      const formData = new FormData();
      formData.append('notes', notes);
      if (file) {
        formData.append('file', file);
      }
      formData.append('isPublic', isPublic ? 'true' : 'false');

      // 3. AUTHENTICATION
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 4. THE FETCH CALL
      const response = await fetch('/api/upload', {
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
        <button 
          type="button" 
          onClick={() => navigate('/cards')} 
          style={{ 
            marginBottom: '10px',
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          make cards manually
        </button>

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
