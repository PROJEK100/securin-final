from machine import I2C, UART, Timer, RTC, Pin

class INITHARDWARE:
    def __init__(self):
        self.i2c_mpu = None
        self.gps_uart = None
        self.relay = None
        self.relayPin = 13

    
    
    def init_hardware(self,MPU_SCL_PIN,MPU_SDA_PIN,GPS_TX_PIN,GPS_RX_PIN):
        try:
            self.relay = Pin(self.relayPin,Pin.OUT)
            self.i2c_mpu = I2C(0, scl=MPU_SCL_PIN, sda=MPU_SDA_PIN, freq=400000)
            self.gps_uart = UART(2, baudrate=9600, tx=GPS_TX_PIN, rx=GPS_RX_PIN)
            return True
        except Exception as e:
            print("Hardware initialization error: {e}")
            return False