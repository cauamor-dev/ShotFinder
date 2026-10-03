export class Cache {
  constructor({ ttl = 300_000, max = 250, now = Date.now } = {}) {
    this.ttl = ttl;
    this.max = max;
    this.now = now;
    this.values = new Map();
  }
  async get(key, load) {
    const cached = this.values.get(key);
    if (cached && cached.expires > this.now()) return cached.promise;
    this.values.delete(key);
    while (this.values.size >= this.max)
      this.values.delete(this.values.keys().next().value);
    const entry = { expires: this.now() + this.ttl, promise: null };
    entry.promise = Promise.resolve()
      .then(load)
      .catch((error) => {
        if (this.values.get(key) === entry) this.values.delete(key);
        throw error;
      });
    this.values.set(key, entry);
    return entry.promise;
  }
}
