import { Sort } from "./sort";

export class RootQuery {
  from?: number;
  size?: number;
  //@JsonIgnore
  scrollTTL?: number;
  _source?: boolean;

  //UpdateStatement.Script script;

  query?: any;

  sort?: Array<Record<string, Sort>>;

  search_after?: Array<any>;

  aggs?: any;

  static matchAll(): RootQuery {
    let rv = new RootQuery();
    rv.query = {
      match_all: {}
    };
    return rv;
  }

  startingAt(v: number): RootQuery {
    this.from = v;
    return this;
  }

  limit(v: number): RootQuery {
    this.size = v;
    return this;
  }

  json(): string {
    let o = this.cleanUp();
    return JSON.stringify(o);
  }

  cleanUp(): any {
    let o = {
      ...this
    };
    delete o.scrollTTL;
    return o;
  }

  scrollTtlOrDefault(): number {
    let ttl = this.scrollTTL;
    return !ttl || ttl < 1 ? 60 : ttl;
  }
}