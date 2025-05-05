import { connect } from "mqtt";
import firebaseAdmin from "firebase-admin";
import fs from "fs";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
// import "dotenv/config";

const mqttConfig = {
  host: "broker.emqx.io",
  port: 1883,
  clientId: "mqtt-firebase-bridge-securin",
  username: "",
  password: "",
  reconnectPeriod: 1000,
};

const initFirebase = async () => {
  const serviceAccount = JSON.parse(
    fs.readFileSync(
      new URL("../serviceAccountKey.json", import.meta.url),
      "utf-8"
    )
  );
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL:
      "https://securin-b49ed-default-rtdb.asia-southeast1.firebasedatabase.app",
  });
  return firebaseAdmin.database();
};

const initMQTTClient = async () => {
  const topics = "/SECURIN/#";
  const mqttClient = connect(
    `mqtt://${mqttConfig.host}:${mqttConfig.port}`,
    mqttConfig
  );
  mqttClient.on("connect", () => {
    console.log("Connected to MQTT broker");
    mqttClient.subscribe(topics, (err) => {
      if (!err) {
        console.log(`Subscribed to ${topics}`);
      } else {
        console.error(`Failed to subscribe to ${topics}:`, err);
      }
    });
  });
  return mqttClient;
};

const writeToInfluxDB = async (vehicleId, data, writeApi, mqttClient) => {
  try {
    const { location, monitoring, detection, state, master_switch } = data;

    if (master_switch) {
      const value = master_switch.value == true ? "1" : "0";
      mqttClient.publish(`/SECURIN/${vehicleId}/master_switch`, value, {
        qos: 1,
      });
      console.log("Published master_switch to MQTT:", value);
      const point = new Point("vehicle_master_switch")
        .tag("vehicle_id", vehicleId)
        .booleanField("value", master_switch.value)
        .timestamp(new Date(master_switch.timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (location) {
      const point = new Point("vehicle_location")
        .tag("vehicle_id", vehicleId)
        .floatField("lat", location.lat)
        .floatField("lng", location.lng)
        .timestamp(new Date(location.timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (monitoring?.acceleration) {
      const { x, y, z, timestamp } = monitoring.acceleration;
      const point = new Point("vehicle_acceleration")
        .tag("vehicle_id", vehicleId)
        .floatField("x", x)
        .floatField("y", y)
        .floatField("z", z)
        .timestamp(new Date(timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (monitoring?.gyroscope) {
      const { x, y, z, timestamp } = monitoring.gyroscope;
      const point = new Point("vehicle_gyroscope")
        .tag("vehicle_id", vehicleId)
        .floatField("x", x)
        .floatField("y", y)
        .floatField("z", z)
        .timestamp(new Date(timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (detection?.drowsiness) {
      const point = new Point("vehicle_drowsiness")
        .tag("vehicle_id", vehicleId)
        .intField("status_code", detection.drowsiness.status_code)
        .timestamp(new Date(detection.drowsiness.timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (detection?.face_detection) {
      const point = new Point("vehicle_face_detection")
        .tag("vehicle_id", vehicleId)
        .intField("status", detection.face_detection.status)
        .timestamp(new Date(detection.face_detection.timestamp * 1000));
      writeApi.writePoint(point);
    }

    if (state) {
      const point = new Point("vehicle_state")
        .tag("vehicle_id", vehicleId)
        .stringField("status", state.status)
        .timestamp(new Date(state.timestamp * 1000));
      writeApi.writePoint(point);
    }

    await writeApi.flush();
    console.log("Data written to InfluxDB");
  } catch (err) {
    console.error("Error writing to InfluxDB:", err);
  }
};

const setupFirebaseListener = async (db, writeApi, mqttClient) => {
  const firebaseRef = db.ref("vehicle");
  firebaseRef.on("child_changed", async (snapshot) => {
    const key = snapshot.key;
    const data = snapshot.val();
    if (!key || !data) return;

    console.log("Firebase update:", key);
    await writeToInfluxDB(key, data, writeApi, mqttClient);
  });
};

const setupMQTTMessageHandler = (mqttClient, db) => {
  mqttClient.on("message", async (topic, message) => {
    try {
      const vehicleId = topic.split("/")[2];
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch (e) {
        console.error("Invalid message JSON:", e);
        return;
      }

      if (data.modem) {
        db.ref(`vehicle/${vehicleId}/modem`).set(data.modem);
      }

      if (data.state) {
        const { location, state, acceleration, gyroscope } = data;
        db.ref(`vehicle/${vehicleId}/state`).set(state);
        db.ref(`vehicle/${vehicleId}/location`).set(location);
        if (state.status === "drive" || state.status === "accident") {
          db.ref(`vehicle/${vehicleId}/monitoring`).set({
            acceleration,
            gyroscope,
          });
        }
      }
    } catch (error) {
      console.error("Failed to process MQTT message:", error);
    }
  });

  mqttClient.on("error", (err) => console.error("MQTT Error:", err));
  mqttClient.on("offline", () => console.log("MQTT client offline"));
  mqttClient.on("reconnect", () => console.log("MQTT client reconnecting"));
};

async function main() {
  const db = await initFirebase();

  const influxDB = new InfluxDB({
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
  });

  const writeApi = influxDB.getWriteApi(
    process.env.INFLUX_ORG,
    process.env.INFLUX_BUCKET,
    "ms"
  );
  const mqttClient = await initMQTTClient(mqttConfig);
  setupFirebaseListener(db, writeApi, mqttClient);
  setupMQTTMessageHandler(mqttClient, db);

  process.on("SIGINT", () => {
    mqttClient.end();
    console.log("MQTT client disconnected");
    process.exit();
  });
}

main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});
