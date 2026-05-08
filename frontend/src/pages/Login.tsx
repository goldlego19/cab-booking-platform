import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Calling your Customer Microservice
      const response = await axios.post('http://localhost:4000/login', formData);
      
      // Save the token and email to localStorage so the app remembers who is logged in
      console.log('Login successful, received:', response.data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', response.data.name); // Save the user's name for a more personalized experience
      
      // Redirect to the booking dashboard
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Ambient Glow */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px]"
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl text-white"
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center tracking-tight">Welcome Back</h2>
        
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" 
              onChange={handleChange} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all" 
              onChange={handleChange} 
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50 disabled:bg-blue-800 disabled:shadow-none transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-300">
          Don't have an account? <Link to="/register" className="text-blue-400 font-bold hover:text-blue-300 hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;