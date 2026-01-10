import './profile.css';
import { supabase } from '../superbaseClient'; 
import React, { useEffect, useState } from 'react';

const Profile = () => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData?.user?.id) {
          console.error('Error getting user:', userError);
          setLoading(false);
          return;
        }
        
        const userId = userData.user.id;
        
        const { data, error } = await supabase
          .from('users')
          .select('photo_url')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          return;
        }
        
        // ✅ Just use the photo_url that was already created during signup
        if (data?.photo_url) {
          setPhotoUrl(data.photo_url);
        }
        
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  return (
    <div className='profile'>
      {loading ? (
        <div className="image bg-gray-700 animate-pulse"></div>
      ) : photoUrl ? (
        <img src={photoUrl} alt="Profile" className="image" />
      ) : (
        <div className="image bg-gray-700 flex items-center justify-center text-white text-2xl">
          👤
        </div>
      )}
    </div>
  );
};

export default Profile;




