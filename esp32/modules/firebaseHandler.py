import ufirebase as firebase
# from modules.clock import get_time
import gc 

class FIREBASEHANDLER:
    def __init__(self, firebaseurl,device_id,clock):
        self.firebaseurl = firebaseurl
        self.device_id = device_id
        self.FIREBASE_SEND_INTERVAL = 20      # Send data every 20 seconds
        self.last_data_send = 0               # Last time data was sent
        self.CRITICAL_SEND_INTERVAL = 5
        self.clock = clock# Send critical data every 5 seconds
        
    def init_firebase(self):
    
        try:
            firebase.setURL(self.firebaseurl)
            print("Firebase initialized...")
            return True
        except Exception as e:
            print("Error initializing Firebase:", e)
            return False


    def firebase_get(self,path):
        try:
            result = firebase.get(path, "temp", bg=False)
            return result
        except Exception as e:
            print("[GET] Error reading :", e)
            return None

    def firebase_put(self,path, data):
        try:
            firebase.put(path, data, bg=False)
            print("[PUT] Data berhasil dikirim")
            return True
        except Exception as e:
            print("[PUT] Error sending:", e)
            return False

    def firebase_patch(self,path, data):
        try:
            firebase.patch(path, data, bg=False)
            print("[PATCH] Data berhasil diupdate")
            return True
        except Exception as e:
            print("[PATCH] Error patching:", e)
            return False
    def send_state_park(self, gps_lat, gps_lon):
        time = self.clock.get_time()
        location_data = {
            "lat": gps_lat,
            "lng": gps_lon,
            "timestamp": time,
        }
        state_data = {
            "status": "park",
            "timestamp": time,
        }
        
        gc.collect()
        return True


    def send_state(self, state, gps_lat, gps_lon, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z):
        time = self.clock.get_time()
        status_mode = "drive" if state == "drive" else "accident"

        location_data = {
            "lat": gps_lat,
            "lng": gps_lon,
            "timestamp": time,
        }

        acceleration_data = {
            "x": acc_x,
            "y": acc_y,
            "z": acc_z,
            "timestamp": time,
        }

        gyroscope_data = {
            "x": gyro_x,
            "y": gyro_y,
            "z": gyro_z,
            "timestamp": time,
        }

        state_data = {
            "status": status_mode,
            "timestamp": time,
        }
        
        merged_data = {
            "location": location_data,
            "accelleration": acceleration_data,
            "gyroscope": gyroscope_data,
            "state": state_data
        }


        base_path = "vehicle/" + self.device_id
        existing = self.firebase_get(base_path)

        if existing:
            self.firebase_patch("vehicle/" + self.device_id, merged_data)
        else:
            self.firebase_put("vehicle/" + self.device_id, merged_data)
            gc.collect()

        gc.collect()
        return True
