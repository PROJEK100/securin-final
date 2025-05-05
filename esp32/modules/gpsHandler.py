import gc
import time

class GPSParser:
    def __init__(self, gps_uart=None):
        self.gps_uart = gps_uart
        self.lat = 0.0
        self.lon = 0.0
        self.valid = False # no debug
        self.clock = None

    def parse_gps_data(self, line):
        try:
            if b"$GPRMC" in line:
                parts = line.decode('ascii').split(',')
                if len(parts) >= 10 and parts[2] == 'A':  
                    # Parse clock
                    self.clock = parts[1]
                    # print("Clock:", self.clock)

                    # Parse latitude
                    if parts[3] and parts[4]:
                        lat_deg = float(parts[3][:2])
                        lat_min = float(parts[3][2:])
                        lat = lat_deg + lat_min / 60.0
                        if parts[4] == 'S':
                            lat = -lat
                        
                        lon_deg = float(parts[5][:3])
                        lon_min = float(parts[5][3:])
                        lon = lon_deg + lon_min / 60.0
                        if parts[6] == 'W':
                            lon = -lon
                        
                        self.lat = lat
                        self.lon = lon
                        self.valid = True
                        return True
            return False
        except Exception as e:
            print("GPS parsing error:", e)
            return False

    def read_gps(self, timer=None):
        if self.gps_uart is None:
            print("GPS gps_uart not initialized in read_gps")
            return None
        try:
            if self.gps_uart.any():
                buffer = b""
                # Read all available data
                while self.gps_uart.any():
                    gc.collect()
                    buffer += self.gps_uart.readline()
                    time.sleep(0.05)
                
                # Process each line
                lines = buffer.split(b'\r\n')
                for line in lines:
                    if line:  # Skip empty lines
                        if self.parse_gps_data(line):
                            return True
        except Exception as e:
            print("Error reading GPS:", e)
        return False
