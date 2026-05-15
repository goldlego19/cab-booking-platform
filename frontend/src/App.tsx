import { useState, useEffect, type JSX } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Home from './pages/Home';
import Locations from './pages/Location';
import Bookings from './pages/Bookings';


// A simple Navbar component so users can navigate
const Navigation = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
  if (!isLoggedIn || !userEmail) return;

  const checkInbox = async () => {
    try {
      const response = await axios.get(`https://gateway-api-88100526402.europe-west1.run.app/inbox/${userEmail}`);
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

const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  
return (
    <nav className="bg-gray-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-50">
      <Link to={isLoggedIn ? "/home" : "/login"} className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
        M-CAB
      </Link>
      
      <div className="flex items-center space-x-6">
        {/* LOGGED OUT VIEW */}
        {!isLoggedIn && (
          <>
            <Link to="/login" className="hover:text-blue-400 transition-colours font-medium">Log In</Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colours">Register</Link>
          </>
        )}

        {/* LOGGED IN VIEW */}
        {isLoggedIn && (
          <>
            <Link to="/home" className="hover:text-blue-400 transition-colours font-medium">Home</Link>
            <Link to="/dashboard" className="hover:text-blue-400 transition-colours font-medium">Book Ride</Link>
            <Link to="/locations" className="hover:text-blue-400 transition-colours font-medium">Favourites</Link>
            <Link to="/bookings" className="hover:text-blue-400 transition-colours font-medium">History</Link>
            
            <Link to="/inbox" className="hover:text-blue-400 font-medium transition-colours relative flex items-center">
              Inbox 📩
              {messageCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                  {messageCount}
                </span>
              )}
            </Link>
            
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colours font-medium ml-4 border-l border-gray-700 pl-4">
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

function App() {
  // A wrapper component to protect routes
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const isAuthenticated = !!localStorage.getItem('token');
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // A wrapper to redirect logged-in users away from auth pages
  const AuthRoute = ({ children }: { children: JSX.Element }) => {
    const isAuthenticated = !!localStorage.getItem('token');
    return isAuthenticated ? <Navigate to="/home" replace /> : children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
            
            {/* Protected Routes */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;