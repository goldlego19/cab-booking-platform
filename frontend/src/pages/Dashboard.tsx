import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const LOCATIONS = {
  'Valletta (Capital)': { lat: '35.8989', lng: '14.5146' },
  'Luqa (Malta International Airport)': { lat: '35.8575', lng: '14.4775' },
  'St. Julian\'s': { lat: '35.9184', lng: '14.4881' },
  'Sliema': { lat: '35.9122', lng: '14.5042' },
  'Mdina': { lat: '35.8858', lng: '14.4031' },
  'Żebbuġ': { lat: '35.8719', lng: '14.4411' },
  'Birkirkara': { lat: '35.8972', lng: '14.4611' },
  'Mosta': { lat: '35.9097', lng: '14.4256' },
  'Mellieħa': { lat: '35.9564', lng: '14.3622' },
  'Rabat': { lat: '35.8815', lng: '14.3987' }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    origin: 'Berlin Kreuzberg',
    destination: 'Berlin Friedrichshagen',
    cabType: 'Standard',
    passengers: 1,
    pickupTime: '',
    applyDiscount: false
  });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');

  // Check auth on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (!token || !email) {
      navigate('/login');
    } else {
      setUserEmail(email);
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setReceipt(null);

    // Construct the exact payload the Booking MS expects
    const bookingPayload = {
      userId: userEmail, // Using email as a simple ID for now
      email: userEmail,
      dep_lat: LOCATIONS[formData.origin as keyof typeof LOCATIONS].lat,
      dep_lng: LOCATIONS[formData.origin as keyof typeof LOCATIONS].lng,
      arr_lat: LOCATIONS[formData.destination as keyof typeof LOCATIONS].lat,
      arr_lng: LOCATIONS[formData.destination as keyof typeof LOCATIONS].lng,
      cabType: formData.cabType,
      passengers: Number(formData.passengers),
      pickupTime: new Date(formData.pickupTime).toISOString(),
      applyDiscount: formData.applyDiscount
    };

    try {
      // Send the request to the Booking Microservice
      const response = await axios.post('http://localhost:4002/bookings', bookingPayload);
      setReceipt(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process booking.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const inputClass = "mt-1 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all [&>option]:bg-gray-900";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy p-4 md:p-8">
      
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Panel */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl flex justify-between items-center text-white"
        >
          <h2 className="text-3xl font-bold tracking-tight">Book a Premium Ride</h2>
          <span className="text-gray-300 text-sm md:text-base bg-white/5 px-4 py-2 rounded-full border border-white/10">
            Account: <strong className="text-white">{userEmail}</strong>
          </span>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Booking Form (Slides in from left) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-xl text-white"
          >
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm">{error}</div>}
            
            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300">Pickup Location</label>
                <select name="origin" className={inputClass} onChange={handleChange} value={formData.origin}>
                  {Object.keys(LOCATIONS).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Drop-off Location</label>
                <select name="destination" className={inputClass} onChange={handleChange} value={formData.destination}>
                  {Object.keys(LOCATIONS).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Cab Type</label>
                  <select name="cabType" className={inputClass} onChange={handleChange} value={formData.cabType}>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Passengers</label>
                  <input type="number" name="passengers" min="1" max="8" className={inputClass} onChange={handleChange} value={formData.passengers} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Pickup Time</label>
                <input type="datetime-local" name="pickupTime" required className={`${inputClass} [color-scheme:dark]`} onChange={handleChange} />
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-400/30">
                <input type="checkbox" name="applyDiscount" id="discount" className="w-5 h-5 rounded accent-blue-500" onChange={handleChange} />
                <label htmlFor="discount" className="text-sm font-bold text-blue-200">Apply 25% Loyalty Discount</label>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50 disabled:bg-blue-800 transition-colors"
              >
                {isLoading ? 'Calculating & Booking...' : 'Confirm Booking'}
              </motion.button>
            </form>
          </motion.div>

          {/* Receipt Panel (Slides in from right) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col justify-center relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {receipt ? (
                <motion.div 
                  key="receipt"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center relative z-10"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 bg-green-500/20 border border-green-400/50 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                  >
                    ✓
                  </motion.div>
                  <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Booking Confirmed!</h3>
                  <p className="text-gray-400 mb-8 font-mono text-sm">Ref: {receipt.bookingId}</p>
                  
                  <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10 text-left space-y-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Base Fare:</span>
                      <span>€{receipt.receipt.baseFare.toFixed(2)}</span>
                    </div>
                    {receipt.receipt.discount > 0 && (
                      <div className="flex justify-between text-green-400 font-medium">
                        <span>Discount Applied:</span>
                        <span>-€{receipt.receipt.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-3 mt-3 flex justify-between font-bold text-xl text-white">
                      <span>Total Paid:</span>
                      <span>€{receipt.pricePaid.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-blue-300 mt-8 font-medium">
                    Your driver will be dispatched shortly. Keep an eye on your inbox!
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-gray-400 relative z-10"
                >
                  <div className="text-6xl mb-6 opacity-20">🗺️</div>
                  <p className="text-lg">Fill out the form to the left to calculate your fare and secure your ride.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;