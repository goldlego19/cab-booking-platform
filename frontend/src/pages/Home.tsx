import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

const Home = () => {
  const userName = localStorage.getItem('userName') || 'TRAVELLER';

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 300, damping: 24 } 
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Ambient Glows */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px]"
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px]"
      />

      {/* Glassmorphism Container */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl max-w-3xl text-center text-white"
      >
        <motion.h1 variants={itemVariants} className="text-5xl font-extrabold mb-4 drop-shadow-lg tracking-tight">
          Welcome back, {userName}!
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-xl mb-8 text-gray-200 drop-shadow-md font-medium leading-relaxed">
          Your premium ride across the Maltese islands. Book a cab, track your history, and check the local weather before you travel.
        </motion.p>
        
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link 
              to="/dashboard" 
              className="block bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50"
            >
              Book a Ride
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link 
              to="/locations" 
              className="block bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg backdrop-blur-sm"
            >
              Favourite Locations
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link 
              to="/bookings" 
              className="block bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg backdrop-blur-sm"
            >
              My Bookings
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

    </div>
  );
};

export default Home;