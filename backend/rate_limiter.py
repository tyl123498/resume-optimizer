import time, threading

class RateLimiter:
    def __init__(self):
        self._records = {}
        self._lock = threading.Lock()
    def check(self, ip, limit, window_seconds):
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            if ip in self._records:
                self._records[ip] = [t for t in self._records[ip] if t > cutoff]
                if len(self._records[ip]) >= limit:
                    return False
            for k in list(self._records.keys()):
                if not self._records[k]:
                    del self._records[k]
            self._records.setdefault(ip, []).append(now)
            return True

limiter = RateLimiter()
