import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { showData } from "../../utils/parseInfluxVehicle";

function VehicleChart({
  title,
  dataType,
  vehicleId,
  range,
  icon: Icon,
  colors,
  isLocationChart = false,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeInterval, setTimeInterval] = useState("-10m");

  // This function will fetch and process data based on all parameters including timeInterval
  const fetchAndProcessData = async (vehicleId, dataType, range, interval) => {
    try {
      setLoading(true);
      console.log(
        `Fetching ${dataType} with range: ${range}, interval: ${interval}`
      );

      // Pass the interval to the showData function
      const result = await showData(vehicleId, dataType, range, interval);

      if (result && result.length > 0) {
        // Process data based on dataType
        let processedData;

        if (dataType === "acceleration" || dataType === "gyroscope") {
          processedData = result.map((item) => ({
            timestamp: new Date(item[2]).getTime(),
            x: parseFloat(item[3]),
            y: parseFloat(item[4]),
            z: parseFloat(item[5]),
            time: new Date(item[2]).toLocaleTimeString(),
          }));
        } else if (dataType === "location") {
          processedData = result.map((item) => ({
            timestamp: new Date(item[2]).getTime(),
            lat: parseFloat(item[3]),
            lng: parseFloat(item[4]),
            time: new Date(item[2]).toLocaleTimeString(),
          }));
        }

        setData(processedData);
        console.log(`Processed ${processedData.length} data points`);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(`Error fetching ${dataType} data:`, err);
      setError(`Failed to load ${dataType} data`);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load and when main parameters change
  useEffect(() => {
    fetchAndProcessData(vehicleId, dataType, range, timeInterval);
  }, [vehicleId, dataType, range, timeInterval]);

  // Update handler to refetch data when interval changes
  const handleTimeIntervalChange = (e) => {
    const newInterval = e.target.value;
    setTimeInterval(newInterval);
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-64 text-red-500">
          <span>{error}</span>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex justify-center items-center h-64 text-gray-400">
          <span>No data available for the selected time range</span>
        </div>
      );
    }

    if (isLocationChart) {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="lng"
              name="Longitude"
              type="number"
              stroke="#9CA3AF"
              domain={["dataMin - 0.00001", "dataMax + 0.00001"]}
            />
            <YAxis
              dataKey="lat"
              name="Latitude"
              type="number"
              stroke="#9CA3AF"
              domain={["dataMin - 0.00001", "dataMax + 0.00001"]}
            />
            <ZAxis range={[50]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(31, 41, 55, 0.8)",
                borderColor: "#4B5563",
              }}
              itemStyle={{ color: "#E5E7EB" }}
              formatter={(value, name) => [value.toFixed(6), name]}
              labelFormatter={(value) =>
                `Time: ${data[value]?.time || "Unknown"}`
              }
            />
            <Legend />
            <Scatter
              name="Vehicle Path"
              data={data}
              fill={colors[0]}
              line={{ stroke: colors[0], strokeWidth: 2 }}
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: "#9CA3AF" }} />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(31, 41, 55, 0.8)",
              borderColor: "#4B5563",
            }}
            itemStyle={{ color: "#E5E7EB" }}
            formatter={(value, name) => [value.toFixed(6), name]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="x"
            name="X-Axis"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="y"
            name="Y-Axis"
            stroke={colors[1]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="z"
            name="Z-Axis"
            stroke={colors[2]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center text-gray-100">
          {Icon && <Icon className="mr-2" size={20} />}
          {title}
        </h2>
        <div>
          {!isLocationChart && (
            <select
              className="bg-gray-700 text-white rounded-md ml-2 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeInterval}
              onChange={handleTimeIntervalChange}
            >
              <option value="-60s">1 minute intervals</option>
              <option value="-5m">5 minute intervals</option>
              <option value="-10m">10 minute intervals</option>
              <option value="-15m">15 minute intervals</option>
              <option value="-30m">30 minute intervals</option>
              <option value="-1h">1 hour intervals</option>
            </select>
          )}
        </div>
      </div>

      {renderChart()}

      {isLocationChart && data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-sm text-gray-300">Latest Position</p>
            <p className="text-md text-white mt-1">
              Lat: {data[data.length - 1].lat.toFixed(6)}, Lng:{" "}
              {data[data.length - 1].lng.toFixed(6)}
            </p>
          </div>
          <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-sm text-gray-300">Last Updated</p>
            <p className="text-md text-white mt-1">
              {new Date(data[data.length - 1].timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default VehicleChart;
