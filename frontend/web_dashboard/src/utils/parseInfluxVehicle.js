import { p } from "framer-motion/client";
import InfluxVehicleService from "./InfluxVehicleService.js";

const service = new InfluxVehicleService();
const vehicleId = "SUPRAX123";
const range = "-1w";
const choose1 = "acceleration";
const choose2 = "location";
const choose3 = "gyroscope";
import { generateDummyLocationData } from "./tes.js";

/**
 * Parses location data from InfluxDB to a format suitable for React Leaflet
 * @param {Array} influxData - Raw data from InfluxDB query
 * @returns {Array} Array of [lat, lng] coordinates for polyline
 */
export const parseLocationData = (influxData) => {
  if (!influxData || !Array.isArray(influxData) || influxData.length === 0) {
    return [];
  }

  // Performance optimization: pre-allocate result array
  const result = new Array(influxData.length);

  // Check if data is in array format [timestamp, lat, lng]
  if (Array.isArray(influxData[0])) {
    for (let i = 0; i < influxData.length; i++) {
      const point = influxData[i];
      // Latitude is at index 3, Longitude at index 4
      result[i] = [parseFloat(point[3]), parseFloat(point[4])];
    }
    return result;
  }

  // Check if data is in object format with lat/lng properties
  if (influxData[0].lat !== undefined && influxData[0].lng !== undefined) {
    for (let i = 0; i < influxData.length; i++) {
      const point = influxData[i];
      result[i] = [parseFloat(point.lat), parseFloat(point.lng)];
    }
    return result;
  }

  // Data format not recognized
  console.error("Unrecognized location data format", influxData[0]);
  return [];
};

/**
 * Filters location data points to reduce noise and improve performance
 * When data is large, this provides more aggressive filtering
 */
export const filterLocationData = (locationData, minDistance = 5) => {
  if (locationData.length <= 2) return locationData;

  // More aggressive filtering for larger datasets
  const adaptiveMinDistance =
    locationData.length > 1000
      ? 10
      : locationData.length > 500
      ? 8
      : minDistance;

  const filtered = [locationData[0]];
  const len = locationData.length;

  // For very large datasets, sample points instead of checking each one
  if (len > 2000) {
    const sampleRate = Math.floor(len / 1000);
    for (let i = sampleRate; i < len; i += sampleRate) {
      filtered.push(locationData[i]);
    }
    // Always include the last point
    if (filtered[filtered.length - 1] !== locationData[len - 1]) {
      filtered.push(locationData[len - 1]);
    }
    return filtered;
  }

  for (let i = 1; i < len; i++) {
    const lastPoint = filtered[filtered.length - 1];
    const currentPoint = locationData[i];

    // Simple distance calculation (not accounting for Earth's curvature)
    const distance = Math.sqrt(
      Math.pow((currentPoint[0] - lastPoint[0]) * 111000, 2) +
        Math.pow(
          (currentPoint[1] - lastPoint[1]) *
            111000 *
            Math.cos((lastPoint[0] * Math.PI) / 180),
          2
        )
    );

    if (distance >= adaptiveMinDistance) {
      filtered.push(currentPoint);
    }
  }

  return filtered;
};

export const showData = async (vehicleId, choose, range, interval = null) => {
  const formatRange = (range) => {
    if (!range.startsWith("-")) {
      return `-${range}`;
    }
    return range;
  };

  const formattedRange = formatRange(range);
  console.log(
    `Querying ${choose} with range ${formattedRange} and interval ${
      interval || "none"
    }`
  );

  // Use interval to modify queries if provided
  let result = [];

  switch (choose) {
    case "location":
      // If interval is provided, use it for data aggregation
      if (interval) {
        result = await service.getLocationWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getLocation(vehicleId, formattedRange);
      }
      return result;

    case "acceleration":
      if (interval) {
        result = await service.getAccelerationWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getAcceleration(vehicleId, formattedRange);
      }
      return result;

    case "gyroscope":
      if (interval) {
        result = await service.getGyroscopeWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getGyroscope(vehicleId, formattedRange);
      }
      return result;

    case "drowsiness":
      if (interval) {
        result = await service.getDrowsinessWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getDrowsiness(vehicleId, formattedRange);
      }
      return result;

    case "face_detection":
      if (interval) {
        result = await service.getFaceDetectionWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getFaceDetection(vehicleId, formattedRange);
      }
      return result;

    case "vehicle_state":
      if (interval) {
        result = await service.getVehicleStateWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getVehicleState(vehicleId, formattedRange);
      }
      return result;

    case "master_switch":
      if (interval) {
        result = await service.getMasterSwitchWithInterval(
          vehicleId,
          formattedRange,
          interval
        );
      } else {
        result = await service.getMasterSwitch(vehicleId, formattedRange);
      }
      return result;

    default:
      console.warn(`Unknown data type: ${choose}`);
      return [];
  }
};

const testAllDataTypes = async (
  vehicleId = "SUPRAX123",
  range = "-1h",
  interval = null
) => {
  console.group("📊 InfluxDB Data Test");
  console.time("Total query time");

  const dataTypes = [
    "acceleration",
    "gyroscope",
    "location",
    "drowsiness",
    "face_detection",
    "vehicle_state",
    "master_switch",
  ];

  for (const dataType of dataTypes) {
    console.group(`Testing ${dataType} data`);
    console.time(`${dataType} query`);

    try {
      const result = await showData(vehicleId, dataType, range, interval);

      console.log(`Received ${result?.length || 0} records`);

      if (result && result.length > 0) {
        console.log("Sample data (first 3 records):");
        console.table(result.slice(0, 3));

        // Log the structure of a sample record for reference
        console.log("Data structure:");
        console.log(JSON.stringify(result[0], null, 2));

        // Add specific analysis based on data type
        switch (dataType) {
          case "acceleration":
          case "gyroscope":
            // Check if x, y, z values are present at correct indices
            if (
              result[0][3] !== undefined &&
              result[0][4] !== undefined &&
              result[0][5] !== undefined
            ) {
              console.log("✅ Data format looks correct (has x, y, z values)");
            } else {
              console.warn(
                "⚠️ Data may not have expected x, y, z values at indices 3, 4, 5"
              );
            }
            break;

          case "location":
            // Check if lat, lng values are present at correct indices
            if (result[0][3] !== undefined && result[0][4] !== undefined) {
              console.log("✅ Data format looks correct (has lat, lng values)");
            } else {
              console.warn(
                "⚠️ Data may not have expected lat, lng values at indices 3, 4"
              );
            }
            break;

          case "drowsiness":
            // Check if status_code is present
            if (result[0][3] !== undefined) {
              console.log(
                `✅ Data format looks correct (status_code: ${result[0][3]})`
              );
            }
            break;

          case "face_detection":
          case "vehicle_state":
            // Check if status is present
            if (result[0][3] !== undefined) {
              console.log(
                `✅ Data format looks correct (status: ${result[0][3]})`
              );
            }
            break;

          case "master_switch":
            // Check if value is present
            if (result[0][3] !== undefined) {
              console.log(
                `✅ Data format looks correct (value: ${result[0][3]})`
              );
            }
            break;
        }

        // Check timestamp format
        if (result[0][2]) {
          const timestamp = result[0][2];
          console.log(`Timestamp sample: ${timestamp}`);
          console.log(`Parsed date: ${new Date(timestamp).toLocaleString()}`);
        }
      } else {
        console.warn("⚠️ No data received");
      }
    } catch (error) {
      console.error(`❌ Error querying ${dataType}:`, error.message);
    }

    console.timeEnd(`${dataType} query`);
    console.groupEnd();
  }

  console.timeEnd("Total query time");
  console.groupEnd();
};

testAllDataTypes(
  vehicleId,
  range,
  "1m" // Example interval
);
