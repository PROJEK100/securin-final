import gc
import time
import gsm
import network
class ESPCONNECTION:
    def __init__(self,SSID,PASSWORD,GSM_TX,GSMRX,GSM_APN):
        self.wlan = None
        self.gsm = None
        self.SSID = SSID
        self.PASSWORD = PASSWORD
        self.GSM_TX = GSM_TX
        self.GSM_RX = GSMRX
        self.GSM_APN = GSM_APN
        self.GSM_STATUS = None
        self.WIFI_STATUS = None
        self.GSM_IP = None
        self.WIFI_IP = None
        self.WIFI_GSM_STATE = None
        self.WIFI_SIGNAL = None
        self.GSM_SIGNAL = None
    def connect_gsm(self):
        gsm.start(
            tx=self.GSM_TX,
            rx=self.GSM_RX,
            apn=self.GSM_APN,
            connect=True,
            wait=False
        )

        gsm.debug(True)

        print("Connecting to GSM", end="")
        initialized = False

        while True:
            status = gsm.status()
            status_code = status[0]
            status_msg = status[1]
            
            if status_code == 1:
                print("\nConnected! Status:", status_msg)
                print("IP Addresmu: ", gsm.ifconfig()[0])
                return True
                
            elif status_code == 0:
                print(".", end="")
                
            elif status_code in (0, 98):  
                if status_code == 98 and not initialized:
                    print(" (Initializing GSM)", end="")
                    initialized = True
                print(".", end="")
                
            elif status_code == 89:
                print("\nGSM Ready, starting PPP...")
            gc.collect()
            time.sleep(0.5)  

    def connect_wifi(self):
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        print("Connecting to WiFi...")

        max_retries = 3
        for attempt in range(max_retries):
            try:
                if not self.wlan.isconnected():
                    self.wlan.connect(self.SSID, self.PASSWORD)
                    
                    timeout = 20
                    while not self.wlan.isconnected() and timeout > 0:
                        gc.collect()
                        print("Waiting for connection... timeouts")
                        time.sleep(1)
                        timeout -= 1
                
                if self.wlan.isconnected():
                    print('WiFi connected!')
                    print('Network config:', self.wlan.ifconfig())
                    return True
                else:
                    print('WiFi connection failed (attempt '+str(attempt+1)+')')
                    time.sleep(2)
                gc.collect()

            except OSError as e:
                print("WiFi connection error: {e}")
                print("Retrying ({attempt+1}/{max_retries})...")
                self.wlan.active(False)
                time.sleep(2)
                self.wlan.active(True)
                time.sleep(1)
                gc.collect()
                

        print("All WiFi connection attempts failed")
        return False
    def is_connected(self):
        if self.wlan and self.wlan.isconnected():
            return 'WiFi'
        elif self.connect_gsm():
            return 'GSM'
        return None
    def connect(self):
        if self.connect_wifi():
            self.WIFI_STATUS = True
            self.GSM_STATUS = False
            self.WIFI_IP = self.wlan.ifconfig()[0]
            self.WIFI_SIGNAL = "Good"
            self.WIFI_GSM_STATE = "WiFi"
            return True
        elif self.connect_gsm():
            self.GSM_STATUS = True
            self.WIFI_STATUS = False
            self.GSM_IP = gsm.ifconfig()[0]
            self.GSM_SIGNAL = "Good"
            self.WIFI_GSM_STATE = "GSM"
            return True
        else:
            print("Koneksi gagal ke WiFi maupun GSM.")
            self.GSM_STATUS = False
            self.WIFI_STATUS = False
            return False
            
    def check_connection(self, check_interval=5, wifi_retry=3):
        retry_count = 0

        while True:
            conn_type = self.is_connected()
            if conn_type == 'WiFi':
                print("[Monitor] WiFi masih terhubung."+conn_type)
                retry_count = 0 
                return True
            elif conn_type == 'GSM':
                print("[Monitor] Koneksi fallback GSM aktif."+conn_type)
                retry_count = 0
                return True
            else:
                print("[Monitor] Tidak ada koneksi! Mencoba reconnect...")
                while retry_count < wifi_retry:
                    if self.connect_wifi():
                        print("[Monitor] Reconnected ke WiFi.")
                        self.WIFI_STATUS = True
                        self.GSM_STATUS = False
                        break
                    else:
                        retry_count += 1
                        print("[Monitor] Gagal reconnect WiFi"+ " (attempt {}/{}).".format(retry_count, wifi_retry))
                        time.sleep(2)

                if retry_count >= wifi_retry:
                    print("[Monitor] Beralih ke GSM...")
                    if self.connect_gsm():
                        print("[Monitor] Berhasil konek via GSM.")
                        self.GSM_STATUS = True
                        self.WIFI_STATUS = False
                        gc.collect()
                        
                    else:
                        print("[Monitor] Gagal konek GSM juga. Akan coba lagi nanti.")
                        gc.collect()
                gc.collect()
                
                return False

