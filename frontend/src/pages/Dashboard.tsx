import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Pre-defined coordinates for testing
const LOCATIONS = {
  'Berlin Kreuzberg': { lat: '52.50', lng: '13.43' },
  'Berlin Friedrichshagen': { lat: '52.47', lng: '13.63' },
  'Valletta, Malta': { lat: '35.8997', lng: '14.5148' },
  'Mdina, Malta': { lat: '35.8858', lng: '14.4031' }
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

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800">Book a Cab</h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Logged in as: <strong>{userEmail}</strong></span>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded font-medium hover:bg-red-100 transition-colours">
            Log Out
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Booking Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
          
          <form onSubmit={handleBooking} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Location</label>
              <select name="origin" className="mt-1 w-full p-2 border rounded" onChange={handleChange} value={formData.origin}>
                {Object.keys(LOCATIONS).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Drop-off Location</label>
              <select name="destination" className="mt-1 w-full p-2 border rounded" onChange={handleChange} value={formData.destination}>
                {Object.keys(LOCATIONS).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cab Type</label>
                <select name="cabType" className="mt-1 w-full p-2 border rounded" onChange={handleChange} value={formData.cabType}>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Passengers</label>
                <input type="number" name="passengers" min="1" max="8" className="mt-1 w-full p-2 border rounded" onChange={handleChange} value={formData.passengers} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pickup Time</label>
              <input type="datetime-local" name="pickupTime" required className="mt-1 w-full p-2 border rounded" onChange={handleChange} />
            </div>

            <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded border border-blue-100">
              <input type="checkbox" name="applyDiscount" id="discount" className="w-4 h-4" onChange={handleChange} />
              <label htmlFor="discount" className="text-sm font-medium text-blue-900">Apply 25% Loyalty Discount</label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-6 bg-blue-600 text-white p-3 rounded font-bold text-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colours"
            >
              {isLoading ? 'Calculating & Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </div>

        {/* Receipt Panel */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col justify-center">
          {receipt ? (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ✓
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-500 mb-6">Ref: {receipt.bookingId}</p>
              
              <div className="bg-white p-4 rounded border text-left space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Base Fare:</span>
                  <span>€{receipt.receipt.baseFare.toFixed(2)}</span>
                </div>
                {receipt.receipt.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount Applied:</span>
                    <span>-€{receipt.receipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-gray-800">
                  <span>Total Paid:</span>
                  <span>€{receipt.pricePaid.toFixed(2)}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-6">
                Your driver will be dispatched shortly. Keep an eye on your inbox!
              </p>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <p>Fill out the form to the left to calculate your fare and secure your cab.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;