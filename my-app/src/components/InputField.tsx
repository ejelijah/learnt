import React, { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Inputfield.css';
import '../css/app.css';
import { supabase } from '../../superbaseClient';
import Slogan from '../components/slogan';
import { useLocation } from 'react-router-dom';

interface UserProfile {
  user_id: string;
  name: string;
  school: string;
  photo_url?: string;
}

interface InputFieldProps {
  onFileSelect?: (file: File) => void;
}

const InputField: React.FC<InputFieldProps> = ({ onFileSelect }) => {
  const location = useLocation();
  const [isEntryPhase, setIsEntryPhase] = useState(location.state?.fromWelcome || false);
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      
      setSelectedImage(file);
      setError('');
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem('profileImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!school.trim()) {
      setError('Please enter your school name.');
      return;
    }

    setError('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      const userId = userData?.user?.id;
      if (userError || !userId) {
        setError('User not authenticated.');
        return;
      }

      let finalPhotoUrl: string;
    
      if (selectedImage) {
        // Upload custom image
        const filePath = `${userId}/${Date.now()}-${selectedImage.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatar')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          setError(`Upload failed: ${uploadError.message}`);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatar')
          .getPublicUrl(uploadData.path);
          
        finalPhotoUrl = publicUrl;
      } else {
        // Generate avatar from name
        finalPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random&color=fff&size=128`;
      }

      const updateData: UserProfile = {
        user_id: userId,
        name: name.trim(),
        school: school.trim(),
        photo_url: finalPhotoUrl
      };

      const { error: updateError } = await supabase
        .from('users')
        .upsert(updateData);

      if (updateError) {
        console.error('Error saving data:', updateError);
        setError('Error saving data. Please try again.');
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      navigate('/Home');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Error saving data. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

    useEffect(() => {
      if (location.state?.fromWelcome) {
      // This timer controls how long the "Learn to Earn" animation stays on screen
      const timer = setTimeout(() => {
        setIsEntryPhase(false);
      }, 5500); // 3.5 seconds total
  
      return () => clearTimeout(timer);
    }
    }, [location.state]);

  
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isEntryPhase) {
    return <Slogan />;
  }


  if (localStorage.theme === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }

  return (
    <>
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-40 p-2 backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-gray-100 rounded-full transition-all flex items-center justify-center active:scale-95 bg-white/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div className='container'>
   
        <p className='text-primary'>enter your name here</p>
        <input
          type="text"
          placeholder="Enter text here"
          className="inputField"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <p className='text-primary'>the name of your school here</p>
        <input
          type="text"
          placeholder="Enter text here"
          className="inputField"
          value={school}
          onChange={e => setSchool(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <p className='text-primary'>Upload your profile picture (optional)</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="inputField text-sm text-secondary"
        />
        {previewUrl && (
          <div style={{ marginTop: '10px' }}>
            <img
              src={previewUrl}
              alt="Profile Preview"
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
        )}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button 
          className="submit" 
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </>
  );
};

export default InputField;

