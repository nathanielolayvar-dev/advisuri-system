import { useState, FormEvent, ChangeEvent } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import '../styles/form.css';
import LoadingIndicator from './LoadingIndicator';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

// 1. Define the shape of your backend API response
interface AuthResponse {
  access: string;
  refresh: string;
}

interface FormProps {
  route: string;
  method: 'login' | 'register';
}

function Form({ route, method }: FormProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const name = method === 'login' ? 'Login' : 'Register';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Pass the AuthResponse interface to the post request
      const res = await api.post<AuthResponse>(route, { username, password });

      if (method === 'login') {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

        // This grabs the 'teacher' or 'student' role from your Django response
        localStorage.setItem('user_role', (res.data as any).role);

        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    if (!credentialResponse.credential) return;

    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/api/auth/google/', {
        token: credentialResponse.credential,
      });

      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

      navigate('/');
    } catch (error) {
      console.error('Google Login Failed', error);
      alert('Failed to login with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h1>{name}</h1>
      <input
        className="form-input"
        type="text"
        value={username}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setUsername(e.target.value)
        }
        placeholder="Username"
        required
      />

      <input
        className="form-input"
        type="password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
        placeholder="Password"
        required
      />

      {loading && <LoadingIndicator />}

      <button className="form-button" type="submit" disabled={loading}>
        {loading ? 'Processing...' : name}
      </button>

      {method === 'login' && (
        <>
          <div className="social-divider">OR</div>
          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert('Google Login Failed')}
              useOneTap
            />
          </div>
        </>
      )}

      <div className="form-footer">
        {method === 'login' ? (
          <p>
            New here? <a href="/register">Create an account</a>
          </p>
        ) : (
          <p>
            Already have an account? <a href="/login">Login here</a>
          </p>
        )}
      </div>
    </form>
  );
}

export default Form;
