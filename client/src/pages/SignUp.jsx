import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <header className="auth-header">
        <div className="avatar-container">
          <div className="avatar-img" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', width: '60px', height: '60px', margin: '0 auto' }}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '32px', height: '32px' }}>
              <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="chat-info" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem' }}>Join FitBot</h1>
          <span className="status-text">Start your journey today</span>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input 
            type="text" 
            id="name" 
            required 
            placeholder=" " 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="name">Full Name</label>
        </div>

        <div className="input-group">
          <input 
            type="email" 
            id="email" 
            required 
            placeholder=" " 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="email">Email Address</label>
        </div>

        <div className="input-group">
          <input 
            type="password" 
            id="password" 
            required 
            placeholder=" " 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="password">Password</label>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-link">
        Already have an account? <Link to="/signin">Sign In</Link>
      </div>
    </main>
  );
};

export default SignUp;
