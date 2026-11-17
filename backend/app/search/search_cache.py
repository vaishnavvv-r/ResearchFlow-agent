import time


class SearchCache:
    def __init__(self, ttl_seconds: int = 900):
        self.ttl = ttl_seconds
        self._items = {}

    def get(self, key):
        item = self._items.get(key)
        if not item or time.time() - item[0] > self.ttl:
            self._items.pop(key, None)
            return None
        return item[1]

    def set(self, key, value):
        self._items[key] = (time.time(), value)
