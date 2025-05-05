# Accident detection configuration
import math
import time
class PROCESSHANDLER:
    def __init__(self):
        self.STATE_INIT = 0
        self.current_state = self.STATE_INIT
        self.current_time = None
        self.STATE_PARK = 1
        self.STATE_DRIVE = 2
        self.STATE_ACCIDENT = 3
        self.ACCIDENT_ACCEL_THRESHOLD = 40
        self.ACCIDENT_GYRO_THRESHOLD = 200.0
        self.ACCIDENT_DETECTION_WINDOW = 9
        self.last_movement_time = 0
        self.accident_buffer = []
        self.accident_cooldown = 0            # Cooldown timer after accident detection
        self.ACCIDENT_COOLDOWN_PERIOD = 30    # Seconds to wait before allowing new accident detection

    def setCurrentState(self,STATE):
        self.current_state = STATE
    def detect_accident(self,sensor_data):
        self.current_time = time.time()
        if self.current_time < self.accident_cooldown:
            return False
        # Convert sensor_data to tuple: (accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z)
        data_tuple = (
            sensor_data[0],  # accel_x
            sensor_data[1],  # accel_y
            sensor_data[2],  # accel_z
            sensor_data[3],  # gyro_x
            sensor_data[4],  # gyro_y
            sensor_data[5]   # gyro_z
        )

        self.accident_buffer.append(data_tuple)

        if len(self.accident_buffer) > self.ACCIDENT_DETECTION_WINDOW:
            self.accident_buffer.pop(0)

        if len(self.accident_buffer) < self.ACCIDENT_DETECTION_WINDOW:
            return False

        for data in self.accident_buffer:
            accel_magnitude = math.sqrt(data[0]**2 + data[1]**2 + data[2]**2)
            gyro_magnitude = math.sqrt(data[3]**2 + data[4]**2 + data[5]**2)

            if accel_magnitude > self.ACCIDENT_ACCEL_THRESHOLD or gyro_magnitude > self.ACCIDENT_GYRO_THRESHOLD:
                self.accident_buffer.clear()
                self.accident_cooldown = self.current_time + self.ACCIDENT_COOLDOWN_PERIOD
                return True
            
        return False

    def handle_accident(self):
        if self.current_state == self.STATE_ACCIDENT:
            print("Accident detected!")
            self.current_state = self.STATE_PARK
            self.accident_cooldown = time.time() + self.ACCIDENT_COOLDOWN_PERIOD
    def process_data(self,accel_change, gyro_magnitude,accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z):
        # State transitions based on current state
        self.current_time = time.time()
        print("Current time originallll:", self.current_time)
        sensor_data = [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
        if self.current_state == self.STATE_PARK:
            if accel_change > 0.3 or gyro_magnitude > 15.0:
                self.current_state = self.STATE_DRIVE
                # self.last_movement_time = self.current_time
        elif self.current_state == self.STATE_DRIVE:
            if self.detect_accident(sensor_data):
                self.current_state = self.STATE_ACCIDENT
                self.last_movement_time = self.current_time
            elif accel_change > 0.3 or gyro_magnitude > 15.0:
                self.last_movement_time = self.current_time
            elif self.current_time - self.last_movement_time > 5:
                self.current_state = self.STATE_PARK
                self.last_movement_time = self.current_time
        elif self.current_state == self.STATE_ACCIDENT:
            if accel_change > 0.3 or gyro_magnitude > 15.0:
                self.last_movement_time = self.current_time
            elif self.current_time - self.last_movement_time > 5:
                self.current_state = self.STATE_PARK
                self.last_movement_time = self.current_time