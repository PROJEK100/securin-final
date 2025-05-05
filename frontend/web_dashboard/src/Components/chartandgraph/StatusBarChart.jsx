import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { showData } from "../../utils/parseInfluxVehicle";

function StatusBarChart({
  title,
  dataType,
  vehicleId,
  range,
  icon: Icon,
  colors,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeInterval, setTimeInterval] = useState("-10m");

  const fetchAndProcessData = async (vehicleId, dataType, range, interval) => {
    try {
      setLoading(true);
      console.log(
        `Fetching ${dataType} with range: ${range}, interval: ${interval}`
      );

      const result = await showData(vehicleId, dataType, range, interval);

      if (result && result.length > 0) {
        const timeGroups = {};
        result.forEach((item) => {
          const timestamp = new Date(item[2]);
          const timeKey = timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = {
              time: timeKey,
              status0: 0,
              status1: 0,
              status2: 0,
            };
          }
          const status = parseInt(item[3]);
          if (status === 0) timeGroups[timeKey].status0++;
          else if (status === 1) timeGroups[timeKey].status1++;
          else if (status === 2) timeGroups[timeKey].status2++;
        });
        const processedData = Object.values(timeGroups).sort((a, b) => {
          return (
            new Date("1970/01/01 " + a.time) - new Date("1970/01/01 " + b.time)
          );
        });

        setData(processedData);
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

  useEffect(() => {
    fetchAndProcessData(vehicleId, dataType, range, timeInterval);
  }, [vehicleId, dataType, range, timeInterval]);

  const handleTimeIntervalChange = (e) => {
    setTimeInterval(e.target.value);
  };

  const getStatusLabels = () => {
    if (dataType === "drowsiness") {
      return ["Normal", "Yawning", "Sleepy"];
    } else if (dataType === "face_detection") {
      return ["No Face", "User Detected", "No Face Detected"];
    }
    return ["Status 0", "Status 1", "Status 2"];
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

    const statusLabels = getStatusLabels();

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF" }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis
            stroke="#9CA3AF"
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              fill: "#9CA3AF",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(31, 41, 55, 0.8)",
              borderColor: "#4B5563",
            }}
            itemStyle={{ color: "#E5E7EB" }}
          />
          <Legend />
          <Bar
            dataKey="status0"
            name={statusLabels[0]}
            stackId="a"
            fill={colors[0]}
          />
          <Bar
            dataKey="status1"
            name={statusLabels[1]}
            stackId="a"
            fill={colors[1]}
          />
          <Bar
            dataKey="status2"
            name={statusLabels[2]}
            stackId="a"
            fill={colors[2]}
          />
        </BarChart>
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
        </div>
      </div>

      {renderChart()}
    </motion.div>
  );
}

export default StatusBarChart;
