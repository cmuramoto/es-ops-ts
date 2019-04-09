import { IGrowableBuffer } from "./buffer_sink";
import { Status } from "./exports";

const LINE_BREAK = Buffer.from("\n");

export class Retries {
  bulk: number;
  search: number;
}

export class BulkOperationResult {
  took: number;

  timed_out: boolean;

  updated: number;

  deleted: number;

  batches: number;

  version_conflicts: number;

  noops: number;

  retries: Retries;

  throttled_millis: number;

  requests_per_second: number;

  throttled_until_millis: number;

  total: number;

  task: string;

  json(pretty: boolean = false) {
    return pretty ? JSON.stringify(this, null, "  ") : JSON.stringify(this);
  }
}

export class BulkDeleteResult extends BulkOperationResult {
  failures: Array<any>;

  static wrap(o: any): BulkDeleteResult {
    let p = new BulkDeleteResult();
    Object.assign(p, o);
    return p;
  }
}

type Index = { _id: string; status: number; result: Status };

export class Item {
  index: Index;
  update: Index;

  id(): string {
    let v = this.index || this.update;
    return v ? v._id : null;
  }

  status(): number {
    let v = this.index || this.update;
    return v ? v.status : null;
  }
  result(): Status {
    let v = this.index || this.update;
    return v ? v.result : null;
  }
}

export interface IBulkOpResult {
  hasErrors(): boolean;
  getItems(): Array<Item>;
  taken(): number;
  merge(other: IBulkOpResult): IBulkOpResult;
}

class Shallow implements IBulkOpResult {
  took: number;
  errors: boolean;

  hasErrors(): boolean {
    return this.errors;
  }

  getItems(): Item[] {
    return [];
  }

  taken(): number {
    return this.took;
  }

  merge(other: IBulkOpResult): IBulkOpResult {
    this.errors = this.errors && other.hasErrors();
    this.took += other.taken();

    return this;
  }
}

class Deep extends Shallow {
  items: Array<Item>;

  getItems(): Item[] {
    return this.items;
  }

  merge(other: IBulkOpResult): IBulkOpResult {
    super.merge(other);

    let pi = this.getItems();
    let oi = other.getItems();

    if (pi == null) {
      this.items = oi || [];
    } else if (oi != null && oi.length > 0) {
      this.items = pi.concat(oi);
    }

    return this;
  }
}

const __Shallow = (new Shallow() as any).__proto__;
const __Deep = (new Deep() as any).__proto__;

export const BulkOpResultFactory = (o: any, deep: boolean): IBulkOpResult => {
  o.__proto__ = deep ? __Deep : __Shallow;

  if (!deep && o.items) {
    delete o.items;
  }

  if (typeof o.took == "string") {
    o.took = parseInt(o.took);
  }
  if (typeof o.errors == "string") {
    o.errors = "true" == o.errors;
  }

  return o as IBulkOpResult;
};

export class Header {
  _id: string;
  retry_on_conflict: number;
  _source: boolean;
  doc_as_upsert: boolean;

  clone(): Header {
    let o = { ...this };
    (o as any).__proto__ = (this as any).__proto__;

    return o as Header;
  }

  cloneWith(id: string) {
    let h = this.clone();
    h._id = id;
    return h;
  }
}

export abstract class UpdateStatement {
  body(): UpdateStatement {
    return this;
  }

  writeStatement(buffer: IGrowableBuffer): void {
    buffer.write(JSON.stringify(this.body()));
  }

  writeHeader(id: string, buffer: IGrowableBuffer): void {
    buffer.write(`{"update":{"_id": "${id}"}}\n`);
  }

  writeTo(id: string, buffer: IGrowableBuffer): void {
    this.writeHeader(id, buffer);
    this.writeStatement(buffer);
    buffer.writeBuffer(LINE_BREAK);
  }

  static doc(o: [string, any]): UpdateStatement {
    return new Doc(o[1]);
  }

  static docAndOpts(o: [string, any], h: Header): UpdateStatement {
    return new DocWithOptions(o, h);
  }

  static script(
    source: string,
    lang?: string,
    params?: Record<string, any>
  ): UpdateStatement {
    let rv = new Script();
    rv.source = source;

    if (lang) {
      rv.lang = lang;
    }

    if (params) {
      rv.params = params;
    }

    return rv;
  }

  static scriptWithOptions(
    source: string,
    h: Header,
    lang?: string,
    params?: Record<string, any>
  ): UpdateStatement {
    let rv = new ScriptWithOptions(h);
    rv.source = source;

    if (lang) {
      rv.lang = lang;
    }

    if (params) {
      rv.params = params;
    }

    return rv;
  }
}

abstract class WithOptions extends UpdateStatement {
  h: Header;

  constructor(h: Header) {
    super();
    this.h = h;
  }

  body(): UpdateStatement {
    let o = { ...this };
    delete o.h;
    return o;
  }

  writeHeader(id: string, buffer: IGrowableBuffer): void {
    buffer.write(JSON.stringify({ update: this.h.cloneWith(id) }));
    buffer.writeBuffer(LINE_BREAK);
  }
}

class DocWithOptions extends WithOptions {
  doc: any;

  constructor(doc: any, h: Header) {
    super(h);
    this.doc = doc;
  }
}

class Script extends UpdateStatement {
  source: string;
  lang: string;
  params: Record<string, any>;

  body(): any {
    return { script: this };
  }

  setParameter(key: string, val: any) {
    let p = this.params;
    if (!p) {
      p = this.params = {};
    }
    p[key] = val;
  }
}

class ScriptWithOptions extends WithOptions {
  source: string;
  lang: string;
  params: Record<string, any>;

  constructor(h: Header) {
    super(h);
  }

  body(): any {
    return { script: this };
  }

  setParameter(key: string, val: any) {
    let p = this.params;
    if (!p) {
      p = this.params = {};
    }
    p[key] = val;
  }
}

class Doc extends UpdateStatement {
  readonly doc: any;

  constructor(doc: any) {
    super();
    this.doc = doc;
  }
}

export class UpdateByQueryResult extends BulkOperationResult {
  failures: Array<any>;
}

export class UpdateByQueryOptions {
  conflicts: string = "proceed";
  pretty: boolean;
  refresh: boolean;
  wait_for_completion: boolean;
  wait_for_active_shards: boolean;
  timeout: boolean;
  slices: boolean;

  disableConcurrentUpdates(): UpdateByQueryOptions {
    delete this.conflicts;
    return this;
  }

  async(): UpdateByQueryOptions {
    this.wait_for_completion = false;
    return this;
  }

  private append(s: string, name: string, v: any): string {
    if (v) {
      if (s.length) {
        s += "&";
      }
      s += name;
      s += "=";
      s += v.toString();
    }
    return s;
  }

  toQueryString(): string {
    let s = "";
    Object.entries(this).forEach(([n, o]) => {
      s = this.append(s, n, o);
    });

    return s;
  }
}
