import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence, type Variants } from "framer-motion";

interface SavedLocation {
  id: string;
  address: string;
  latitude: string;
  longitude: string;
}

interface WeatherData {
  [address: string]: {
    temperature_c?: number;
    condition?: string;
    icon?: string;
    error?: string;
  };
}

const Locations = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");

  // State
  const [availableCities, setAvailableCities] = useState<Record<string, { lat: string, lng: string }>>({});
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [weather, setWeather] = useState<WeatherData>({});
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the official list of Maltese cities from your backend
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get('https://gateway-api-88100526402.europe-west1.run.app/cities');
        setAvailableCities(response.data);
        
        // Set the first city as the default dropdown option
        const cityNames = Object.keys(response.data);
        if (cityNames.length > 0) {
          setSelectedAddress(cityNames[0]);
        }
      } catch (error) {
        console.error("Failed to fetch Maltese cities", error);
      }
    };
    
    fetchCities();
  }, []);

  // 2. Fetch from Firestore & then fetch Weather
  const fetchLocationsAndWeather = useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    try {
      // Hit your GET /locations/:email endpoint
      const locRes = await axios.get(`https://gateway-api-88100526402.europe-west1.run.app/locations/${userEmail}`);
      const locations: SavedLocation[] = locRes.data;
      setSavedLocations(locations);

      // Hit your GET /weather endpoint for each saved location
      const newWeather: WeatherData = {};
      for (const loc of locations) {
        try {
          // Send the exact GPS coordinates instead of the Maltese text
          const weatherRes = await axios.get(`https://gateway-api-88100526402.europe-west1.run.app/weather`, {
            params: { q: `${loc.latitude},${loc.longitude}` },
          });
          newWeather[loc.address] = {
            temperature_c: weatherRes.data.temperature_c,
            condition: weatherRes.data.condition,
            icon: weatherRes.data.icon,
          };
        } catch (err) {
          newWeather[loc.address] = { error: "Weather unavailable" };
        }
      }
      setWeather(newWeather);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  // Load user data on mount
  useEffect(() => {
    if (!userEmail) navigate("/login");
    else fetchLocationsAndWeather();
  }, [userEmail, navigate, fetchLocationsAndWeather]);

  // 3. Add Location to Firestore
  const addFavourite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !selectedAddress) return;

    // Prevent adding if it already exists in the list
    if (savedLocations.some((loc) => loc.address === selectedAddress)) return;

    const coords = availableCities[selectedAddress];

    try {
      // Hit your POST /locations endpoint
      await axios.post("https://gateway-api-88100526402.europe-west1.run.app/locations", {
        email: userEmail,
        address: selectedAddress,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      // Re-fetch to get the new Firestore ID and Weather
      fetchLocationsAndWeather();
    } catch (error) {
      console.error("Failed to save location", error);
    }
  };

  // 4. Delete Location from Firestore
  const removeFavourite = async (id: string) => {
    try {
      // Hit your DELETE /locations/:id endpoint
      await axios.delete(`https://gateway-api-88100526402.europe-west1.run.app/locations/${id}`);
      // Instantly update UI without waiting for a re-fetch
      setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
    } catch (error) {
      console.error("Failed to delete location", error);
    }
  };

  // Framer Motion Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 },
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  };

  const getIconUrl = (url?: string) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `https:${url}`;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 right-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] pointer-events-none"
      />

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        {/* Header & Add Form */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-white"
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Favourite Locations
            </h2>
            <p className="text-blue-200 mt-1">
              Check the live weather before you book your ride.
            </p>
          </div>

          <form onSubmit={addFavourite} className="flex gap-3 w-full md:w-auto">
            <select 
              className="flex-1 md:w-72 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400 [&>option]:bg-gray-900"
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
            >
              {Object.keys(availableCities).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              Add +
            </motion.button>
          </form>
        </motion.div>

        {/* Weather Cards Grid */}
        {isLoading && savedLocations.length === 0 ? (
          <div className="text-center text-blue-200 py-20 animate-pulse text-xl font-medium">
            Fetching your saved locations...
          </div>
        ) : savedLocations.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md border border-dashed border-white/20 rounded-3xl p-16 text-center text-gray-400 shadow-xl">
            <div className="text-6xl mb-4 opacity-50">🇲🇹</div>
            <p className="text-xl">
              You haven't saved any locations yet. Add a city above!
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {savedLocations.map((loc) => (
                <motion.div
                  key={loc.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-xl flex flex-col justify-between group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {loc.address.split(" (")[0]}
                    </h3>
                    <button
                      onClick={() => removeFavourite(loc.id)}
                      className="text-white/40 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-gray-900/40 rounded-2xl p-5 border border-white/5 mt-auto min-h-[120px] flex items-center">
                    {weather[loc.address]?.error ? (
                      <p className="text-red-300/80 text-sm italic w-full text-center">
                        {weather[loc.address].error}
                      </p>
                    ) : weather[loc.address] ? (
                      <div className="flex items-center gap-4 w-full">
                        {weather[loc.address].icon && (
                          <img
                            src={getIconUrl(weather[loc.address].icon)}
                            alt={weather[loc.address].condition}
                            className="w-16 h-16 object-contain drop-shadow-md"
                          />
                        )}
                        <div>
                          <div className="text-3xl font-black text-white">
                            {weather[loc.address].temperature_c !== undefined
                              ? `${Math.round(weather[loc.address].temperature_c as number)}°C`
                              : "--°C"}
                          </div>
                          <div className="text-blue-200 text-sm font-medium capitalize">
                            {weather[loc.address].condition ||
                              "Unknown condition"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm animate-pulse w-full text-center">
                        Loading weather...
                      </p>
                    )}
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

export default Locations;