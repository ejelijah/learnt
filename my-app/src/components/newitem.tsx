import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../superbaseClient';
import '../css/app.css';
import '../css/wel.css';

const NewItem = () => {
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [ error,setError] = useState('');
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) =>{
        e.preventDefault();
        try{

        if (!file && !notes.trim()) {
            setError('Please enter notes or select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('notes', notes);
        if (file) {
            formData.append('file', file);
        }
        formData.append( 'isPublic', isPublic ? 'true' : 'false');

        // get current session access token and include it in the request
        const { data: { session } } = await supabase.auth.getSession();
        let  token = session?.access_token;

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        console.log(formData);

        const response = await fetch(`${import.meta.env.VITE_BACKEND}/api/upload`, {
            method: 'POST',
            body: formData,
            headers,
            });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const result = await response.json();
        console.log(result);

        // Consider the request successful if the server returned flashcards or an explicit success flag
        const isSuccess = result.success || (Array.isArray(result.flashcards) && result.flashcards.length > 0);
        if (isSuccess) {
            setError('Item submitted successfully!');
            // clear the form fields
            setNotes('');
            setFile(null);
            setIsPublic(true);
            // navigate after successful submit
            navigate('../Home');
        }
    }
        catch (error) {
            if (error instanceof Error) {
                setError(`Error: ${error.message}`);
            } else {
                setError('An unknown error occurred');
            }
        }
        finally {
            setIsLoading(false);
        }
        if (isLoading) {
            return       <div className='display-flex justify-center items-center flex-col mt-4'>
            <p className='text-blue-500 size-lg mt-4'>Loading data...</p>
          </div>;
        }
    };
    if (error) {
        // If there's an error, display the error message
        return (
          <div className='display-flex justify-center items-center flex-col mt-4'>
            <p className='text-red-500 size-lg mt-4 border-collapse'>
              Error: {error}
              <br />
              Please try again later or contact support. or make cards manually.
            </p>
            {/* Optionally, add a button to retry or navigate home */}
            <button onClick={() => window.location.reload()} className='mt-2 p-2 bg-blue-500 text-white rounded'>
              Retry
            </button>
          </div>
        );
      }

    return (
        <div>
        <div className="text-white px-4 py-2 flex items-end justify-end">
        <button
          className=" flex justify-end items-end text-2xl font-bold bg-gray-800 text-white hover:bg-red-500 transition-colors duration-300 px-2 py-1 rounded-md"
          onClick={() => navigate("/Home")}
        >
          Back
        </button>
      </div>
      
        <form onSubmit={handleSubmit} className="newitem-form">
            <button type="button" onClick={() => navigate('/cards')} style={{ marginBottom: '10px',
                backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer'
            }}>
                make cards manually
            </button>
            <div>
                <label className=' size-lg p-4 text-secondary-p '>Handwritten Notes:</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Type your notes here..."
                    rows={6}
                    style={{ width: '100%' }}
                />
            </div>
            <div className=' size-lg text-secondary-p '>
                <label >Or upload a file (PDF, DOC):</label>
                <input
                    type="file"
                    accept=".pdf,.pptx,.docx"
                    onChange={handleFileChange}
                />
                {file && <div className=' size-md p-4 text-secondary-p '>{
                } Selected file: {file.name}
                    </div>
                    }
            </div>
            <div>
                <label className='m-2 
                p-4 size-lg' text-secondary-p >
                    <input

                        type="checkbox"
                        checked={isPublic}
                        onChange={e => setIsPublic(e.target.checked)}
                    />
                    Make this note public
                </label>
            </div>
            <button type="submit" className="submit">Submit</button>
        </form>
    </div>
    );
};

export default NewItem;