import network
import time
from machine import Pin
import ujson
from lib.umqtt.simple import MQTTClient

import ujson
from lib.umqtt.simple import MQTTClient

class MQTTHandler:
    def __init__(self, client_id, broker, user, password, topic_sensor, relay1, clock,pin_relay):
        self.broker = broker
        self.user = user
        self.password = password
        self.topic_sensor = topic_sensor
        self.relay1 = relay1
        self.client = MQTTClient(client_id, broker, user=user if user else None, password=password if password else None)
        self.client.set_callback(self.callback)
        self.clock = clock
        self.relaypin = pin_relay
        self.relaypin = Pin(self.relaypin, Pin.OUT)

    def connect(self):
        print("Connecting to MQTT broker...", end="")
        try:
            self.client.connect()
            print("Connected!")
            self.client.subscribe(self.relay1)
        except Exception as e:
            print("Failed to connect to MQTT broker:", str(e))
            raise

    def callback(self, topic, msg):
        print("Topic eee:", topic)
        if b'master_switch' in topic:
            print("Relay 1 received:", msg)
            if msg == b'0':
                self.relaypin.value(1)
                print("Relay OFF")
            elif msg == b'1':
                self.relaypin.value(0)
                print("Relay ON")

    def check_messages(self):
        self.client.check_msg()

    def disconnect(self):
        self.client.disconnect()
        print("Disconnected from MQTT broker.")
    
    def send_modem_state(self, state,ip,signal):
        time_now = self.clock.get_time()
        if state == "WiFi":
            payload ={
                "modem": {
                "IMEI": "866029036727230",
                "IMSI": "510105942580765",
                "ip_address": ip,
                "operator": state,
                "signal_strength": 25,
                 "timestamp": time_now,
                },
            }
        elif state == "GSM":
            payload ={
                "modem": {
                "IMEI": "866029036727230",
                "IMSI": "510105942580765",
                "ip_address": ip,
                "operator": state,
                "signal_strength": 20,
                 "timestamp": time_now,
                
                },
            }
            
        json_data = ujson.dumps(payload)
        self.client.publish(self.topic_sensor, json_data)
        print("[MQTT] Published modem state")
    def send_state_park(self, gps_lat, gps_lon):
        time_now = self.clock.get_time()
        payload = {
            "location": {
                "lat": gps_lat,
                "lng": gps_lon,
                "timestamp": time_now,
            },
            "state": {
                "status": "park",
                "timestamp": time_now,
            }
        }
        json_data = ujson.dumps(payload)
        self.client.publish(self.topic_sensor, json_data)
        print("[MQTT] Published park state")
        return True

    def send_state(self, state, gps_lat, gps_lon, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z,accel,gyro):
        time_now = self.clock.get_time()
        status_mode = "drive" if state == "drive" else "accident"
        print("status modeeeeeeeeeeeeee", status_mode)
        payload = {
            "location": {
                "lat": gps_lat,
                "lng": gps_lon,
                "timestamp": time_now,
            },
            "acceleration": {
                "x": acc_x,
                "y": acc_y,
                "z": acc_z,
                "timestamp": time_now,
            },
            "gyroscope": {
                "x": gyro_x,
                "y": gyro_y,
                "z": gyro_z,
                "timestamp": time_now,
            },
            "accel_change": {
                "accel": accel,
                "timestamp": time_now,
                },
            "gyro_magnitude": {
                "gyro": gyro,
                "timestamp": time_now,
            },
            "state": {
                "status": status_mode,
                "timestamp": time_now,
            }
        }

        json_data = ujson.dumps(payload)
        self.client.publish(self.topic_sensor, json_data)
        return True
