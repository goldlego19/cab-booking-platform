import { motion } from 'framer-motion';

function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="p-8 text-center bg-gray-800 rounded-2xl shadow-xl"
      >
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
          Cab Booking Platform
        </h1>
        <p className="text-gray-300">
          Frontend successfully initialised!
        </p>
      </motion.div>
    </div>
  );
}

export default App;