import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Check, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../Components/common/Header";
import Sidebar from "../Components/common/Sidebar";

const Settings = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [newVehicleId, setNewVehicleId] = useState("");
  const [defaultVehicleId, setDefaultVehicleId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const savedVehicles = JSON.parse(localStorage.getItem("vehicles") || "[]");
    const savedDefault =
      localStorage.getItem("defaultVehicleId") ||
      (savedVehicles.length > 0 ? savedVehicles[0] : "");

    setVehicles(savedVehicles);
    setDefaultVehicleId(savedDefault);
  }, []);

  const saveChanges = (updatedVehicles, updatedDefault) => {
    localStorage.setItem("vehicles", JSON.stringify(updatedVehicles));
    localStorage.setItem("defaultVehicleId", updatedDefault);
  };

  const handleAddVehicle = (e) => {
    e.preventDefault();

    if (!newVehicleId.trim()) {
      setError("Vehicle ID cannot be empty");
      return;
    }

    if (vehicles.includes(newVehicleId)) {
      setError("This vehicle ID already exists");
      return;
    }

    const updatedVehicles = [...vehicles, newVehicleId];
    setVehicles(updatedVehicles);

    const updatedDefault = !defaultVehicleId ? newVehicleId : defaultVehicleId;
    setDefaultVehicleId(updatedDefault);

    saveChanges(updatedVehicles, updatedDefault);
    setNewVehicleId("");
    setError("");
    setSuccess("Vehicle added successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleRemoveVehicle = (vehicleId) => {
    const updatedVehicles = vehicles.filter((id) => id !== vehicleId);
    setVehicles(updatedVehicles);

    let updatedDefault = defaultVehicleId;
    if (vehicleId === defaultVehicleId) {
      updatedDefault = updatedVehicles.length > 0 ? updatedVehicles[0] : "";
      setDefaultVehicleId(updatedDefault);
    }

    saveChanges(updatedVehicles, updatedDefault);
    setSuccess("Vehicle removed successfully");
    setTimeout(() => setSuccess(""), 3000);
  };
  const handleSetDefault = (vehicleId) => {
    setDefaultVehicleId(vehicleId);
    saveChanges(vehicles, vehicleId);
    setSuccess("Default vehicle updated");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <Sidebar />
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Settings" />

        <main className="max-w-4xl mx-auto py-6 px-4 lg:px-8">
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 mb-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold mb-6">Vehicle Management</h2>

            {/* Add new vehicle form */}
            <form onSubmit={handleAddVehicle} className="mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    placeholder="Enter Vehicle ID"
                    className="w-full bg-gray-700 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                >
                  <Plus size={18} className="mr-2" />
                  Add Vehicle
                </button>
              </div>

              {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
            </form>

            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 text-green-400 rounded-md flex items-center">
                <Check size={16} className="mr-2" />
                {success}
              </div>
            )}

            {/* Vehicle list */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-2">Your Vehicles</h3>

              {vehicles.length === 0 ? (
                <p className="text-gray-400 italic">
                  No vehicles added yet. Add your first vehicle ID above.
                </p>
              ) : (
                <ul className="divide-y divide-gray-700">
                  {vehicles.map((vehicleId) => (
                    <li
                      key={vehicleId}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <span className="text-lg">{vehicleId}</span>
                        {vehicleId === defaultVehicleId && (
                          <span className="ml-3 px-2 py-0.5 text-xs bg-blue-500 bg-opacity-20 text-blue-400 rounded-full">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {vehicleId !== defaultVehicleId && (
                          <button
                            onClick={() => handleSetDefault(vehicleId)}
                            className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded transition-colors text-sm"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveVehicle(vehicleId)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>

          {/* Logout section */}
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold mb-6">Account</h2>

            {showLogoutConfirm ? (
              <div className="p-4 border border-red-500 bg-red-500 bg-opacity-10 rounded-lg">
                <p className="text-center mb-4">
                  Are you sure you want to log out?
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Yes, Log Out
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                <LogOut size={18} className="mr-2" />
                Log Out
              </button>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
