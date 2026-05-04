import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Inbox</h2>
        <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
          {messages.length} Messages
        </span>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading your messages...</div>
      ) : messages.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500">
          Your inbox is currently empty. Book a cab to get started!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-5 rounded-lg border-l-4 shadow-sm flex items-start gap-4 animate-fade-in transition-all duration-500
                ${msg.read ? 'bg-gray-100 border-l-gray-400 opacity-75' : 'bg-white shadow-md'}
                ${!msg.read && msg.type === 'CabReady' ? 'border-l-green-500' : ''}
                ${!msg.read && msg.type === 'DiscountAvailable' ? 'border-l-purple-500' : ''}
              `}
            >
              {/* 4. Greying out the Emoji and Text */}
              <div className={`text-3xl mt-1 ${msg.read ? 'grayscale opacity-50' : ''}`}>
                {msg.type === 'CabReady' ? '🚕' : '🎁'}
              </div>
              <div className={msg.read ? 'text-gray-500' : 'text-gray-900'}>
                <h3 className={`font-bold text-lg ${msg.read ? 'text-gray-500' : 'text-gray-900'}`}>
                  {msg.type === 'CabReady' ? 'Your Cab is Here!' : 'Special Offer!'}
                  {msg.read && <span className="ml-2 text-xs font-normal italic">(Read)</span>}
                </h3>
                <p className="mt-1">{msg.message}</p>
                <span className="text-xs text-gray-400 block mt-2">
                  {msg.timestamp ? new Date(msg.timestamp._seconds * 1000).toLocaleString('en-GB') : 'Just now'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inbox;