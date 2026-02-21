import React, { useState, useEffect } from 'react';
import { supabase } from '../../superbaseClient';

const Slogan: React.FC = () => {
  const [isEarnMode, setIsEarnMode] = useState<boolean>(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const user_id = user?.id;
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('user_id', user_id)
          .single();

        
        if (data && data.name) {
          setUserName(data.name);
          console.log('User name fetched:', data.name);
        }
        if (error) {
          console.error('Error fetching user name:', error.message);
        }
      }

      setLoading(false);

      // Start the automatic transition after the profile loads
      setTimeout(() => {
        setIsEarnMode(true);
      },2000); // 2 second delay before the "L" vanishes
    };

    getUserProfile();
  }, []);

  if (loading) return null;

  return (
    <>
      <style>
        {`
           @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');

          .logo-wrapper {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 4rem;
            background: transparent;
            text-align: center;
          }

          .welcome-container h2 {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.5rem;
            color: #FFFFFF;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          /* 2. THE MOVEMENT: All transitions set to 2 seconds */
          .futuristic-logo-h {
            font-family: 'Orbitron', sans-serif;
            font-size: clamp(2.5rem, 10vw, 6rem);
            font-weight: 700;
            color: #00F2FF; /* Initial Cyan */
            display: flex;
            align-items: center;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            transition: all 2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .letter-l {
            display: inline-block;
            max-width: 1.5ch; /* Initial visible width */
            opacity: 1;
            overflow: hidden;
            white-space: nowrap;
            transition: all 2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .slogan-text {
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            color: #00F2FF;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
            transition: all 2s ease;
          }

          /* ACTIVE STATE: Triggered after 3.5 seconds */
          .active-earn .futuristic-logo-h {
            color: #FFD700; /* Final Gold */
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
            transform: scale(1.05);
          }

          .active-earn .letter-l {
            max-width: 0;
            opacity: 0;
            transform: translateX(-40px);
          }

          .active-earn .slogan-text {
            color: #FFD700;
            opacity: 1;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
          }
        `}
      </style>

      <div className={`logo-wrapper ${isEarnMode ? 'active-earn' : ''}`}>
        <div className="welcome-container">
        <h2>{userName ? `Welcome back, ${userName}` : "Welcome! Let's start your journey"}!</h2>
        </div>

        <p className="slogan-text">
          {isEarnMode ? "and" : "to where you can "}
        </p>

        <h1 className="futuristic-logo-h">
          <span className="letter-l">L</span>EARN
        </h1>
      </div>
    </>
  );
};

export default Slogan;
