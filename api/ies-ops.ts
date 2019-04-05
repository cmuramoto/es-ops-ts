const unirest = require("unirest");

type HttpResponse = {
  status: number;
  body: {};
  raw_body: any;
  error: {} | PromiseLike<{}> | undefined;
};

import {
  DateFormat,
  GeneralType,
  Type,
  IndexOptions,
  StoreType,
  DynamicTemplate,
  Property,
  IndexedType,
  Source,
  Mappings,
  Settings,
  IndexDefinition,
  NodeInfo
} from "../config/exports";

import {
  Result,
  MappedSearchResult,
  RefreshResult,
  ISearchResult
} from "../ops/exports";

import { Converter } from "./bind";
import { RootQuery } from "../search/exports";
import { Scroll } from "../search/scroll";
import {
  IBulkInsertResult,
  BulkOpResultFactory,
  BulkOperationResult,
  BulkDeleteResult
} from "../ops/bulk_op_result";
import { IGrowableBuffer, GrowableBuffer } from "../ops/buffer_sink";

//TODO
const DEFAULT_DOC_TYPE = "doc";

const BASE_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._source,hits.hits._id,hits.total,aggregations";

const FILTER_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._id,hits.total,aggregations";

const SCROLL_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._source,hits.hits._id,hits.total,_scroll_id&scroll=";

const SCROLL_PATH = "_search/scroll";

const concat2 = (l: string, r: string) => {
  return l.endsWith("/") ? l + r : `${l}/${r}`;
};

const concat3 = (l: string, r: string, s: string) => {
  return l.endsWith("/")
    ? r.endsWith("/")
      ? l + r + s
      : `${l}${r}/${s}`
    : r.endsWith("/")
    ? `${l}/${r}${s}`
    : `${l}/${r}/${s}`;
};

const doGet = <T>(path: string, extract: (b: any) => T) => {
  return new Promise<T>((resolve, reject) => {
    unirest
      .get(path)
      .send()
      .end((res: HttpResponse) => {
        return resolve(extract(res.body));
      });
  });
};

enum HttpMethod {
  GET,
  PUT,
  POST,
  DELETE,
  HEAD
}

const prepareCall = (
  method: HttpMethod,
  url: string,
  buffer: string | Buffer | undefined
) => {
  let o;
  switch (method) {
    case HttpMethod.GET:
      o = unirest.get(url);
      break;
    case HttpMethod.PUT:
      o = unirest.put(url);
      break;
    case HttpMethod.POST:
      o = unirest.post(url);
      break;
    case HttpMethod.DELETE:
      o = unirest.delete(url);
      break;
    case HttpMethod.HEAD:
      o = unirest.head(url);
      break;
    default:
      throw "Unusupported " + method;
  }
  o = o.headers({
    "Content-Type": "application/json"
  });
  return buffer ? o.send(buffer) : o.send();
};

const tryExtractError = (err?: any) => {
  if (err) {
    try {
      return JSON.parse(err);
    } catch (e) {
      return err;
    }
    return null;
  }
};

const doHttpWithContingency = <T>(
  method: HttpMethod,
  hosts: string[],
  ctx: string,
  buffer: string | Buffer | undefined,
  extract: (b: any) => T,
  index: number = 0
) => {
  let curr = hosts[index];
  let rv: Promise<T>;

  if (!curr) {
    rv = Promise.reject("Exausted Hosts") as Promise<T>;
  } else {
    rv = new Promise<T>((resolve, reject) => {
      let path = concat2(curr, ctx);
      prepareCall(method, path, buffer).end((res: HttpResponse) => {
        //TODO better status handling
        if (res.error || res.status >= 400) {
          if (res.status) {
            resolve();
          } else {
            //Network error
            reject({
              host: curr,
              err: res.error,
              body: tryExtractError(res.raw_body)
            });
          }
        } else {
          resolve(extract(res.body));
        }
      });
    }) //
      .catch(e => {
        console.log(JSON.stringify(e));
        return doHttpWithContingency<T>(
          method,
          hosts,
          ctx,
          buffer,
          extract,
          index + 1
        );
      }) as Promise<T>;
  }

  return rv;
};

const doHttpWithContingencyAndFactory = <T>(
  method: HttpMethod,
  hosts: string[],
  ctx: string,
  factory: () => Buffer | string,
  extract: (b: any) => T,
  index: number = 0
) => {
  return doHttpWithContingency(method, hosts, ctx, factory(), extract, index);
};

const doGetWithContingency = <T>(
  hosts: string[],
  ctx: string,
  extract: (b: any) => T,
  buffer?: string | Buffer
) => doHttpWithContingency<T>(HttpMethod.GET, hosts, ctx, buffer, extract);

const doHeadWithContingency = <T>(
  hosts: string[],
  ctx: string,
  extract: (b: any) => T,
  buffer?: string | Buffer
) => doHttpWithContingency<T>(HttpMethod.HEAD, hosts, ctx, buffer, extract);

const doPostWithContingency = <T>(
  hosts: string[],
  ctx: string,
  extract: (b: any) => T,
  buffer?: string | Buffer
) => doHttpWithContingency<T>(HttpMethod.POST, hosts, ctx, buffer, extract);

const doPutWithContingency = <T>(
  hosts: string[],
  ctx: string,
  extract: (b: any) => T,
  buffer?: string | Buffer
) => doHttpWithContingency<T>(HttpMethod.PUT, hosts, ctx, buffer, extract);

const doDeleteWithContingency = <T>(
  hosts: string[],
  ctx: string,
  extract: (b: any) => T,
  buffer?: string | Buffer
) => doHttpWithContingency<T>(HttpMethod.DELETE, hosts, ctx, buffer, extract);

const projectionPath = (
  endpoint: string,
  ttl?: number,
  ...fields: string[]
) => {
  let sb = endpoint;
  if (!sb.endsWith("/")) {
    sb += "/";
  }
  sb += FILTER_SEARCH_PARAMS;
  sb += ",hits.hits._source";

  if (ttl && ttl > 0) {
    sb += ",_scroll_id&scroll=";
    sb += ttl + "s";
  }

  sb += "&_source_include";
  sb += fields.join(",");

  return sb;
};

export interface IElasticSearchOps {
  mappings(index: string): Promise<Mappings>;
  settings(index: string): Promise<Settings>;
  info(host?: string): Promise<NodeInfo>;
  exists(index: string): Promise<boolean>;
  deleteIndex(index: string): Promise<boolean>;
  createIndex(index: string, definition: IndexDefinition): Promise<boolean>;

  insertRaw(index: string, payload: string | Buffer): Promise<Result>;
  insert<T>(index: string, payload: T): Promise<Result>;

  partialUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result>;
  partialUpdate<T>(index: string, id: string, payload: T): Promise<Result>;

  saveOrUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result>;
  saveOrUpdate<T>(index: string, id: string, payload: T): Promise<Result>;

  refresh(index: string): Promise<RefreshResult>;

  lookup<T>(
    index: string,
    id: string,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<T>;

  queryRaw(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<ISearchResult<any>>;
  query<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>>;

  stream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>>;

  asyncStream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>>;

  count(index: string, q: RootQuery): Promise<number>;

  bulkInsert<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkInsertResult>>;

  deleteMatching(index: string, q: RootQuery): Promise<BulkDeleteResult>;
}

export interface IEndpointSelector {
  selectEndpoint(): string;
  endpoints(): Array<string>;
}

class SniffingSelector implements IEndpointSelector {
  _endpoints!: Array<string>;

  selectEndpoint(): string {
    throw new Error("Method not implemented.");
  }
  endpoints(): Array<string> {
    return this._endpoints;
  }
}

class UncheckedSelector implements IEndpointSelector {
  ix: number = 0;
  _endpoints: Array<string>;

  constructor(...endpoints: string[]) {
    this._endpoints = endpoints;
  }

  selectEndpoint(): string {
    let eps = this.endpoints();

    let next = this.ix++;
    if (next <= 0) {
      this.ix = next = 1;
    }

    return eps[next % eps.length];
  }

  endpoints(): Array<string> {
    return this._endpoints;
  }
}

const singleProjection = (id: string, ...fields: string[]) => {
  if (!fields || fields.length == 0) {
    return id + "?filter_path=_source";
  } else {
    let sb = `${id}?filter_path=`;
    sb += fields.map(f => `_source.${f}`).join(",");
    return sb;
  }
};

const insertBatcher = function*(
  hostFactory: () => string[],
  ctx: string,
  docs: IterableIterator<any> | Array<any>,
  outputItems: boolean = false,
  _batch?: number,
  idFactory?: (o: any) => string,
  _sink?: (src: any, dst: IGrowableBuffer) => void
) {
  const pre = Buffer.from('{"index": {}}\n');
  const post = Buffer.from("\n");
  const sink = _sink
    ? _sink
    : (src: any, dst: IGrowableBuffer) => {
        dst.write(JSON.stringify(src));
      };
  const batch = Math.min(_batch || 1000, 10000);

  const buffer = new GrowableBuffer(batch * 1024);

  let curr = 0;

  for (const doc of docs) {
    let header = idFactory
      ? Buffer.from(`{"index":{"_id": "${idFactory(doc)}"}}\n`)
      : pre;
    buffer.writeBuffer(header);
    sink(doc, buffer);
    buffer.writeBuffer(post);

    if (++curr >= batch) {
      let payload = buffer.slice();
      yield doPostWithContingency(
        hostFactory(),
        ctx,
        (b: any) => BulkOpResultFactory(b, outputItems),
        payload
      );

      curr = 0;
    }
  }

  if (curr) {
    let payload = buffer.slice();
    yield doPostWithContingency(
      hostFactory(),
      ctx,
      (b: any) => BulkOpResultFactory(b, outputItems),
      payload
    );
  }
};

class ElasticSearchOps implements IElasticSearchOps {
  deleteMatching(index: string, q: RootQuery): Promise<BulkDeleteResult> {
    let path = concat2(index, "_delete_by_query?conflicts=proceed");

    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      BulkDeleteResult.wrap,
      q.json()
    );
  }

  bulkInsert<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems: boolean = false,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkInsertResult>> {
    let ctx = concat3(index, DEFAULT_DOC_TYPE, "_bulk");
    let self = this;

    let batcher = insertBatcher(
      () => self.availableEndpoints(),
      ctx,
      docs,
      outputItems,
      batch,
      idFactory,
      sink
    );

    return batcher;
  }
  asyncStream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>> {
    return this.createScroll(index, q, mapper, ...fields).asyncStream();
  }

  count(index: string, q: RootQuery): Promise<number> {
    let path = concat2(index, "_count?filter_path=count");

    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      (b: any) => b.count as number,
      q.json()
    );
  }

  stream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>> {
    return this.createScroll(index, q, mapper, ...fields).stream();
  }

  private createScroll<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Scroll<T> {
    let path: string;
    let ttl = q.scrollTtlOrDefault();

    if (!fields || !fields.length) {
      path = concat2(index, `${SCROLL_SEARCH_PARAMS}${ttl}s`);
    } else {
      path = projectionPath(index, ttl, ...fields);
    }

    let rmapper = (r: any) => MappedSearchResult.create(r, mapper);

    let head = doPostWithContingency(
      this.availableEndpoints(),
      path,
      rmapper,
      q.json()
    );

    let buffer = {
      scroll_id: "",
      scroll: `${ttl}s`
    };

    path = SCROLL_PATH;

    let factory = (id: string) =>
      doHttpWithContingencyAndFactory(
        HttpMethod.POST,
        this.availableEndpoints(),
        path,
        () => {
          buffer.scroll_id = id;
          return JSON.stringify(buffer);
        },
        rmapper
      );

    return new Scroll<T>(head, factory);
  }

  query<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>> {
    let path;
    if (!fields || !fields.length) {
      path = concat2(index, BASE_SEARCH_PARAMS);
    } else {
      path = projectionPath(index, 0, ...fields);
    }

    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      r => MappedSearchResult.create(r, mapper),
      q.json()
    );
  }

  queryRaw(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<ISearchResult<any>> {
    return this.query<any>(
      index,
      q,
      r => MappedSearchResult.create(r, o => o),
      ...fields
    );
  }

  exists(index: string): Promise<boolean> {
    let path = index;
    return doHeadWithContingency(
      this.availableEndpoints(),
      path,
      _ => true
    ).catch(_ => false);
  }

  deleteIndex(index: string): Promise<boolean> {
    return this.exists(index).then(e => {
      if (e) {
        let path = index;
        return doDeleteWithContingency(
          this.availableEndpoints(),
          path,
          _ => true
        ).catch(_ => false);
      } else {
        return false;
      }
    });
  }
  createIndex(index: string, definition: IndexDefinition): Promise<boolean> {
    return this.exists(index).then(e => {
      if (e) {
        return false;
      } else {
        let path = index;

        return doPutWithContingency(
          this.availableEndpoints(),
          path,
          _ => true,
          definition.json()
        );
      }
    });
  }
  lookup<T>(
    index: string,
    id: string,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<T> {
    let path = concat3(
      index,
      DEFAULT_DOC_TYPE,
      singleProjection(id, ...fields)
    );

    return doGetWithContingency(this.availableEndpoints(), path, o => {
      let rv = o && o._source ? mapper(o._source) : null;
      return rv;
    });
  }
  refresh(index: string): Promise<RefreshResult> {
    let path = concat2(index, "_refresh");

    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      Converter.castToRefreshResult
    );
  }

  insertRaw(index: string, payload: string | Buffer): Promise<Result> {
    let path = concat2(index, DEFAULT_DOC_TYPE);
    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      Converter.castToResult,
      payload
    );
  }
  partialUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result> {
    let path = `${index}/${DEFAULT_DOC_TYPE}/${id}/_update`;

    return doPostWithContingency(
      this.availableEndpoints(),
      path,
      Converter.castToResult,
      payload
    );
  }
  insert<T>(index: string, payload: T): Promise<Result> {
    return this.insertRaw(index, JSON.stringify(payload));
  }
  partialUpdate<T>(index: string, id: string, payload: T): Promise<Result> {
    let o: any = {};
    o["doc"] = payload;
    return this.partialUpdateRaw(index, id, JSON.stringify(o));
  }
  saveOrUpdate<T>(index: string, id: string, payload: T): Promise<Result> {
    return this.saveOrUpdateRaw(index, id, JSON.stringify(payload));
  }
  saveOrUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result> {
    let path = concat3(index, DEFAULT_DOC_TYPE, id);

    return doPutWithContingency(
      this.availableEndpoints(),
      path,
      Converter.castToResult,
      payload
    );
  }
  settings(index: string): Promise<Settings> {
    let path = concat2(index, "_settings");

    return doGetWithContingency(this.availableEndpoints(), path, o => {
      (o = o[index]) && (o = o["settings"]) && (o = o["index"]);
      return Converter.castToSettings(o);
    });
  }

  info(host?: string | undefined): Promise<NodeInfo> {
    let h = host || this.selectEndpoint();

    return doGet(h, Converter.castToNodeInfo);
  }
  selector: IEndpointSelector;

  constructor(selector: IEndpointSelector) {
    this.selector = selector;
  }

  mappings(index: string): Promise<Mappings> {
    let path = concat2(index, "_mappings");

    return doGetWithContingency(this.availableEndpoints(), path, (o: any) =>
      Converter.castToMapping(o[index])
    );
  }

  selectEndpoint() {
    return this.selector.selectEndpoint();
  }

  availableEndpoints() {
    return this.selector.endpoints();
  }
}

export const OpsFactory = (...urls: string[]): IElasticSearchOps => {
  let sel = new UncheckedSelector(...urls);
  return new ElasticSearchOps(sel);
};
