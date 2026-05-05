import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <-- Added useLocation
import axios from 'axios';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface Booking {
  id: string;
  email: string;
  pickupTime: string;
  cabType: string;
  passengers: number;
  pricePaid?: number;
  transactionId?: string;
  status?: string;
  origin?: { lat: string; lng: string; };
  destination?: { lat: string; lng: string; };
}

const Bookings = () => {
  const navigate = useNavigate();
  const location = useLocation(); // <-- This captures the hidden payload from the Dashboard
  const userEmail = localStorage.getItem('userEmail');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!userEmail) {
      navigate('/login');
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await axios.get(`http://localhost:4002/bookings/${userEmail}`);
        
        const sortedBookings = response.data.sort((a: Booking, b: Booking) => 
          new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime()
        );
        
        setBookings(sortedBookings);

        // --- NEW: AUTO-OPEN LOGIC ---
        // If we arrived here from the Dashboard redirect, find that specific booking and open it!
        if (location.state?.openBookingId) {
          const targetBooking = sortedBookings.find((b: Booking) => b.id === location.state.openBookingId);
          if (targetBooking) {
            setSelectedBooking(targetBooking);
            
            // Clean up the browser history so if they hit "Refresh", it doesn't get stuck on this page
            window.history.replaceState({}, document.title);
          }
        }

      } catch (err) {
        setError('Failed to load booking history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [userEmail, navigate, location.state]);

  const pageVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  const tableRowVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy p-4 md:p-8 relative overflow-hidden">
      
      {/* Ambient Glow */}
      <motion.div 
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/30 rounded-full mix-blend-screen filter blur-[128px] pointer-events-none"
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: THE BOOKINGS TABLE */}
          {!selectedBooking ? (
            <motion.div 
              key="table-view"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl flex justify-between items-center text-white">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Booking History</h2>
                  <p className="text-blue-200 mt-1">Review your past and upcoming premium rides.</p>
                </div>
                <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full font-mono text-sm">
                  Total Rides: {bookings.length}
                </span>
              </div>

              {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm">{error}</div>}

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                {isLoading ? (
                  <div className="text-center text-blue-200 py-20 animate-pulse text-lg font-medium">Loading your journey history...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center text-gray-400 py-20">
                    <div className="text-6xl mb-4 opacity-50">🚕</div>
                    <p className="text-xl">No bookings found. Time to plan a trip!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 text-blue-200 uppercase text-xs tracking-wider">
                          <th className="p-5 font-semibold">Date & Time</th>
                          <th className="p-5 font-semibold">Cab Class</th>
                          <th className="p-5 font-semibold">Status</th>
                          <th className="p-5 font-semibold">Price</th>
                          <th className="p-5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <motion.tbody 
                        initial="hidden" 
                        animate="show" 
                        transition={{ staggerChildren: 0.05 }}
                        className="text-white divide-y divide-white/10"
                      >
                        {bookings.map((booking) => {
                          const isUpcoming = new Date(booking.pickupTime) > new Date();

                          return (
                            <motion.tr 
                              key={booking.id} 
                              variants={tableRowVariants}
                              className="hover:bg-white/5 transition-colors group"
                            >
                              <td className="p-5 whitespace-nowrap">
                                <div className="font-bold flex items-center gap-3">
                                  {new Date(booking.pickupTime).toLocaleDateString('en-GB')}
                                  {isUpcoming ? (
                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Upcoming</span>
                                  ) : (
                                    <span className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Past</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{new Date(booking.pickupTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="p-5">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                  booking.cabType === 'Executive' ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' :
                                  booking.cabType === 'Premium' ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' :
                                  'bg-gray-500/20 border-gray-400/50 text-gray-200'
                                }`}>
                                  {booking.cabType}
                                </span>
                              </td>
                              <td className="p-5">
                                <span className="text-green-400 font-medium text-sm flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full bg-green-400 ${isUpcoming ? 'animate-pulse' : 'opacity-50'}`}></span>
                                  {booking.status || 'Confirmed'}
                                </span>
                              </td>
                              <td className="p-5 font-mono font-medium">
                                {booking.pricePaid ? `€${booking.pricePaid.toFixed(2)}` : 'TBD'}
                              </td>
                              <td className="p-5 text-right">
                                <button 
                                  onClick={() => setSelectedBooking(booking)}
                                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm shadow-sm"
                                >
                                  View Details ➔
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </motion.tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          ) : 

          /* VIEW 2: THE DETAILS PAGE */
          (
            <motion.div 
              key="details-view"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-6 max-w-3xl mx-auto"
            >
              <button 
                onClick={() => setSelectedBooking(null)}
                className="text-blue-300 hover:text-white flex items-center gap-2 font-medium transition-colors mb-2"
              >
                ← Back to History
              </button>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl text-white">
                <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">Journey Details</h2>
                    <p className="font-mono text-sm text-gray-400">Booking Ref: {selectedBooking.id}</p>
                    {selectedBooking.transactionId && (
                       <p className="font-mono text-xs text-gray-500 mt-1">Transaction: {selectedBooking.transactionId}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-green-400">
                      {selectedBooking.pricePaid ? `€${selectedBooking.pricePaid.toFixed(2)}` : 'Paid'}
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-200 border border-green-400/30 px-2 py-1 rounded mt-2 inline-block">
                      {selectedBooking.status || 'Confirmed'}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8 mb-8">
                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5 relative">
                    <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Schedule</h4>
                    
                    <div className="absolute top-5 right-5">
                      {new Date(selectedBooking.pickupTime) > new Date() ? (
                        <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-1 rounded uppercase tracking-wider font-bold">Upcoming</span>
                      ) : (
                        <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-1 rounded uppercase tracking-wider font-bold">Past</span>
                      )}
                    </div>

                    <p className="text-xl font-bold">{new Date(selectedBooking.pickupTime).toLocaleDateString('en-GB')}</p>
                    <p className="text-blue-300">{new Date(selectedBooking.pickupTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Service</h4>
                    <p className="text-xl font-bold">{selectedBooking.cabType} Class</p>
                    <p className="text-blue-300">{selectedBooking.passengers} Passenger(s)</p>
                  </div>
                </div>

                <div className="bg-blue-900/30 p-6 rounded-2xl border border-blue-400/20 relative overflow-hidden">
                  <h4 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-4">GPS Routing Data</h4>
                  <div className="space-y-4 font-mono text-sm text-gray-300">
                    <div className="flex justify-between items-center">
                      <span>Departure LAT/LNG:</span>
                      <span className="bg-black/40 px-3 py-1 rounded">
                        {selectedBooking.origin?.lat || 'N/A'}, {selectedBooking.origin?.lng || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Arrival LAT/LNG:</span>
                      <span className="bg-black/40 px-3 py-1 rounded">
                        {selectedBooking.destination?.lat || 'N/A'}, {selectedBooking.destination?.lng || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">🗺️</div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default Bookings;