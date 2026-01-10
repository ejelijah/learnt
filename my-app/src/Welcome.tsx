import React, { useState } from 'react';
import './css/gen.css';
import './css/wel.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from './superbaseClient';


const Welcome = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const navigate = useNavigate();
  const validateEmail = (email: string) => {
    // Simple email regex
    return /\S+@\S+\.\S+/.test(email);
  };
  const use_handleSubmit = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    if (isLogin) {
      // Login flow for existing users (Supabase)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password.');
        } else {
          setError(signInError.message || 'Login failed.');
        }
        return;
      }
      navigate('/Home'); // Redirect to Home after successful login
    } else {
      // Signup flow for new users (Supabase)
      const {error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('This email is already registered. Please log in instead.');
          setIsLogin(true);
        } else {
          setError(signUpError.message || 'Registration failed.');
        }
        return;
      }
      // Get the user id from Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        setError('Account created, but failed to get user ID.');
        return;
      }
      const userId = userData.user.id;
      // Insert user info into users table with user_id
      const { error: dbError } = await supabase.from('users').insert([{ user_id: userId}]);
      if (dbError) {
        setError('Account created, but failed to save user info.');
        return;
      }
      navigate('/input');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      use_handleSubmit();
    }
  };

  return (
    <>
      <div className="welcome-container">
        <h1>welcome to learnex</h1>
        <h3>please fill in the information</h3>
        <input
          type="text"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className='email'
          onKeyDown={handleKeyDown}
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='password'
          onKeyDown={handleKeyDown}
        />
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <button
            className="submit"
            onClick={use_handleSubmit}
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </div>
        <button
            className="toggle"
            style={{ marginLeft: '10px' }}
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
          </button>
      </div>
    </>
  );
};

export default Welcome;
