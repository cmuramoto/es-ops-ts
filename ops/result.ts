export enum Status {
  created = "created",
  deleted = "deleted",
  noop = "noop",
  not_found = "not_found",
  updated = "updated"
}

export class ShardStats {
  total!: number;
  successful!: number;
  failed!: number;
  
  json() {
    return JSON.stringify(this, null, "  ");
  }
}

export class Result {
  result!: Status;
  _shards!: ShardStats;
  _index!: string;
  _type!: string;
  _id!: string;
  _version!: number;
}

export class RefreshResult {
  _shards!: ShardStats;
}
