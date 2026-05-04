import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';

// A simple Navbar component so users can navigate
const Navigation = () => {
  const isLoggedIn = !!localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
  if (!isLoggedIn || !userEmail) return;

  const checkInbox = async () => {
    try {
      const response = await axios.get(`http://localhost:4001/inbox/${userEmail}`);
      const unreadCount = response.data.filter((m: any) => m.read === false).length;
      setMessageCount(unreadCount);
    } catch (err) { /* ... */ }
  };

  checkInbox();
  
  // 1. Keep the interval for background updates
  const interval = setInterval(checkInbox, 10000);
  
  // 2. LISTEN for the custom event we just created
  window.addEventListener("messagesUpdated", checkInbox);
  
  return () => {
    clearInterval(interval);
    window.removeEventListener("messagesUpdated", checkInbox);
  };
}, [isLoggedIn, userEmail]);

  

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
      <h1 className="text-xl font-bold tracking-wider">Cab Platform</h1>
      {isLoggedIn && (
        <div className="space-x-6 flex items-center">
          <Link to="/dashboard" className="hover:text-blue-200 font-medium transition-all">
            Book a Cab
          </Link>
          
          <Link to="/inbox" className="hover:text-blue-200 font-medium transition-all relative flex items-center">
            Inbox 📩
            {/* The Badge: Only renders if there is at least 1 message */}
            {messageCount > 0 && (
              <span className="absolute -top-3 -right-4 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                {messageCount}
              </span>
            )}
          </Link>
        </div>
      )}
    </nav>
  );
};


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navigation />

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inbox" element={<Inbox />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;