import React, { useEffect, useState } from 'react';
import '../css/gen.css';
import '../css/wel.css';
import { supabase } from '../superbaseClient';
import logo from '../logo.svg';
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

    return (
        <div className="container">
            <h2>Profile Setup</h2>
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
            <div style={{marginBottom: 8, color: 'white'}}>
                <strong>Name:</strong> {profile?.name || 'Not set'}
            </div>
            <div style={{ marginBottom: 8, color: 'white'}}>
                <strong>School:</strong> {profile?.school || 'Not set'}
            </div>
            <div>
                <p style={{ color: 'white' }}>
                    To update your profile, please go to the <Link to="/input" style={{ color: 'blue' }}>change</Link>
                </p>
                <p style={{ color: 'white' }}>
                    If you have nothing to do you can go back home here <Link to="/Home" style={{ color: 'blue' }}>home</Link>
                </p>
            </div>
        </div>
    );
};

export default User;