import React, { useEffect, useState } from 'react';
import { supabase } from '../superbaseClient';
import logo from '../logo.svg';
import '../css/gen.css';
import { Link } from 'react-router-dom';

export const DEFAULT_PHOTO = logo;


interface UserProfile {
  user_id: string;
  name: string;
  school: string;
  photo_url?: string;
}


const User = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!loading) return;
            
            try {
                const { data: userData, error: userError } = await supabase.auth.getUser();
                console.log('Auth user data:', userData); // Debug auth
                
                const userId = userData?.user?.id;
                if (userError || !userId) {
                    console.error('User not authenticated or error fetching user:', userError);
                    setError('Please login to view your profile');
                    setLoading(false);
                    return;
                }

                const { data, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                
                if (fetchError) {
                    console.error('Fetch error:', fetchError);
                    setError('Could not fetch profile.');
                } else if (!data) {
                    console.error('No profile data found');
                    setError('Profile not found.');
                } else {
                    if (!data.photo_url) {
                        console.log('No photo URL in profile data');
                    }
                    setProfile(data);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                setError('An unexpected error occurred.');
            }
            setLoading(false);
        };

        fetchProfile();
    }, []); // Empty dependency array - run once on mount

    if (loading) return <div>Loading profile...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    // On page load or in a useEffect
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  
  // To change the theme
  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    } else {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    }
  }
  

    return (
        <div className="container">
            <h2 className='text-primary'>Profile Setup</h2>
            <img
                src={profile?.photo_url || DEFAULT_PHOTO}
                alt="Profile"
                className="image"
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }}
                onError={(e) => {
                    console.error('Image failed to load:', profile?.photo_url);
                    e.currentTarget.src = DEFAULT_PHOTO;
                }}
                onLoad={() => console.log('Image loaded successfully:', profile?.photo_url)}
            />
            <div className='text-secondary'>
                <strong>Name:</strong> {profile?.name || 'Not set'}
            </div>
            <div className='text-secondary'>
                <strong>School:</strong> {profile?.school || 'Not set'}
            </div>
            <div>
                <p className='text-secondary-p'>
                    To update your profile, please go to the <button className='accent' onClick={() => {
                        window.location.href = '/input';
                    }}>
                        update
                    </button>
                </p>
                <p className='text-secondary-p'>
                    If you have nothing to do you can go back home here 
                    <button className='accent' onClick={() => {
                        window.location.href = '/Home';
                    }}>
                     Home
                    </button>
                </p>
            </div>

    <button
      onClick={toggleTheme}
      className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
    >     
      Toggle Mode
    </button>
        </div>
    );
};

export default User;