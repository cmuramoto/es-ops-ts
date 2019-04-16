export class StringSet<V> {
  readonly ke: (key: V) => string;
  readonly map: Record<string, V>;
  _vals: Array<V>;

  constructor(keyExtractor: (key: V) => string) {
    this.ke = keyExtractor;
    this.map = {};
  }

  add(key: V): boolean {
    let sk: string;
    if (key && (sk = this.ke(key)) && !this.map[sk]) {
      this.map[sk] = key;
      this._vals = null;
      return true;
    }
    return false;
  }

  remove(key: V): boolean {
    let url: string;
    if (key && (url = this.ke(key)) && this.map[url]) {
      delete this.map[url];
      this._vals = null;
      return true;
    }
    return false;
  }

  isEmpty() {
    return Object.keys(this.map).length == 0;
  }

  vals() {
    return this._vals || (this._vals = Object.values(this.map));
  }
}

export class StringMap<K, V> {
  readonly ke: (k: K) => string;
  map: Record<string, [K, V]> = {};
  _vals: Array<V>;

  constructor(keyExtractor: (k: K) => string) {
    this.ke = keyExtractor;
  }

  put(key: K, val: V, onlyIfAbsent: boolean = false): V {
    let m = this.map;
    let skey: string;
    let old: V;
    if (key && (skey = this.ke(key))) {
      let prev = m[skey];
      old = prev ? prev[1] : null;
      if (onlyIfAbsent && old) {
        return old;
      }
      this.map[skey] = [key, val];
      this._vals = null;
    }
    return old;
  }

  computeIfAbsent(key: K, factory: (k: K) => V) {
    let m = this.map;
    let skey: string;
    let old: V;
    if (key && (skey = this.ke(key))) {
      let prev = m[skey];
      old = prev ? prev[1] : null;
      if (old) {
        return old;
      }
      this.map[skey] = [key, (old = factory(key))];
      this._vals = null;
    }
    return old;
  }

  get(key: K): V {
    let m = this.map;
    let skey: string;
    let old: V;
    if (key && (skey = this.ke(key))) {
      let prev = m[skey];
      old = prev ? prev[1] : null;
    }
    return old;
  }

  remove(key: K): V {
    let m = this.map;
    let sk: string;
    let old: V;
    if (key && (sk = this.ke(key))) {
      let prev = m[sk];
      if (prev) {
        old = prev[1];
        delete m[sk];
        this._vals = null;
      }
      return old;
    }
  }

  contains(key: K): boolean {
    let m = this.map;
    let url: string;

    if (key && (url = this.ke(key)) && m[url]) {
      return true;
    }
    return false;
  }

  entrySet(): Array<[K, V]> {
    return Object.values(this.map);
  }

  vals(): Array<V> {
    return this._vals || (this._vals = this.entrySet().map(e => e[1]));
  }

  clear() {
    this.map = {};
  }

  isEmpty() {
    return Object.keys(this.map).length == 0;
  }
}
