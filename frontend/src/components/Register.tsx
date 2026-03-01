import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login since registration is disabled
    navigate('/login');
  }, [navigate]);

  return null;
}

export default Register;
