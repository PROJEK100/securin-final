import React, { useState, useEffect } from "react";
import ReactPaginate from "react-paginate";
import { motion } from "framer-motion";
import { Search, Calendar, Clock } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { showData } from "../../utils/parseInfluxVehicle";

const VehicleHistoryTable = ({ vehicleId, range = "-24h" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [timeInterval, setTimeInterval] = useState("-10m");
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    const fetchHistoryData = async () => {
      setLoading(true);
      try {
        let queryRange = range;
        if (startDate && endDate) {
          const start = startDate.toISOString();
          const end = endDate.toISOString();
          queryRange = `${start}|${end}`;
        }

        const drowsinessData = await showData(
          vehicleId,
          "drowsiness",
          queryRange,
          timeInterval
        );
        const faceData = await showData(
          vehicleId,
          "face_detection",
          queryRange,
          timeInterval
        );
        const stateData = await showData(
          vehicleId,
          "vehicle_state",
          queryRange,
          timeInterval
        );

        const locationData = await showData(
          vehicleId,
          "location",
          queryRange,
          timeInterval
        );
        const accelerationData = await showData(
          vehicleId,
          "acceleration",
          queryRange,
          timeInterval
        );
        const gyroscopeData = await showData(
          vehicleId,
          "gyroscope",
          queryRange,
          timeInterval
        );

        const combined = processAndCombineData(
          drowsinessData,
          faceData,
          stateData,
          locationData,
          accelerationData,
          gyroscopeData
        );

        setHistoryData(combined);
        filterData(searchTerm, combined);
      } catch (error) {
        console.error("Error fetching vehicle history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [vehicleId, range, timeInterval, startDate, endDate]);

  const processAndCombineData = (
    drowsinessData,
    faceData,
    stateData,
    locationData,
    accelerationData,
    gyroscopeData
  ) => {
    const timeMap = new Map();

    if (drowsinessData && drowsinessData.length > 0) {
      drowsinessData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: formatDrowsinessStatus(item[3]),
            face_detection: "N/A",
            vehicle_state: "N/A",
            location: { lat: "N/A", lng: "N/A" },
            acceleration: { x: "N/A", y: "N/A", z: "N/A" },
            gyroscope: { x: "N/A", y: "N/A", z: "N/A" },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.drowsiness = formatDrowsinessStatus(item[3]);
        }
      });
    }

    // Process face detection data
    if (faceData && faceData.length > 0) {
      faceData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: "N/A",
            face_detection: formatFaceStatus(item[3]),
            vehicle_state: "N/A",
            location: { lat: "N/A", lng: "N/A" },
            acceleration: { x: "N/A", y: "N/A", z: "N/A" },
            gyroscope: { x: "N/A", y: "N/A", z: "N/A" },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.face_detection = formatFaceStatus(item[3]);
        }
      });
    }

    // Process vehicle state data
    if (stateData && stateData.length > 0) {
      stateData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: "N/A",
            face_detection: "N/A",
            vehicle_state: item[3] || "N/A",
            location: { lat: "N/A", lng: "N/A" },
            acceleration: { x: "N/A", y: "N/A", z: "N/A" },
            gyroscope: { x: "N/A", y: "N/A", z: "N/A" },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.vehicle_state = item[3] || "N/A";
        }
      });
    }

    if (locationData && locationData.length > 0) {
      locationData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: "N/A",
            face_detection: "N/A",
            vehicle_state: "N/A",
            location: {
              lat: parseFloat(item[3]).toFixed(6) || "N/A",
              lng: parseFloat(item[4]).toFixed(6) || "N/A",
            },
            acceleration: { x: "N/A", y: "N/A", z: "N/A" },
            gyroscope: { x: "N/A", y: "N/A", z: "N/A" },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.location = {
            lat: parseFloat(item[3]).toFixed(6) || "N/A",
            lng: parseFloat(item[4]).toFixed(6) || "N/A",
          };
        }
      });
    }

    if (accelerationData && accelerationData.length > 0) {
      accelerationData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: "N/A",
            face_detection: "N/A",
            vehicle_state: "N/A",
            location: { lat: "N/A", lng: "N/A" },
            acceleration: {
              x: parseFloat(item[3]).toFixed(3) || "N/A",
              y: parseFloat(item[4]).toFixed(3) || "N/A",
              z: parseFloat(item[5]).toFixed(3) || "N/A",
            },
            gyroscope: { x: "N/A", y: "N/A", z: "N/A" },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.acceleration = {
            x: parseFloat(item[3]).toFixed(3) || "N/A",
            y: parseFloat(item[4]).toFixed(3) || "N/A",
            z: parseFloat(item[5]).toFixed(3) || "N/A",
          };
        }
      });
    }

    // Process gyroscope data
    if (gyroscopeData && gyroscopeData.length > 0) {
      gyroscopeData.forEach((item) => {
        const timestamp = new Date(item[2]).getTime();
        if (!timeMap.has(timestamp)) {
          timeMap.set(timestamp, {
            timestamp,
            date: new Date(item[2]).toLocaleDateString(),
            time: new Date(item[2]).toLocaleTimeString(),
            drowsiness: "N/A",
            face_detection: "N/A",
            vehicle_state: "N/A",
            location: { lat: "N/A", lng: "N/A" },
            acceleration: { x: "N/A", y: "N/A", z: "N/A" },
            gyroscope: {
              x: parseFloat(item[3]).toFixed(3) || "N/A",
              y: parseFloat(item[4]).toFixed(3) || "N/A",
              z: parseFloat(item[5]).toFixed(3) || "N/A",
            },
          });
        } else {
          const entry = timeMap.get(timestamp);
          entry.gyroscope = {
            x: parseFloat(item[3]).toFixed(3) || "N/A",
            y: parseFloat(item[4]).toFixed(3) || "N/A",
            z: parseFloat(item[5]).toFixed(3) || "N/A",
          };
        }
      });
    }

    // Convert map to array and sort by timestamp (newest first)
    return Array.from(timeMap.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  };

  // Format drowsiness status code to human-readable text
  const formatDrowsinessStatus = (status) => {
    if (status === null || status === undefined) return "N/A";

    const code = parseInt(status);
    switch (code) {
      case 0:
        return "NORMAL";
      case 1:
        return "YAWNING";
      case 2:
        return "SLEEPY";
      default:
        return `UNKNOWN (${status})`;
    }
  };

  const formatFaceStatus = (status) => {
    if (status === null || status === undefined) return "N/A";
    console.log(status);
    const code = parseInt(status);
    switch (code) {
      case 0:
        return "NO FACE";
      case 1:
        return "USER DETECTED";
      case 2:
        return "NO FACE DETECTED";
      default:
        return `UNKNOWN (${status})`;
    }
  };

  // Search and filter functionality
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterData(term, historyData);
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const handleTimeIntervalChange = (e) => {
    setTimeInterval(e.target.value);
  };

  const filterData = (term, data) => {
    if (!data) return;

    const filtered = data.filter((item) => {
      return term
        ? item.drowsiness.toLowerCase().includes(term) ||
            item.face_detection.toLowerCase().includes(term) ||
            item.vehicle_state.toLowerCase().includes(term) ||
            item.date.toLowerCase().includes(term) ||
            item.time.toLowerCase().includes(term) ||
            JSON.stringify(item.location).toLowerCase().includes(term) ||
            JSON.stringify(item.acceleration).toLowerCase().includes(term) ||
            JSON.stringify(item.gyroscope).toLowerCase().includes(term)
        : true;
    });

    setFilteredData(filtered);
    setCurrentPage(0);
  };

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  // Get current page of data
  const indexOfFirstItem = currentPage * itemsPerPage;
  const currentItems = filteredData.slice(
    indexOfFirstItem,
    indexOfFirstItem + itemsPerPage
  );

  const getDrowsinessColorClass = (status) => {
    switch (status) {
      case 0:
        return "bg-green-100 text-green-800";
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFaceColorClass = (status) => {
    switch (status) {
      case 0:
        return "bg-green-100 text-green-800";
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVehicleStateColorClass = (state) => {
    switch (state?.toLowerCase()) {
      case "drive":
        return "bg-blue-100 text-blue-800";
      case "park":
        return "bg-green-100 text-green-800";
      case "accident":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">
          Vehicle History: {vehicleId}
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Calendar className="text-gray-400 mr-2" size={18} />
            <DatePicker
              selectsRange
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              placeholderText="Date Range"
              className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-3 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <Clock className="text-gray-400 mr-2" size={18} />
            <select
              className="bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleTimeIntervalChange}
              value={timeInterval}
            >
              <option value="-60s">1 minute interval</option>
              <option value="-5m">5 minute interval</option>
              <option value="-10m">10 minute interval</option>
              <option value="-15m">15 minute interval</option>
              <option value="-30m">30 minute interval</option>
              <option value="-1h">1 hour interval</option>
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search history"
              className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Drowsiness
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Face
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acceleration
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Gyroscope
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                        {item.date}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                        {item.time}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDrowsinessColorClass(
                            item.drowsiness
                          )}`}
                        >
                          {item.drowsiness}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFaceColorClass(
                            item.face_detection
                          )}`}
                        >
                          {item.face_detection}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVehicleStateColorClass(
                            item.vehicle_state
                          )}`}
                        >
                          {item.vehicle_state === "N/A"
                            ? "N/A"
                            : item.vehicle_state.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-100">
                        {item.location.lat === "N/A"
                          ? "N/A"
                          : `${item.location.lat}, ${item.location.lng}`}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-100">
                        {item.acceleration.x === "N/A"
                          ? "N/A"
                          : `x: ${item.acceleration.x}, y: ${item.acceleration.y}, z: ${item.acceleration.z}`}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-100">
                        {item.gyroscope.x === "N/A"
                          ? "N/A"
                          : `x: ${item.gyroscope.x}, y: ${item.gyroscope.y}, z: ${item.gyroscope.z}`}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-10 text-center text-gray-400"
                    >
                      No history data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredData.length > itemsPerPage && (
            <ReactPaginate
              previousLabel={"<"}
              nextLabel={">"}
              breakLabel={"..."}
              pageCount={Math.ceil(filteredData.length / itemsPerPage)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={3}
              onPageChange={handlePageClick}
              containerClassName={
                "pagination flex justify-center mt-6 space-x-2"
              }
              activeClassName={"bg-blue-500 text-white rounded-md px-2 py-1"}
              pageClassName={"bg-gray-700 text-white rounded-md px-2 py-1"}
              previousClassName={"bg-gray-700 text-white rounded-md px-2 py-1"}
              nextClassName={"bg-gray-700 text-white rounded-md px-2 py-1"}
            />
          )}
        </>
      )}
    </motion.div>
  );
};

export default VehicleHistoryTable;
