import { Sort } from "./sort";
import { UpdateStatement } from "../ops/exports";

export class RootQuery {
  from!: number;
  size!: number;
  //@JsonIgnore
  scrollTTL!: number;
  _source!: boolean;

  //UpdateStatement.Script script;

  query!: any;

  sort!: Array<Record<string, Sort>>;

  search_after!: Array<any>;

  script!: UpdateStatement;

  aggs!: any;

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

  orderBy(term: string, s: Sort): RootQuery {
    let sort = this.sort;
    if (sort == null) {
      this.sort = sort = [];
    }
    let o: any = {};
    o[term] = s;
    sort.push(o);

    return this;
  }

  updating(
    source: string,
    lang?: string,
    params?: Record<string, any>
  ): RootQuery {
    this.script = UpdateStatement.script(source, lang, params);

    return this;
  }

  after(o: any, tiebreak?: any): RootQuery {
    let list = this.search_after;
    if (!list) {
      list = this.search_after = [];
    }
    list.push(o);
    if (tiebreak) {
      list.push(tiebreak);
    }
    return this;
  }
}
