import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  
  // Dynamic Cities & Loyalty State
  const [availableCities, setAvailableCities] = useState<Record<string, { lat: string, lng: string }>>({});
  const [isDiscountEligible, setIsDiscountEligible] = useState(false);
  const [ridesRemaining, setRidesRemaining] = useState(3); // <--- NEW: Track remaining rides
  
  // Form State
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    cabType: 'Standard',
    passengers: 1,
    pickupTime: '',
    applyDiscount: false 
  });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });

  // Initialise Auth, Cities, and Loyalty Status
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    
    if (!token || !email) {
      navigate('/login');
      return;
    } 
    
    setUserEmail(email);

    const loadDashboardData = async () => {
      try {
        // 1. Fetch Dynamic Cities
        const citiesRes = await axios.get('http://localhost:4004/cities');
        setAvailableCities(citiesRes.data);
        
        const cityNames = Object.keys(citiesRes.data);
        let defaultOrigin = '';
        let defaultDest = '';

        if (cityNames.length >= 2) {
          defaultOrigin = cityNames[0];
          defaultDest = cityNames[1];
        }

        // 2. Automatically Check Loyalty Status from Booking MS
        const bookingsRes = await axios.get(`http://localhost:4002/bookings/${email}`);
        const pastBookingsCount = bookingsRes.data.length;
        
        // Check if eligible
        let hasDiscount = false;
        if (pastBookingsCount > 0 && pastBookingsCount % 3 === 0) {
          hasDiscount = true;
          setIsDiscountEligible(true);
        } else {
          // NEW: Calculate exactly how many rides are left!
          setRidesRemaining(3 - (pastBookingsCount % 3));
        }

        // Set the form data once everything is loaded
        setFormData(prev => ({
          ...prev,
          origin: defaultOrigin,
          destination: defaultDest,
          applyDiscount: hasDiscount 
        }));

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };

    loadDashboardData();
  }, [navigate]);

  useEffect(() => {
    if (receipt && receipt.bookingId) {
      const timer = setTimeout(() => {
        navigate('/bookings', { state: { openBookingId: receipt.bookingId } });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [receipt, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setReceipt(null);
    setEstimate(null);
  };

  // --- CARD FORMATTING LOGIC ---
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'number') {
      const digits = value.replace(/\D/g, '');
      const formatted = digits.replace(/(\d{4})/g, '$1 ').trim();
      setCardDetails(prev => ({ ...prev, [name]: formatted }));
    } 
    else if (name === 'expiry') {
      const digits = value.replace(/\D/g, '');
      let formatted = digits;
      if (digits.length > 2) {
        formatted = `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
      }
      setCardDetails(prev => ({ ...prev, [name]: formatted }));
    } 
    else if (name === 'cvc') {
      const digits = value.replace(/\D/g, '');
      setCardDetails(prev => ({ ...prev, [name]: digits }));
    } 
    else {
      setCardDetails(prev => ({ ...prev, [name]: value.toUpperCase() }));
    }
  };

  // Step 1: Calculate Live Preview Maths on the Frontend
  const handleCalculateFare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const depCoords = availableCities[formData.origin];
      const arrCoords = availableCities[formData.destination];

      const fareRes = await axios.get('http://localhost:4005/estimate', {
        params: {
          dep_lat: depCoords.lat,
          dep_lng: depCoords.lng,
          arr_lat: arrCoords.lat,
          arr_lng: arrCoords.lng
        }
      });

      const base = fareRes.data.priceInEuros;

      const cabM = formData.cabType === 'Premium' ? 1.2 : formData.cabType === 'Executive' ? 1.4 : 1;
      const timeM = new Date(formData.pickupTime).getHours() < 8 ? 1.2 : 1;
      const passM = formData.passengers > 4 ? 2 : 1;
      
      const subtotal = base * cabM * timeM * passM;
      const discountAmount = formData.applyDiscount ? subtotal * 0.25 : 0;
      
      setEstimate({
        subtotal,
        discountAmount,
        total: subtotal - discountAmount
      });
      
    } catch (err) {
      setError('Failed to calculate live fare estimate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Process Actual Payment & Booking
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPaymentModal(false);
    setIsLoading(true);
    setError('');
    setReceipt(null);

    const bookingPayload = {
      userId: userEmail,
      email: userEmail,
      originName: formData.origin,
      destinationName: formData.destination,
      dep_lat: availableCities[formData.origin].lat,
      dep_lng: availableCities[formData.origin].lng,
      arr_lat: availableCities[formData.destination].lat,
      arr_lng: availableCities[formData.destination].lng,
      cabType: formData.cabType,
      passengers: Number(formData.passengers),
      pickupTime: new Date(formData.pickupTime).toISOString(),
      applyDiscount: formData.applyDiscount, 
      cardNumber: cardDetails.number
    };

    try {
      const response = await axios.post('http://localhost:4002/bookings', bookingPayload);
      setReceipt(response.data);
      setEstimate(null);
      setCardDetails({ number: '', expiry: '', cvc: '', name: '' });
      
      setIsDiscountEligible(false);
      setFormData(prev => ({ ...prev, applyDiscount: false }));
      setRidesRemaining(3); // Reset the tracker for the next cycle

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process booking.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "mt-1 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors [&>option]:bg-gray-900";

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy p-4 md:p-8 relative overflow-hidden">
      
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
          
          {/* LEFT PANEL: BOOKING FORM */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-xl text-white flex flex-col justify-between"
          >
            <div>
              {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm">{error}</div>}
              
              <form id="bookingForm" onSubmit={handleCalculateFare} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Pickup Location</label>
                  <select name="origin" className={inputClass} onChange={handleChange} value={formData.origin}>
                    {Object.keys(availableCities).map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Drop-off Location</label>
                  <select name="destination" className={inputClass} onChange={handleChange} value={formData.destination}>
                    {Object.keys(availableCities).map(city => <option key={city} value={city}>{city}</option>)}
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
              </form>
            </div>

            <div className="mt-6">
              {/* DYNAMIC LOYALTY BANNER */}
              {isDiscountEligible ? (
                <div className="mb-4 p-4 bg-purple-500/20 rounded-xl border border-purple-400/50 flex items-center gap-3 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <div className="font-bold text-purple-200">Loyalty Discount Unlocked!</div>
                    <div className="text-xs text-purple-300">25% off will be automatically applied to this ride.</div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 text-center text-sm text-gray-400">
                  {/* NEW: DYNAMIC COUNTDOWN TEXT */}
                  {ridesRemaining} ride{ridesRemaining === 1 ? '' : 's'} remaining for 25% Discount
                </div>
              )}

              <motion.button 
                form="bookingForm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isLoading || Object.keys(availableCities).length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50 disabled:bg-blue-800 transition-colors"
              >
                Calculate Fare
              </motion.button>
            </div>
          </motion.div>

          {/* RIGHT PANEL: DYNAMIC MATHS / RECEIPT */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl flex flex-col justify-center relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {receipt ? (
                <motion.div key="receipt" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center relative z-10">
                  <div className="w-20 h-20 bg-green-500/20 border border-green-400/50 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_20px_rgba(74,222,128,0.2)]">✓</div>
                  <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Booking Confirmed!</h3>
                  <p className="text-gray-400 mb-8 font-mono text-sm">Ref: {receipt.bookingId}</p>
                  
                  <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10 text-left space-y-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Base Fare:</span>
                      <span>€{receipt.receipt.baseFare.toFixed(2)}</span>
                    </div>
                    {receipt.receipt.discount > 0 && (
                      <div className="flex justify-between text-purple-400 font-medium">
                        <span>Discount Applied:</span>
                        <span>-€{receipt.receipt.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-3 mt-3 flex justify-between font-bold text-xl text-white">
                      <span>Total Paid:</span>
                      <span>€{receipt.pricePaid.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              ) : 
              
              estimate ? (
                <motion.div key="estimate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="relative z-10">
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-extrabold text-white mb-2">Trip Estimate</h3>
                    <p className="text-blue-200">Review your fare before proceeding.</p>
                  </div>

                  <div className="bg-black/30 p-6 rounded-xl border border-white/10 text-left space-y-3 mb-8">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal:</span>
                      <span>€{estimate.subtotal.toFixed(2)}</span>
                    </div>
                    {estimate.discountAmount > 0 && (
                      <div className="flex justify-between text-purple-400 font-medium">
                        <span>Loyalty Discount (25%):</span>
                        <span>-€{estimate.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-4 mt-4 flex justify-between font-bold text-2xl text-white">
                      <span>Estimated Total:</span>
                      <span>€{estimate.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(22,163,74,0.4)] border border-green-500/50 transition-colors flex items-center justify-center gap-2"
                  >
                    💳 Pay with Card
                  </motion.button>
                </motion.div>
              ) : 
              
              (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-gray-400 relative z-10">
                  <div className="text-6xl mb-6 opacity-20">🗺️</div>
                  <p className="text-lg">Fill out the form to calculate your fare and secure your ride.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECURE DEBIT CARD MODAL                    */}
      {/* ========================================== */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPaymentModal(false)}
            />
            
            <motion.div 
              variants={modalVariants}
              initial="hidden" animate="show" exit="exit"
              className="bg-gray-900 border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 text-white"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold tracking-tight">Secure Checkout</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={cardDetails.name}
                    onChange={handleCardChange}
                    required 
                    placeholder="J. DOE" 
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-green-400 transition-colors" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Card Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="number"
                      value={cardDetails.number}
                      onChange={handleCardChange}
                      required 
                      maxLength={19} 
                      placeholder="0000 0000 0000 0000" 
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 pl-10 text-white focus:outline-none focus:border-green-400 transition-colors font-mono tracking-widest" 
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400">💳</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Expiry Date</label>
                    <input 
                      type="text" 
                      name="expiry"
                      value={cardDetails.expiry}
                      onChange={handleCardChange}
                      required 
                      placeholder="MM/YY" 
                      maxLength={5} 
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-green-400 transition-colors font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">CVC</label>
                    <input 
                      type="text" 
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleCardChange}
                      required 
                      placeholder="123" 
                      maxLength={4} 
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-green-400 transition-colors font-mono" 
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={isLoading}
                  className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white p-4 rounded-xl font-bold shadow-lg transition-colors flex justify-between items-center"
                >
                  <span>{isLoading ? 'Processing...' : 'Pay Now'}</span>
                  <span>€{estimate?.total.toFixed(2)}</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Dashboard;