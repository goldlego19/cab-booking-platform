import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Calling your Customer Microservice
      await axios.post('http://localhost:4001/register', formData);
      
      // If successful, send them to the login page
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create an Account</h2>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input type="text" name="firstName" required className="mt-1 w-full p-2 border rounded" onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Surname</label>
            <input type="text" name="surname" required className="mt-1 w-full p-2 border rounded" onChange={handleChange} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input type="email" name="email" required className="mt-1 w-full p-2 border rounded" onChange={handleChange} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" name="password" required className="mt-1 w-full p-2 border rounded" onChange={handleChange} />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in here</Link>
      </p>
    </div>
  );
};

export default Register;