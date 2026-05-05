import { Link } from 'react-router-dom';

const Home = () => {
  const userName = localStorage.getItem('userName') || 'TRAVELLER';

  return (
    // Replaced the static image with an animated multi-stop gradient
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 animate-gradient-xy flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Optional: Add some glowing ambient blobs behind the glass for extra depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Glassmorphism Container */}
      <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl max-w-3xl text-center text-white">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg tracking-tight">
          Welcome back, {userName}!
        </h1>
        <p className="text-xl mb-8 text-gray-200 drop-shadow-md font-medium">
          Your premium ride across the Maltese islands. Book a cab, track your history, and check the local weather before you travel.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/dashboard" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50"
          >
            Book a Ride
          </Link>
          <Link 
            to="/locations" 
            className="bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg backdrop-blur-sm"
          >
            Favourite Locations
          </Link>
          <Link 
            to="/bookings" 
            className="bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg backdrop-blur-sm"
          >
            My Bookings
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Home;