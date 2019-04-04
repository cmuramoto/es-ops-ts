export class Hit<T> {
  id: string;
  _source: T;

  constructor(id: string, source: T) {
    this.id = id;
    this._source = source;
  }
}

export class Hits<T> {
  total: number;
  hits: Array<Hit<T>>;

  constructor(total: number, hits: Array<Hit<T>>) {
    this.total = total;
    this.hits = hits;
  }
}

