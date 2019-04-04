import { IQuery, Kind } from "./query";

export abstract class ILeafQuery extends IQuery {}

export class Exists extends ILeafQuery {
  readonly field: string;

  constructor(field: string) {
    super();
    this.field = field;
  }

  static exists(field: string): Exists {
    return new Exists(field);
  }
  kind(): Kind {
    return Kind.exists;
  }
}

export class Ids extends ILeafQuery {
  type: string;
  values?: Array<string>;

  constructor(type: string) {
    super();
    this.type = type;
  }

  static ids(...ids: string[]): Ids {
    return this.of("doc").appendOrSet(...ids);
  }

  static of(type: string): Ids {
    let ids = new Ids(type);
    ids.type = type;

    return ids;
  }

  append(...ids: Array<string>): Ids {
    let vals = this.values;
    if (!vals) {
      vals = this.values = [];
    }

    vals = vals.concat(ids);
    return this;
  }

  appendOrSet(...ids: Array<string>): Ids {
    if (!this.values) {
      this.values = ids;
    } else {
      this.append(...ids);
    }
    return this;
  }

  kind(): Kind {
    return Kind.ids;
  }
}

export class Match extends ILeafQuery {
  m: Record<string, any> = {};

  static query(field: string, text: string): Match {
    let rv = new Match();
    let m: Record<string, any> = {};
    m.put("query", text);
    rv.m[field] = m;

    return rv;
  }

  static simple(field: string, text: string): Match {
    let rv = new Match();
    rv.m[field] = text;
    return rv;
  }

  analyzer(which: string): Match {
    this.map().put("analyzer", which);

    return this;
  }

  private map(): Record<string, any> {
    let m = this.m["_"];
    if (!m) {
      this.m["_"] = m = {};
    }

    return m;
  }

  rewrite(): any {
    return this.m;
  }

  useAnd(): Match {
    this.map().put("operator", "and");
    return this;
  }

  useOr(): Match {
    this.map().put("operator", "or");
    return this;
  }

  kind(): Kind {
    return Kind.match;
  }
}

export class Range extends ILeafQuery {
  constructor(field: string) {
    super();
    this.field = field;
  }

  static range(term: string): Range {
    let r = new Range(term);
    return r;
  }

  field: string;
  _lt?: string | null;
  _lte?: string | null;
  _gt?: string | null;
  _gte?: string | null;
  boost?: number;
  format?: string;
  time_zone?: string;
  fmt?(d: string | Date): string;

  exact(val: any): Range {
    return this.lte(val).gte(val);
  }

  doFmt(date?: Date | string): string {
    let fmt = this.fmt;
    return date == null
      ? "now"
      : fmt == null
      ? typeof date == "string"
        ? date
        : date.toJSON()
      : fmt(date);
  }

  use(fmt: (d: any) => string): Range {
    this.fmt = fmt;

    return this;
  }

  gt(val?: Date | string): Range {
    this._gt = this.doFmt(val);
    this._gte = null;
    return this;
  }

  gte(val?: Date | string): Range {
    this._gte = this.doFmt(val);
    this._gt = null;
    return this;
  }

  lt(val?: Date | string): Range {
    this._lt = this.doFmt(val);
    this._lte = null;
    return this;
  }

  lte(val?: Date | string): Range {
    this._lte = this.doFmt(val);
    this._lt = null;
    return this;
  }

  isoDate(): Range {
    this.format = "yyyy-MM-dd";
    return this.use(dt => {
      let rv: string;
      if (typeof dt == "string") {
        rv = dt;
      } else {
        rv = dt
          .toLocaleDateString()
          .split("/")
          .reverse()
          .join("-");
      }

      return rv;
    });
  }

  isoDateTime(): Range {
    this.format = "yyyy-MM-dd'T'HH:mm:ss.SSS";
    return this.use(dt => {
      let rv: string;
      if (typeof dt == "string") {
        rv = dt;
      } else {
        rv = dt.toJSON().replace("Z", "");
      }

      return rv;
    });
  }

  isoTime(): Range {
    this.format = "HH:mm:ss.SSS";
    return this.use(dt => {
      let rv: string;
      if (typeof dt == "string") {
        rv = dt;
      } else {
        rv = dt.toJSON();
        rv = rv.substring(rv.indexOf("T") + 1, rv.indexOf("Z"));
      }

      return rv;
    });
  }

  rewrite(): any {
    let o: any = {};
    let t: any = {};
    Object.assign(t, this);
    o[t.field] = t;
    let v;

    if ((v = t._gt)) {
      delete t._gt;
      t.gt = v;
    }

    if ((v = t._gte)) {
      delete t._gte;
      t.gte = v;
    }

    if ((v = t._lt)) {
      delete t._lt;
      t.lt = v;
    }

    if ((v = t._lte)) {
      delete t._lte;
      t.lte = v;
    }

    delete t.field;
    delete t.fmt;
    return o;
  }

  kind(): Kind {
    return Kind.range;
  }
}

export class Term extends ILeafQuery {
  static of(field: string, value: string): Term {
    let rv = new Term();
    let o: Record<string, string> = {};
    o.field = value;
    rv.term = o;
    return rv;
  }

  term?: Record<string, string>;

  boost?: number;

  rewrite(): any {
    let o: any = { ...this.term };

    if (this.boost) {
      o.boost = this.boost;
    }

    return o;
  }

  kind(): Kind {
    return Kind.term;
  }
}

export class Terms<T> extends ILeafQuery {
  static terms<T>(term: string, values: Array<T>): Terms<T> {
    let rv = new Terms<T>();
    let o: Record<string, Array<T>> = {};
    o[term] = values;
    rv.terms = o;

    return rv;
  }

  terms?: Record<string, Array<T>>;

  rewrite(): any {
    return this.terms;
  }

  kind(): Kind {
    return Kind.terms;
  }
}

export class WildCard extends ILeafQuery {
  term: string;
  value: string;

  constructor(term: string, value: string) {
    super();
    this.term = term;
    this.value = value;
  }

  static wildcard(term: string, value: string): WildCard {
    return new WildCard(term, value);
  }

  rewrite(): any {
    let o: any = {};
    o[this.term] = this.value;
    return o;
  }

  kind(): Kind {
    return Kind.wildcard;
  }
}
