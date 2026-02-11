import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api'; // Import from api.ts to ensure shared instance
import { ACCESS_TOKEN } from '../constants';
import '../styles/form.css';
import LoadingIndicator from './LoadingIndicator';

interface FormProps {
  route: string;
  method: 'login' | 'register';
}

function Form({ method }: FormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const name = method === 'login' ? 'Login' : 'Register';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (method === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          // Sync token to localStorage for our Axios interceptor
          // localStorage.setItem(ACCESS_TOKEN, data.session.access_token);
          navigate('/dashboard');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Supabase sends a confirmation email by default
        alert(
          'Success! Please check your email for a verification link before logging in.'
        );
        navigate('/login');
      }
    } catch (error: any) {
      alert(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // window.location.origin ensures it works on localhost or your live domain
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message || 'Google Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h1>{name}</h1>
      <input
        className="form-input"
        type="email"
        value={email}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setEmail(e.target.value)
        }
        placeholder="Email"
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
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            style={{
              backgroundColor: '#fff',
              color: '#757575',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            Sign in with Google
          </button>
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
