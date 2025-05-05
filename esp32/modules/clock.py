import utime
from machine import RTC

class Clock:
    def __init__(self):
        self.rtc = RTC()

    def sync_time(self):
        try:
            print("Syncing time via NTP...")
            self.rtc.ntp_sync(server="id.pool.ntp.org")
            for _ in range(10):
                if self.rtc.synced():
                    print("Time synced successfully!")
                    return True
                utime.sleep(1)
            print("Time sync timeout.")
            return False
        except Exception as e:
            print("NTP sync error:", e)
            return False

    def get_time(self):
        return utime.time()
