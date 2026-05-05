import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
  id: string;
  type: string;
  message: string;
  read: boolean; // 1. Added read property to the interface
  timestamp: any;
}

const Inbox = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const userEmail = localStorage.getItem('userEmail');

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:4001/inbox/${userEmail}`);
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userEmail) {
      navigate('/login');
      return;
    }

    fetchMessages();
    
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [userEmail, navigate]);

  useEffect(() => {
    const markAsRead = async () => {
      try {
        await axios.put(`http://localhost:4001/inbox/read/${userEmail}`);
        
        // 2. Alert the Navigation component to clear the badge immediately
        window.dispatchEvent(new Event("messagesUpdated"));
        
        // 3. Re-fetch locally so the items grey out immediately without waiting 10s
        fetchMessages(); 
      } catch (err) {
        console.error("Failed to mark messages as read");
      }
    };

    if (userEmail) {
      markAsRead();
    }
  }, [userEmail]);

const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy p-4 md:p-8 relative overflow-hidden">
      
      {/* Ambient Glow */}
      <motion.div 
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-full h-full bg-blue-500/10 pointer-events-none"
      />

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl mb-6 flex justify-between items-center text-white"
        >
          <h2 className="text-3xl font-bold tracking-tight">Your Inbox</h2>
          <span className="bg-blue-600/50 border border-blue-400/50 text-blue-100 text-sm font-bold px-4 py-1.5 rounded-full shadow-inner">
            {messages.length} Messages
          </span>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm">
            {error}
          </motion.div>
        )}

        {isLoading ? (
          <div className="text-center text-blue-200 py-10 animate-pulse font-medium">Decrypting your messages...</div>
        ) : messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-md border border-dashed border-white/20 rounded-2xl p-12 text-center text-gray-400 shadow-xl"
          >
            <div className="text-5xl mb-4 opacity-50">📭</div>
            <p className="text-lg">Your inbox is currently empty. Book a cab to get started!</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  variants={itemVariants}
                  className={`p-6 rounded-2xl border-l-4 shadow-xl flex items-start gap-5 transition-all duration-500 backdrop-blur-md
                    ${msg.read 
                      ? 'bg-white/5 border-l-gray-500 opacity-60 grayscale-[50%]' 
                      : 'bg-white/10 border-white/20'
                    }
                    ${!msg.read && msg.type === 'CabReady' ? 'border-l-green-400 shadow-[0_0_15px_rgba(74,222,128,0.15)]' : ''}
                    ${!msg.read && msg.type === 'DiscountAvailable' ? 'border-l-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.15)]' : ''}
                  `}
                >
                  <div className={`text-4xl mt-1 ${msg.read ? 'opacity-50' : 'drop-shadow-md'}`}>
                    {msg.type === 'CabReady' ? '🚕' : '🎁'}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-xl ${msg.read ? 'text-gray-400' : 'text-white'}`}>
                      {msg.type === 'CabReady' ? 'Your Cab is Here!' : 'Special Offer!'}
                      {msg.read && <span className="ml-3 text-xs font-normal italic bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">Read</span>}
                    </h3>
                    <p className={`mt-2 ${msg.read ? 'text-gray-500' : 'text-gray-200'}`}>
                      {msg.message}
                    </p>
                    <span className={`text-xs block mt-3 font-mono ${msg.read ? 'text-gray-600' : 'text-blue-300/70'}`}>
                      {msg.timestamp ? new Date(msg.timestamp._seconds * 1000).toLocaleString('en-GB') : 'Just now'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Inbox;