import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../superbaseClient';
import '../css/app.css';
// Adjust path as needed

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    })();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const recipient = 'el797555@dal.ca';
    const emailSubject = encodeURIComponent(subject.trim() || 'New Feedback Submission');
    const emailBody = encodeURIComponent(
      `From: ${userEmail || 'Anonymous User'}\n\n${message.trim()}`
    );

    // This opens the user's default mail app (Outlook, Mail, etc.)
    window.location.href = `mailto:${recipient}?subject=${emailSubject}&body=${emailBody}`;
  };

  return (
    <div className="feedback-page" style={styles.page}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={styles.backButton}
        aria-label="Go back"
      >
        ← Back
      </button>

      <div style={styles.card}>
        <h1 style={styles.title}>Send feedback</h1>
        <p style={styles.subtitle}>
          Share your thoughts or report an issue. This will open your email app to send a message to the team.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Subject (optional)
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your feedback or suggestion..."
              rows={6}
              required
              style={{ ...styles.input, ...styles.textarea }}
            />
          </label>

          <button
            type="submit"
            style={styles.submitBtn}
          >
            Open Email App
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    padding: 24,
    boxSizing: 'border-box',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid #ddd',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  card: {
    maxWidth: 520,
    margin: '40px auto 0',
    padding: 32,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#555',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 15,
  },
  textarea: {
    resize: 'vertical',
    minHeight: 120,
  },
  submitBtn: {
    padding: '12px 24px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  }
};



export default Feedback;
