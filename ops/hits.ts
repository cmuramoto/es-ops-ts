export class Hit<T> {
  _id: string
  _source: T

  constructor(id: string, source: T) {
    this._id = id
    this._source = source
  }

  id(): string {
    return this._id
  }

  source(): T {
    return this._source
  }

  tuple(): [string, T] {
    return [this._id, this._source]
  }
}

export class Hits<T> {
  total: number
  hits: Array<Hit<T>>

  constructor(total: number, hits: Array<Hit<T>>) {
    this.total = total
    this.hits = hits
  }
}
