import { InfluxDB } from "@influxdata/influxdb-client";

export default class InfluxVehicleService {
  constructor() {
    this.influxDB = new InfluxDB({
      url: "https://influxdb.securin.cloud",
      token: "rahasia_securin",
    });

    this.queryApi = this.influxDB.getQueryApi("securin");
    this.bucket = "securinbucket";
  }

  async getAccelerationWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startParam}, stop: ${stopParam})
        |> filter(fn: (r) => r._measurement == "vehicle_acceleration" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getGyroscopeWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startParam}, stop: ${stopParam})
        |> filter(fn: (r) => r._measurement == "vehicle_gyroscope" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getAccelerationWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startParam}, stop: ${stopParam})
        |> filter(fn: (r) => r._measurement == "vehicle_acceleration" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getGyroscopeWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startParam}, stop: ${stopParam})
        |> filter(fn: (r) => r._measurement == "vehicle_gyroscope" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: mean, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getLocationWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startParam}, stop: ${stopParam})
        |> filter(fn: (r) => r._measurement == "vehicle_location" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: last, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "lat", "lng"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async getLocation(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_location" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "lat", "lng"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async getVehicleRoute(
    vehicleId,
    start = "-24h",
    stop = "now()",
    limit = 500
  ) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_location" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "lat", "lng"])
        |> sort(columns: ["_time"], desc: false)
        |> limit(n: ${limit})
    `;

    return this.executeQuery(query);
  }

  async getAcceleration(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_acceleration" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getGyroscope(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_gyroscope" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "x", "y", "z"])
    `;

    return this.executeQuery(query);
  }

  async getDrowsinessWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    // Check if start contains a pipe (indicating it's a date range)
    let startParam = start;
    let stopParam = stop;

    // If start contains a timestamp with a pipe separator, split it
    if (typeof start === "string" && start.includes("|")) {
      const [startDate, endDate] = start.split("|");
      startParam = `time(v: "${startDate}")`;
      stopParam = `time(v: "${endDate}")`;
    }

    const query = `
    from(bucket: "${this.bucket}")
      |> range(start: ${startParam}, stop: ${stopParam})
      |> filter(fn: (r) => r._measurement == "vehicle_drowsiness" and r.vehicle_id == "${vehicleId}")
      |> aggregateWindow(every: ${positiveInterval}, fn: last, createEmpty: false)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> keep(columns: ["_time", "status_code"])
  `;

    return this.executeQuery(query);
  }

  async getDrowsiness(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_drowsiness" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "status_code"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async getFaceDetectionWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_face_detection" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: last, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "status"])
    `;

    return this.executeQuery(query);
  }

  async getFaceDetection(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_face_detection" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "status"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async getVehicleStateWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_state" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: last, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "status"])
    `;

    return this.executeQuery(query);
  }

  async getVehicleState(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_state" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "status"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async getMasterSwitchWithInterval(
    vehicleId,
    start = "-1h",
    stop = "now()",
    interval = "-10m"
  ) {
    // Remove the negative sign from interval for aggregateWindow
    const positiveInterval = interval.startsWith("-")
      ? interval.substring(1)
      : interval;

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_master_switch" and r.vehicle_id == "${vehicleId}")
        |> aggregateWindow(every: ${positiveInterval}, fn: last, createEmpty: false)
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "value"])
    `;

    return this.executeQuery(query);
  }

  async getMasterSwitch(vehicleId, start = "-1h", stop = "now()") {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r._measurement == "vehicle_master_switch" and r.vehicle_id == "${vehicleId}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> keep(columns: ["_time", "value"])
        |> sort(columns: ["_time"], desc: false)
    `;

    return this.executeQuery(query);
  }

  async executeQuery(fluxQuery) {
    const result = [];
    try {
      const startTime = performance.now();
      await this.queryApi.collectRows(fluxQuery, (row) => {
        result.push(row);
      });
      const endTime = performance.now();
      console.log(
        `Query execution time: ${endTime - startTime}ms, fetched ${
          result.length
        } rows`
      );
      return result;
    } catch (err) {
      console.error("Query error:", err);
      throw err;
    }
  }
}
