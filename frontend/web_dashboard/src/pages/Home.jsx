import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Check,
  Power,
  Car,
  Activity,
  Navigation,
  Users,
} from "lucide-react";
import Header from "../Components/common/Header";
import StatCard from "../Components/common/StatCard";
import VehicleChart from "../Components/chartandgraph/VehicleChart";
import VehicleHistoryTable from "../Components/chartandgraph/vehicleHistory";
import VehicleMap from "../Components/maps/VehicleMap";
import StatusBarChart from "../Components/chartandgraph/StatusBarChart";
import Sidebar from "../Components/common/Sidebar";
import { initializeApp } from "firebase/app";
import { ref, onValue, off, set } from "firebase/database"; // Add 'set' import
import { getDatabase } from "firebase/database";

const Home = () => {
  const [showRoute, setShowRoute] = useState(true);
  const [isStatusView, setIsStatusView] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    drowsiness: { status_code: 0, timestamp: 0 },
    face_detection: { status: 0, timestamp: 0 },
    master_switch: { value: false, timestamp: 0 },
    state: { status: "unknown", timestamp: 0 },
  });
  const [vehicleId, setVehicleId] = useState("");
  const [range, setRange] = useState("8h");
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  useEffect(() => {
    const savedVehicles = JSON.parse(localStorage.getItem("vehicles") || "[]");
    const defaultVehicleId =
      localStorage.getItem("defaultVehicleId") ||
      (savedVehicles.length > 0 ? savedVehicles[0] : "SUPRAX125");

    setAvailableVehicles(savedVehicles);
    setVehicleId(defaultVehicleId);
  }, []);

  useEffect(() => {
    const vehicleRef = ref(database, `vehicle/${vehicleId}`);

    onValue(vehicleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVehicleData({
          drowsiness: data.detection?.drowsiness || {
            status_code: 0,
            timestamp: 0,
          },
          face_detection: data.detection?.face_detection || {
            status: 0,
            timestamp: 0,
          },
          master_switch: data.master_switch || { value: false, timestamp: 0 },
          state: data.state || { status: "unknown", timestamp: 0 },
        });

        console.log("Firebase data received:", data);
      }
    });

    const interval = setInterval(() => {
      setIsStatusView((prev) => !prev);
    }, 5000);

    return () => {
      clearInterval(interval);
      off(vehicleRef);
    };
  }, [vehicleId]);
  const toggleMasterSwitch = () => {
    const currentValue = vehicleData.master_switch.value;
    const newValue = !currentValue;

    setVehicleData((prev) => ({
      ...prev,
      master_switch: {
        value: newValue,
        timestamp: Date.now() / 1000,
      },
    }));

    const masterSwitchRef = ref(database, `vehicle/${vehicleId}/master_switch`);
    set(masterSwitchRef, {
      value: newValue,
      timestamp: Date.now() / 1000,
    })
      .then(() => console.log(`Master switch updated to: ${newValue}`))
      .catch((error) => console.error("Error updating master switch:", error));
  };

  const getStatusInfo = (statusCode) => {
    switch (statusCode) {
      case 0:
        return { text: "Normal", color: "#10B981" };
      case 1:
        return { text: "Yawning", color: "#F59E0B" };
      case 2:
        return { text: "Sleepy", color: "#EF4444" };
      default:
        return { text: "Unknown", color: "#6B7280" };
    }
  };

  const statCards = [
    {
      key: "drowsiness",
      name: "Drowsiness",
      icon: AlertCircle,
      value: getStatusInfo(vehicleData.drowsiness.status_code).text,
      color: getStatusInfo(vehicleData.drowsiness.status_code).color,
    },
    {
      key: "face_detection",
      name: "Face Detection",
      icon: Check,
      value:
        vehicleData.face_detection.status === 1 ? "Detected" : "Not Detected",
      color: vehicleData.face_detection.status === 1 ? "#10B981" : "#EF4444",
    },
    {
      key: "master_switch",
      name: "Master Switch",
      icon: Power,
      onClick: toggleMasterSwitch,
      isToggleable: true,
      value: vehicleData.master_switch.value ? "ON" : "OFF",
      color: vehicleData.master_switch.value ? "#10B981" : "#6B7280",
    },
    {
      key: "vehicle_state",
      name: "Vehicle State",
      icon: Car,
      value:
        vehicleData.state.status.charAt(0).toUpperCase() +
        vehicleData.state.status.slice(1),
      color: "#6366F1",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* BG */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
        <div className="" />
      </div>
      <Sidebar />
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Vehicle Monitoring" />

        <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
          {/* STATS */}
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <AnimatePresence mode="wait">
              {statCards.map((card) => (
                <>
                  <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                    className={
                      card.key === "master_switch" ? "cursor-pointer" : ""
                    }
                    onClick={
                      card.key === "master_switch"
                        ? toggleMasterSwitch
                        : undefined
                    }
                  >
                    <StatCard
                      name={card.name}
                      icon={card.icon}
                      value={card.value}
                      color={card.color}
                      isToggleable={card.key === "master_switch"}
                    />
                  </motion.div>
                </>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-100">
                  Vehicle ID:
                </h2>
                {availableVehicles.length > 0 ? (
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableVehicles.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center">
                    <span className="text-xl">{vehicleId}</span>
                    <span className="ml-3 text-amber-400 text-sm">
                      (No vehicles configured. Visit Settings to add vehicles.)
                    </span>
                  </div>
                )}
              </div>

              <select
                className="bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="-1h">Last 1 hour</option>
                <option value="-3h">Last 3 hours</option>
                <option value="-5h">Last 5 hours</option>
                <option value="-8h">Last 8 hours</option>
                <option value="-12h">Last 12 hours</option>
                <option value="-1d">Last 1 day</option>
                <option value="-7d">Last 7 days</option>
              </select>
            </div>

            {/* Vehicle Map */}
            <motion.div
              className="mt-4 bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-4 mb-8 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-100">
                  Vehicle Location
                </h3>
                <div className="flex items-center">
                  <label className="inline-flex items-center cursor-pointer">
                    <span className="mr-2 text-sm text-gray-300">
                      Show Route
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={showRoute}
                        onChange={() => setShowRoute(!showRoute)}
                      />
                      <div
                        className={`block w-10 h-6 rounded-full ${
                          showRoute ? "bg-blue-600" : "bg-gray-600"
                        }`}
                      ></div>
                      <div
                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                          showRoute ? "transform translate-x-4" : ""
                        }`}
                      ></div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="h-[400px] w-full rounded-lg overflow-hidden">
                <VehicleMap
                  vehicleId={vehicleId}
                  range={range}
                  showRoute={showRoute}
                />
              </div>
            </motion.div>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <VehicleChart
              title="Acceleration"
              dataType="acceleration"
              vehicleId={vehicleId}
              range={range}
              icon={Activity}
              colors={["#3B82F6", "#10B981", "#F59E0B"]}
            />
            <VehicleChart
              title="Gyroscope"
              dataType="gyroscope"
              vehicleId={vehicleId}
              range={range}
              icon={Navigation}
              colors={["#6366F1", "#EF4444", "#8B5CF6"]}
            />
          </div>
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <StatusBarChart
                title="Drowsiness Detection"
                dataType="drowsiness"
                vehicleId={vehicleId}
                range={range}
                icon={AlertCircle}
                colors={["#10B981", "#F59E0B", "#EF4444"]}
              />
              <StatusBarChart
                title="Face Recognition"
                dataType="face_detection"
                vehicleId={vehicleId}
                range={range}
                icon={Users}
                colors={["#6B7280", "#10B981", "#EF4444"]}
              />
            </div>
          </div>
          <div className="mt-8">
            <VehicleHistoryTable vehicleId={vehicleId} range={range} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
