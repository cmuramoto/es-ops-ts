import { Hit, Hits } from "./hits";
import { ShardStats } from "./result";

export interface ISearchResult<T> {
  isComplete(): boolean;

  isEmpty(): boolean;

  isEmptyOrComplete(): boolean;

  scrollId(): string | null;

  total(): number;

  size(): number;

  first(): T | null;

  last(): T | null;

  idList(): Array<string>;

  values(): Array<T>;

  getHits(): Array<Hit<T>>;

  tuples(eager?: boolean): IterableIterator<[string, T]>;

  scrollId(): string;
}

const __Hits = new Hits(0, []);
const __Hit = new Hit("", {});

const tupleGen = function*(hits: Array<Hit<any>>) {
  if (hits) {
    for (var ix = 0; ix < hits.length; ix++) {
      let h = hits[ix];
      yield h.tuple();
    }
  }
};

const protoAssign = <T>(dst: any, src: T) => {
  if (dst) {
    dst.__proto__ = (src as any).__proto__;
  }
  return dst as T;
};

export class MappedSearchResult<T> implements ISearchResult<T> {
  lazyTuples(): IterableIterator<[string, T]> {
    throw new Error("Method not implemented.");
  }

  tuples(eager?: boolean): IterableIterator<[string, T]> {
    return (eager
      ? this.getHits().map(h => h.tuple())
      : tupleGen(this.getHits())) as IterableIterator<[string, T]>;
  }

  took!: number;
  _scroll_id!: string | null;
  timed_out!: boolean;
  _shards!: ShardStats;
  hits!: Hits<T>;

  isComplete(): boolean {
    let h = this.hits;
    let p: Array<Hit<T>>;
    let v = h && (p = h.hits) && p.length >= this.total();
    return v ? v : false;
  }
  isEmpty(): boolean {
    let h = this.hits;
    return !h || !h.hits || h.hits.length == 0;
  }
  isEmptyOrComplete(): boolean {
    return this.isEmpty() || this.isComplete();
  }
  scrollId(): string | null {
    return this._scroll_id ? this._scroll_id : null;
  }
  total(): number {
    return this.hits ? this.hits.total : 0;
  }
  size(): number {
    return this.getHits().length;
  }
  first(): T | null {
    let t = this.getHits();
    let v = t[0];

    return v ? v._source : null;
  }
  last(): T | null {
    let t = this.getHits();
    let v = t[t.length - 1];

    return v ? v._source : null;
  }
  
  idList(): string[] {
    return this.getHits().map(h => h._id);
  }

  values(): T[] {
    return this.getHits().map(h => h._source);
  }

  getHits(): Hit<T>[] {
    let h = this.hits;
    return h ? h.hits || [] : [];
  }

  static create<T>(r: any, mapper: (o: any) => T): MappedSearchResult<T> {
    let rv = new MappedSearchResult<T>();
    Object.assign(rv, r);
    let hits = rv.hits;

    if (hits) {
      protoAssign(hits, __Hits);
      let hhits = hits.hits;
      if (hhits) {
        hits.hits = hhits.map(h => {
          let o: any = h._source;
          let ht = protoAssign(h, __Hit) as Hit<T>;
          ht._source = mapper(o);

          return ht;
        });
      }
    }

    return rv;
  }
}
