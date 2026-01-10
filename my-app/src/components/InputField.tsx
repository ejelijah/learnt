import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Inputfield.css';
import '../css/gen.css';
import '../css/wel.css';
import { supabase } from '../superbaseClient';

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

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <>
      <div className='container'>
        <p>enter your name here</p>
        <input
          type="text"
          placeholder="Enter text here"
          className="inputField"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <p>the name of your school here</p>
        <input
          type="text"
          placeholder="Enter text here"
          className="inputField"
          value={school}
          onChange={e => setSchool(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <p>Upload your profile picture (optional)</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="inputField"
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

