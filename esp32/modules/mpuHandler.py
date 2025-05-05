import time
import math
class MPUHANDLER:
    def __init__(self,i2cmpu=None):
        self.i2cmpu = i2cmpu
        self.MPU_ADDR = 0x68
        self.PWR_MGMT_1 = 0x6B
        self.ACCEL_XOUT_H = 0x3B
        self.GYRO_XOUT_H = 0x43
        self.accel_magnitude = None
        self.gyro_magnitude = None
        self.accel_change = None
        self.accel_x = None
        self.accel_y = None
        self.accel_z = None
        self.gyro_x = None
        self.gyro_y = None
        self.gyro_z = None
      
    def init_mpu6050(self):
    
        if self.i2cmpu is None:
            print("self.i2cmpu not initialized")
            return False
        
        try:
            # Wake up MPU6050
            self.i2cmpu.writeto_mem(self.MPU_ADDR, self.PWR_MGMT_1, b'\x00')
            time.sleep(0.1)
            
            # Check if MPU6050 is responding
            if self.MPU_ADDR not in self.i2cmpu.scan():
                print("MPU6050 not found!")
                return False
                
            print("MPU6050 initialized")
            return True
        except Exception as e:
            print("Failed to initialize MPU6050:", e)
            return False
    # def calculate_accel_magnitude(self):
    #     try:
    #         self.accel_magnitude = math.sqrt(self.accel_x**2 + self.accel_y**2 + self.accel_z**2)
    #         self.gyro_magnitude = math.sqrt(self.gyro_x**2 + self.gyro_y**2 + self.gyro_z**2)
    #         self.accel_change = abs(self.accel_magnitude - 1.0)
    #         return True
    #     except Exception as e:
    #         print(e)
    #         print("Failed to calculate acceleration magnitude")
    
    def calculate_accel_magnitude(self):
        try:
            self.accel_magnitude = math.sqrt(self.accel_x**2 + self.accel_y**2 + self.accel_z**2)
            self.gyro_magnitude = math.sqrt(self.gyro_x**2 + self.gyro_y**2 + self.gyro_z**2)
            self.accel_change = abs(self.accel_magnitude - 1.0)
            return True
        except Exception as e:
            print(e)
            print("Failed to calculate acceleration magnitude")
            return False
           
    def read_mpu6050(self):
        
        if self.i2cmpu is None:
            print("self.i2cmpu not initialized in read_mpu6050")
            return {
                "accel_x": 0, "accel_y": 0, "accel_z": 0,
                "gyro_x": 0, "gyro_y": 0, "gyro_z": 0
            }
        
        try:
            # Read 14 bytes of data starting from ACCEL_XOUT_H register
            data = self.i2cmpu.readfrom_mem(self.MPU_ADDR, self.ACCEL_XOUT_H, 14)
            
            # Helper function to convert the data
            def conv(high, low):  # helper to convert to signed
                val = (high << 8) | low
                return val - 65536 if val > 32767 else val
                
            # Convert the data
            self.accel_x = conv(data[0], data[1]) / 16384.0  # Convert to g (±2g scale)
            self.accel_y = conv(data[2], data[3]) / 16384.0
            self.accel_z = conv(data[4], data[5]) / 16384.0
            
            # Skip temperature (data[6], data[7])
            
            self.gyro_x = conv(data[8], data[9]) / 131.0  # Convert to degrees/s (±250°/s scale)
            self.gyro_y = conv(data[10], data[11]) / 131.0
            self.gyro_z = conv(data[12], data[13]) / 131.0
            self.calculate_accel_magnitude()
            return True
        except Exception as e:
            print("Failed to read MPU6050:"+ e)
            self.accel_x = 0
            self.accel_y = 0
            self.accel_z = 0
            self.gyro_x = 0
            self.gyro_y = 0
            self.gyro_z = 0
            # return {
            #     "accel_x": 0, "accel_y": 0, "accel_z": 0,
            #     "gyro_x": 0, "gyro_y": 0, "gyro_z": 0
            #     }
            return False
