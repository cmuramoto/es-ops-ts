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

type Index = { _id: string; status: number };

export class Item {
  index: Index;

  id(): string {
    return this.index ? this.index._id : null;
  }

  status(): number {
    return this.index ? this.index.status : null;
  }
}

export interface IBulkInsertResult {
  hasErrors(): boolean;
  getItems(): Array<Item>;
  taken(): number;
  merge(other: IBulkInsertResult): IBulkInsertResult;
}

class Shallow implements IBulkInsertResult {
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
  merge(other: IBulkInsertResult): IBulkInsertResult {
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

  merge(other: IBulkInsertResult): IBulkInsertResult {
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

export const BulkOpResultFactory = (
  o: any,
  deep: boolean
): IBulkInsertResult => {
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

  return o as IBulkInsertResult;
};
