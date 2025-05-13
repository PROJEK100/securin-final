from machine import I2C, UART, Timer, RTC
import network
import time
import ujson
import math
import ufirebase as firebase
import gc
import gsm
from umqtt.robust import MQTTClient
import utime
from modules.processHandler import PROCESSHANDLER

#new
from modules.initHardware import INITHARDWARE
from modules.gpsHandler import GPSParser
from modules.clock import Clock
from modules.firebaseHandler import FIREBASEHANDLER
from modules.mpuHandler import MPUHANDLER
from modules.mqttHandler import MQTTHandler
from modules.connectionESP import ESPCONNECTION


        
# Devices ID
DEVICE_ID = "SUPRAX125_GIBRAN"

SEND_INTERVAL = 2
last_send_time = 0

# Connection Configuration
WIFI_SSID = "tehyung_oppa"
WIFI_PASSWORD = "39267207"
GSM_APN = "internet"

# PIN
# SIM800
GSM_SIM_TX = 17
GSM_SIM_RX = 18

# MPU6050
MPU_SCL_PIN = 22  # GPIO22
MPU_SDA_PIN = 21  # GPIO21
GPS_TX_PIN = 0
GPS_RX_PIN = 15

MQTT_CLIENT_ID = "ESP32_TEST"
MQTT_BROKER = "broker.emqx.io"
MQTT_USER = ""
MQTT_PASSWORD = ""
MQTT_TOPIC_SENSOR = "/SECURIN/SUPRAX125/data"
MQTT_TOPIC_RELAY1 = "/SECURIN/SUPRAX125/master_switch"

FIREBASE_URL = "https://muqsithfirebase-default-rtdb.asia-southeast1.firebasedatabase.app/" 

RELAYPIN = 4

clock = Clock()

gps_parser = GPSParser()
firebase_handler = FIREBASEHANDLER(FIREBASE_URL,DEVICE_ID,clock)
init_hardware = INITHARDWARE()
mpu_handler = MPUHANDLER()
process = PROCESSHANDLER()
conn = ESPCONNECTION(
    SSID=WIFI_SSID,
    PASSWORD=WIFI_PASSWORD,
    GSM_TX=GSM_SIM_TX,
    GSMRX=GSM_SIM_RX,
    GSM_APN=GSM_APN
)

def main():
    global last_send_time
    print("[HARDWARE] Initializing Hardware")
    if not init_hardware.init_hardware(MPU_SCL_PIN,MPU_SDA_PIN,GPS_TX_PIN,GPS_RX_PIN):
        print("[HARDWARE] Initialized Failed")
        return
    gps_parser = GPSParser(gps_uart=init_hardware.gps_uart)
    mpu_handler = MPUHANDLER(init_hardware.i2c_mpu)
    print("Mencoba menghubungkan ke internet")
    if not conn.connect():
        print("Mencoba kembali...")
        if not conn.connect():
            print("GAGAL MENGHUBUNGKAN KE INTERNET")
            return
        return
    if not clock.sync_time():
        print("[TIME] Failed sync time")
        # return
    if not mpu_handler.init_mpu6050():
        print("[MPU6050] Initialized")
        return
    if not firebase_handler.init_firebase():
        print("[FIREBAE] Initilazed")
        return
    process.setCurrentState(process.STATE_PARK)
    last_loop = utime.ticks_ms()
    mqtt_handler = MQTTHandler(
        MQTT_CLIENT_ID,
        MQTT_BROKER,
        MQTT_USER,
        MQTT_PASSWORD,
        MQTT_TOPIC_SENSOR,
        MQTT_TOPIC_RELAY1,
        clock,
        RELAYPIN
    )
    mqtt_handler.connect()
    if conn.WIFI_GSM_STATE == "WiFi":
        mqtt_handler.send_modem_state(
        conn.WIFI_GSM_STATE,
        conn.WIFI_IP,
        conn.WIFI_SIGNAL
    )
    elif conn.WIFI_GSM_STATE == "GSM":
        mqtt_handler.send_modem_state(
        conn.WIFI_GSM_STATE,
        conn.GSM_IP,
        conn.GSM_SIGNAL
    )
    while True:
        conn.check_connection()
        mqtt_handler.check_messages()
        now = utime.ticks_ms()
        gps_parser.read_gps(init_hardware.gps_uart)
        mpu_handler.read_mpu6050()
        mpu_handler.calculate_accel_magnitude()
        process.process_data(
            mpu_handler.accel_change,
            mpu_handler.gyro_magnitude,
            mpu_handler.accel_x,
            mpu_handler.accel_y,
            mpu_handler.accel_z,
            mpu_handler.gyro_x,
            mpu_handler.gyro_y,
            mpu_handler.gyro_z
        )
        print("Current State:", process.current_state)
        print("MPU Accel Change:", mpu_handler.accel_change)
        if utime.ticks_diff(now, last_loop) >= 100:
            last_loop = now
            if process.current_state == process.STATE_PARK:
                if gps_parser.valid:
                    if not mqtt_handler.send_state_park(gps_parser.lat, gps_parser.lon):
                        print("[FIREBASE] Failed send data")
                        gc.collect()
            elif process.current_state == process.STATE_DRIVE:
                if gps_parser.valid:
                    if not mqtt_handler.send_state(
                            "drive",
                            gps_parser.lat,
                            gps_parser.lon,
                            mpu_handler.accel_x,
                            mpu_handler.accel_y,
                            mpu_handler.accel_z,
                            mpu_handler.gyro_x,
                            mpu_handler.gyro_y,
                            mpu_handler.gyro_z,
                            mpu_handler.accel_magnitude,
                            mpu_handler.gyro_magnitude
                    ):
                        print("[FIREBASE] Failed send data")
                        gc.collect()
                        
            elif process.current_state == process.STATE_ACCIDENT:
                if gps_parser.valid:
                    if not mqtt_handler.send_state(
                            "accident",
                            gps_parser.lat,
                            gps_parser.lon,
                            mpu_handler.accel_x,
                            mpu_handler.accel_y,
                            mpu_handler.accel_z,
                            mpu_handler.gyro_x,
                            mpu_handler.gyro_y,
                            mpu_handler.gyro_z,
                            mpu_handler.accel_magnitude,
                            mpu_handler.gyro_magnitude
                            
                    ):
                        print("[FIREBASE] Failed send data")
                        gc.collect()
                        
            last_send_time = now
            gc.collect()
            utime.sleep_ms(500)
        gc.collect()
        
if __name__ == "__main__":
    main()

        


