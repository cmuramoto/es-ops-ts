import {
  Mappings,
  Settings,
  IndexDefinition,
  NodeInfo
} from "../config/exports"

import {
  Result,
  SearchResultFactory,
  RefreshResult,
  ISearchResult,
  IBulkOpResult,
  UpdateStatement,
  BulkOpResultFactory,
  BulkDeleteResult,
  UpdateByQueryOptions,
  UpdateByQueryResult,
  IGrowableBuffer,
  GrowableBuffer
} from "../ops/exports"

import { Converter } from "./bind"
import { RootQuery, Scroll } from "../search/exports"

import {
  IEndpointSelector,
  EndpointSelectorFactory,
  ActiveDispatch,
  concatPaths
} from "../util/exports"

//TODO
const DEFAULT_DOC_TYPE = "doc"

const BASE_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._source,hits.hits._id,hits.total,aggregations"

const FILTER_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._id,hits.total,aggregations"

const SCROLL_SEARCH_PARAMS =
  "_search?filter_path=took,_shards,timed_out,hits.hits._source,hits.hits._id,hits.total,_scroll_id&scroll="

const SCROLL_PATH = "_search/scroll"

const projectionPath = (
  endpoint: string,
  ttl?: number,
  ...fields: string[]
) => {
  let sb = endpoint
  if (!sb.endsWith("/")) {
    sb += "/"
  }
  sb += FILTER_SEARCH_PARAMS
  sb += ",hits.hits._source"

  if (ttl && ttl > 0) {
    sb += ",_scroll_id&scroll="
    sb += ttl + "s"
  }

  sb += "&_source_include"
  sb += fields.join(",")

  return sb
}

export interface IElasticSearchOps {
  mappings(index: string): Promise<Mappings>
  settings(index: string): Promise<Settings>
  info(): Promise<NodeInfo>
  exists(index: string): Promise<boolean>
  deleteIndex(index: string): Promise<boolean>
  createIndex(index: string, definition: IndexDefinition): Promise<boolean>

  insertRaw(index: string, payload: string | Buffer): Promise<Result>
  insert<T>(index: string, payload: T): Promise<Result>

  partialUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result>
  partialUpdate<T>(index: string, id: string, payload: T): Promise<Result>

  saveOrUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result>
  saveOrUpdate<T>(index: string, id: string, payload: T): Promise<Result>

  refresh(index: string): Promise<RefreshResult>

  lookup<T>(
    index: string,
    id: string,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<T>

  queryRaw(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<ISearchResult<any>>
  query<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>>

  stream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>>

  asyncStream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>>

  count(index: string, q: RootQuery): Promise<number>

  bulkInsert<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdate<T>(
    index: string,
    docs: IterableIterator<[string, T]> | Array<[string, T]>,
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdateDocs<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  updateByQuery(
    index: string,
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult>

  deleteFields(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<UpdateByQueryResult>

  deleteMatching(index: string, q: RootQuery): Promise<BulkDeleteResult>

  bind(index: string): IIndexBound

  bindMapped<T>(index: string, mapper: (o: any) => T): IMappedBound<T>

  close(): void
}

export interface IMappedBound<T> {
  mappings(): Promise<Mappings>
  settings(): Promise<Settings>
  exists(): Promise<boolean>
  deleteIndex(): Promise<boolean>
  createIndex(definition: IndexDefinition): Promise<boolean>

  insertRaw(payload: string | Buffer): Promise<Result>
  insert(payload: T): Promise<Result>

  partialUpdateRaw(id: string, payload: string | Buffer): Promise<Result>

  partialUpdate(id: string, payload: T): Promise<Result>

  saveOrUpdateRaw(id: string, payload: string | Buffer): Promise<Result>
  saveOrUpdate(id: string, payload: T): Promise<Result>

  refresh(): Promise<RefreshResult>

  lookup(id: string, ...fields: string[]): Promise<T>

  queryRaw(q: RootQuery, ...fields: string[]): Promise<ISearchResult<any>>

  query(q: RootQuery, ...fields: string[]): Promise<ISearchResult<T>>

  stream(
    q: RootQuery,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>>

  asyncStream(
    q: RootQuery,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>>

  count(q: RootQuery): Promise<number>

  bulkInsert(
    docs: IterableIterator<T> | Array<T>,
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdate(
    docs: IterableIterator<[string, T]> | Array<[string, T]>,
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdateDocs(
    docs: IterableIterator<T> | Array<T>,
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  updateByQuery(
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult>

  deleteFields(q: RootQuery, ...fields: string[]): Promise<UpdateByQueryResult>

  deleteMatching(q: RootQuery): Promise<BulkDeleteResult>
}

export interface IIndexBound {
  mappings(): Promise<Mappings>
  settings(): Promise<Settings>
  exists(): Promise<boolean>
  deleteIndex(): Promise<boolean>
  createIndex(definition: IndexDefinition): Promise<boolean>

  insertRaw(payload: string | Buffer): Promise<Result>
  insert<T>(payload: T): Promise<Result>

  partialUpdateRaw(id: string, payload: string | Buffer): Promise<Result>

  partialUpdate<T>(id: string, payload: T): Promise<Result>

  saveOrUpdateRaw(id: string, payload: string | Buffer): Promise<Result>
  saveOrUpdate<T>(id: string, payload: T): Promise<Result>

  refresh(): Promise<RefreshResult>

  lookup<T>(id: string, mapper: (o: any) => T, ...fields: string[]): Promise<T>

  queryRaw(q: RootQuery, ...fields: string[]): Promise<ISearchResult<any>>

  query<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>>

  stream<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>>

  asyncStream<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>>

  count(q: RootQuery): Promise<number>

  bulkInsert<T>(
    docs: IterableIterator<T> | Array<T>,
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdate<T>(
    docs: IterableIterator<[string, T]> | Array<[string, T]>,
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  bulkUpdateDocs<T>(
    docs: IterableIterator<T> | Array<T>,
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>>

  updateByQuery(
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult>

  deleteFields(q: RootQuery, ...fields: string[]): Promise<UpdateByQueryResult>

  deleteMatching(q: RootQuery): Promise<BulkDeleteResult>
}

const singleProjection = (id: string, ...fields: string[]) => {
  if (!fields || fields.length == 0) {
    return id + "?filter_path=_source"
  } else {
    let sb = `${id}?filter_path=`
    sb += fields.map(f => `_source.${f}`).join(",")
    return sb
  }
}

class OpSupport {
  static *tupleWrap<T>(
    docs: IterableIterator<T> | T[],
    objToId: (o: T) => string
  ): IterableIterator<[string, T]> {
    for (const doc of docs) {
      yield [objToId(doc), doc]
    }
  }

  static *bulkInsert<T>(
    sel: IEndpointSelector,
    ctx: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems: boolean = false,
    _batch?: number,
    idFactory?: (o: any) => string,
    _sink?: (src: any, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>> {
    const pre = Buffer.from('{"index": {}}\n')
    const post = Buffer.from("\n")
    const sink = _sink
      ? _sink
      : (src: any, dst: IGrowableBuffer) => {
          dst.write(JSON.stringify(src))
        }
    const batch = Math.min(_batch && _batch > 0 ? _batch : 1000, 10000)

    const buffer = new GrowableBuffer(batch * 1024)

    let curr = 0

    for (const doc of docs) {
      let header = idFactory
        ? Buffer.from(`{"index":{"_id": "${idFactory(doc)}"}}\n`)
        : pre
      buffer.writeBuffer(header)
      sink(doc, buffer)
      buffer.writeBuffer(post)

      if (++curr >= batch) {
        let payload = buffer.slice()
        yield ActiveDispatch.doPostWithContingency(
          sel,
          ctx,
          (b: any) => BulkOpResultFactory(b, outputItems),
          payload
        )

        curr = 0
      }
    }

    if (curr) {
      let payload = buffer.slice()
      yield ActiveDispatch.doPostWithContingency(
        sel,
        ctx,
        (b: any) => BulkOpResultFactory(b, outputItems),
        payload
      )
    }
  }

  static *bulkUpdate<T>(
    sel: IEndpointSelector,
    ctx: string,
    docs: IterableIterator<[string, T]> | Array<[string, T]>,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems: boolean = false,
    _batch?: number
  ) {
    const batch = Math.min(_batch && _batch > 0 ? _batch : 1000, 10000)

    const buffer = new GrowableBuffer(batch * 1024)

    let curr = 0

    for (const doc of docs) {
      let stmt = factory(doc)
      stmt.writeTo(doc[0], buffer)

      if (++curr >= batch) {
        let payload = buffer.slice()
        yield ActiveDispatch.doPostWithContingency(
          sel,
          ctx,
          (b: any) => BulkOpResultFactory(b, outputItems),
          payload
        )

        curr = 0
      }
    }

    if (curr) {
      let payload = buffer.slice()
      yield ActiveDispatch.doPostWithContingency(
        sel,
        ctx,
        (b: any) => BulkOpResultFactory(b, outputItems),
        payload
      )
    }
  }
}

class ElasticSearchOps implements IElasticSearchOps {
  close(): void {
    this.sel.close()
  }
  bind(index: string): IIndexBound {
    return new IndexBound(index, this)
  }
  bindMapped<T>(index: string, mapper: (o: any) => T): IMappedBound<T> {
    return new MappedBound(index, this, mapper)
  }

  readonly sel: IEndpointSelector

  constructor(sel: IEndpointSelector) {
    this.sel = sel
  }

  deleteFields(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<UpdateByQueryResult> {
    return this.updateByQuery(
      index,
      q.updating(fields.map(f => `ctx._source.remove('${f}');`).join(""))
    )
  }
  updateByQuery(
    index: string,
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult> {
    let op = opts ? opts.toQueryString() : null
    let path = op
      ? `_update_by_query?${op}`
      : "_update_by_query?conflicts=proceed"
    path = concatPaths(index, path)

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      (b: any) => {
        let rv = new UpdateByQueryResult()
        Object.assign(rv, b)
        return rv
      },
      q.json()
    )
  }
  bulkUpdateDocs<T>(
    index: string,
    docs: IterableIterator<T> | T[],
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    let stream = OpSupport.tupleWrap(docs, objToId)
    return this.bulkUpdate(index, stream, factory, outputItems, batch)
  }

  bulkUpdate<T>(
    index: string,
    docs: IterableIterator<[string, T]> | [string, T][],
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    let ctx = concatPaths(index, DEFAULT_DOC_TYPE, "_bulk")
    let fac = factory ? factory : UpdateStatement.doc

    let batcher = OpSupport.bulkUpdate(
      this.sel,
      ctx,
      docs,
      fac,
      outputItems,
      batch
    )
    return batcher
  }

  deleteMatching(index: string, q: RootQuery): Promise<BulkDeleteResult> {
    let path = concatPaths(index, "_delete_by_query?conflicts=proceed")

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      BulkDeleteResult.wrap,
      q.json()
    )
  }

  bulkInsert<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems: boolean = false,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>> {
    let ctx = concatPaths(index, DEFAULT_DOC_TYPE, "_bulk")

    let batcher = OpSupport.bulkInsert(
      this.sel,
      ctx,
      docs,
      outputItems,
      batch,
      idFactory,
      sink
    )

    return batcher
  }

  asyncStream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>> {
    return this.createScroll(index, q, mapper, ...fields).asyncStream()
  }

  count(index: string, q: RootQuery): Promise<number> {
    let path = concatPaths(index, "_count?filter_path=count")

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      (b: any) => b.count as number,
      q.json()
    )
  }

  stream<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>> {
    return this.createScroll(index, q, mapper, ...fields).stream()
  }

  private createScroll<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Scroll<T> {
    let path: string
    let ttl = q.scrollTtlOrDefault()

    if (!fields || !fields.length) {
      path = concatPaths(index, `${SCROLL_SEARCH_PARAMS}${ttl}s`)
    } else {
      path = projectionPath(index, ttl, ...fields)
    }

    let rmapper = (r: any) => SearchResultFactory(r, mapper)

    let head = ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      rmapper,
      q.json()
    )

    let buffer = {
      scroll_id: "",
      scroll: `${ttl}s`
    }

    path = SCROLL_PATH

    let factory = (id: string) =>
      ActiveDispatch.doPostWithContingencyAndFactory(
        this.sel,
        path,
        () => {
          buffer.scroll_id = id
          return JSON.stringify(buffer)
        },
        rmapper
      )

    return new Scroll<T>(head, factory)
  }

  query<T>(
    index: string,
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>> {
    let path
    if (!fields || !fields.length) {
      path = concatPaths(index, BASE_SEARCH_PARAMS)
    } else {
      path = projectionPath(index, 0, ...fields)
    }

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      r => SearchResultFactory(r, mapper),
      q.json()
    )
  }

  queryRaw(
    index: string,
    q: RootQuery,
    ...fields: string[]
  ): Promise<ISearchResult<any>> {
    return this.query<any>(
      index,
      q,
      r => SearchResultFactory(r, o => o),
      ...fields
    )
  }

  exists(index: string): Promise<boolean> {
    let path = index
    return ActiveDispatch.doHeadWithContingency(this.sel, path, _ => {
      return true
    }).then(o => (o ? o : false))
  }

  deleteIndex(index: string): Promise<boolean> {
    return this.exists(index).then(e => {
      if (e) {
        let path = index
        return ActiveDispatch.doDeleteWithContingency(
          this.sel,
          path,
          _ => true
        ).catch(_ => false)
      } else {
        return false
      }
    })
  }
  createIndex(index: string, definition: IndexDefinition): Promise<boolean> {
    return this.exists(index).then(e => {
      if (e) {
        return false
      } else {
        let path = index

        return ActiveDispatch.doPutWithContingency(
          this.sel,
          path,
          _ => true,
          definition.json()
        )
      }
    })
  }
  lookup<T>(
    index: string,
    id: string,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<T> {
    let path = concatPaths(
      index,
      DEFAULT_DOC_TYPE,
      singleProjection(id, ...fields)
    )

    return ActiveDispatch.doGetWithContingency(this.sel, path, o => {
      let rv = o && o._source ? mapper(o._source) : null
      return rv
    })
  }
  refresh(index: string): Promise<RefreshResult> {
    let path = concatPaths(index, "_refresh")

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      Converter.castToRefreshResult
    )
  }

  insertRaw(index: string, payload: string | Buffer): Promise<Result> {
    let path = concatPaths(index, DEFAULT_DOC_TYPE)
    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      Converter.castToResult,
      payload
    )
  }
  partialUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result> {
    let path = `${index}/${DEFAULT_DOC_TYPE}/${id}/_update`

    return ActiveDispatch.doPostWithContingency(
      this.sel,
      path,
      Converter.castToResult,
      payload
    )
  }
  insert<T>(index: string, payload: T): Promise<Result> {
    return this.insertRaw(index, JSON.stringify(payload))
  }
  partialUpdate<T>(index: string, id: string, payload: T): Promise<Result> {
    let o: any = {}
    o["doc"] = payload
    return this.partialUpdateRaw(index, id, JSON.stringify(o))
  }
  saveOrUpdate<T>(index: string, id: string, payload: T): Promise<Result> {
    return this.saveOrUpdateRaw(index, id, JSON.stringify(payload))
  }
  saveOrUpdateRaw(
    index: string,
    id: string,
    payload: string | Buffer
  ): Promise<Result> {
    let path = concatPaths(index, DEFAULT_DOC_TYPE, id)

    return ActiveDispatch.doPutWithContingency(
      this.sel,
      path,
      Converter.castToResult,
      payload
    )
  }
  settings(index: string): Promise<Settings> {
    let path = concatPaths(index, "_settings")

    return ActiveDispatch.doGetWithContingency(this.sel, path, o => {
      ;(o = o[index]) && (o = o["settings"]) && (o = o["index"])
      return Converter.castToSettings(o)
    })
  }

  info(): Promise<NodeInfo> {
    return ActiveDispatch.doGetWithContingency(
      this.sel,
      null,
      Converter.castToNodeInfo
    )
  }

  mappings(index: string): Promise<Mappings> {
    let path = concatPaths(index, "_mappings")

    return ActiveDispatch.doGetWithContingency(this.sel, path, (o: any) =>
      Converter.castToMapping(o[index])
    )
  }
}

class IndexBound implements IIndexBound {
  readonly index: string
  readonly ops: IElasticSearchOps

  constructor(index: string, ops: IElasticSearchOps) {
    this.index = index
    this.ops = ops
  }

  mappings(): Promise<Mappings> {
    return this.ops.mappings(this.index)
  }
  settings(): Promise<Settings> {
    return this.ops.settings(this.index)
  }
  exists(): Promise<boolean> {
    return this.ops.exists(this.index)
  }
  deleteIndex(): Promise<boolean> {
    return this.ops.deleteIndex(this.index)
  }
  createIndex(definition: IndexDefinition): Promise<boolean> {
    return this.ops.createIndex(this.index, definition)
  }
  insertRaw(payload: string | Buffer): Promise<Result> {
    return this.ops.insertRaw(this.index, payload)
  }
  insert<T>(payload: T): Promise<Result> {
    return this.ops.insert(this.index, payload)
  }
  partialUpdateRaw(id: string, payload: string | Buffer): Promise<Result> {
    return this.ops.partialUpdateRaw(this.index, id, payload)
  }
  partialUpdate<T>(id: string, payload: T): Promise<Result> {
    return this.ops.partialUpdate(this.index, id, payload)
  }
  saveOrUpdateRaw(id: string, payload: string | Buffer): Promise<Result> {
    return this.ops.saveOrUpdateRaw(this.index, id, payload)
  }
  saveOrUpdate<T>(id: string, payload: T): Promise<Result> {
    return this.ops.saveOrUpdate(this.index, id, payload)
  }
  refresh(): Promise<RefreshResult> {
    return this.ops.refresh(this.index)
  }
  lookup<T>(
    id: string,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<T> {
    return this.ops.lookup(this.index, id, mapper, ...fields)
  }
  queryRaw(q: RootQuery, ...fields: string[]): Promise<ISearchResult<any>> {
    return this.ops.queryRaw(this.index, q, ...fields)
  }
  query<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): Promise<ISearchResult<T>> {
    return this.ops.query(this.index, q, mapper, ...fields)
  }
  stream<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>> {
    return this.ops.stream(this.index, q, mapper, ...fields)
  }
  asyncStream<T>(
    q: RootQuery,
    mapper: (o: any) => T,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>> {
    return this.ops.asyncStream(this.index, q, mapper, ...fields)
  }
  count(q: RootQuery): Promise<number> {
    return this.ops.count(this.index, q)
  }
  bulkInsert<T>(
    docs: IterableIterator<T> | T[],
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkInsert(
      this.index,
      docs,
      outputItems,
      batch,
      idFactory,
      sink
    )
  }
  bulkUpdate<T>(
    docs: IterableIterator<[string, T]> | [string, T][],
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkUpdate(this.index, docs, factory, outputItems, batch)
  }
  bulkUpdateDocs<T>(
    docs: IterableIterator<T> | T[],
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkUpdateDocs(
      this.index,
      docs,
      objToId,
      factory,
      outputItems,
      batch
    )
  }
  updateByQuery(
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult> {
    return this.ops.updateByQuery(this.index, q, opts)
  }
  deleteFields(
    q: RootQuery,
    ...fields: string[]
  ): Promise<UpdateByQueryResult> {
    return this.ops.deleteFields(this.index, q, ...fields)
  }
  deleteMatching(q: RootQuery): Promise<BulkDeleteResult> {
    return this.ops.deleteMatching(this.index, q)
  }
}

class MappedBound<T> implements IMappedBound<T> {
  readonly index: string
  readonly ops: IElasticSearchOps
  readonly mapper: (o: any) => T

  constructor(index: string, ops: IElasticSearchOps, mapper: (o: any) => T) {
    this.index = index
    this.ops = ops
    this.mapper = mapper
  }

  mappings(): Promise<Mappings> {
    return this.ops.mappings(this.index)
  }
  settings(): Promise<Settings> {
    return this.ops.settings(this.index)
  }
  exists(): Promise<boolean> {
    return this.ops.exists(this.index)
  }
  deleteIndex(): Promise<boolean> {
    return this.ops.deleteIndex(this.index)
  }
  createIndex(definition: IndexDefinition): Promise<boolean> {
    return this.ops.createIndex(this.index, definition)
  }
  insertRaw(payload: string | Buffer): Promise<Result> {
    return this.ops.insertRaw(this.index, payload)
  }
  insert<T>(payload: T): Promise<Result> {
    return this.ops.insert(this.index, payload)
  }
  partialUpdateRaw(id: string, payload: string | Buffer): Promise<Result> {
    return this.ops.partialUpdateRaw(this.index, id, payload)
  }
  partialUpdate<T>(id: string, payload: T): Promise<Result> {
    return this.ops.partialUpdate(this.index, id, payload)
  }
  saveOrUpdateRaw(id: string, payload: string | Buffer): Promise<Result> {
    return this.ops.saveOrUpdateRaw(this.index, id, payload)
  }
  saveOrUpdate<T>(id: string, payload: T): Promise<Result> {
    return this.ops.saveOrUpdate(this.index, id, payload)
  }
  refresh(): Promise<RefreshResult> {
    return this.ops.refresh(this.index)
  }

  lookup(id: string, ...fields: string[]): Promise<T> {
    return this.ops.lookup(this.index, id, this.mapper, ...fields)
  }
  queryRaw(q: RootQuery, ...fields: string[]): Promise<ISearchResult<any>> {
    return this.ops.queryRaw(this.index, q, ...fields)
  }
  query(q: RootQuery, ...fields: string[]): Promise<ISearchResult<T>> {
    return this.ops.query(this.index, q, this.mapper, ...fields)
  }
  stream(
    q: RootQuery,
    ...fields: string[]
  ): IterableIterator<Promise<ISearchResult<T>>> {
    return this.ops.stream(this.index, q, this.mapper, ...fields)
  }
  asyncStream(
    q: RootQuery,
    ...fields: string[]
  ): AsyncIterableIterator<ISearchResult<T>> {
    return this.ops.asyncStream(this.index, q, this.mapper, ...fields)
  }
  count(q: RootQuery): Promise<number> {
    return this.ops.count(this.index, q)
  }
  bulkInsert(
    docs: IterableIterator<T> | T[],
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkInsert(
      this.index,
      docs,
      outputItems,
      batch,
      idFactory,
      sink
    )
  }
  bulkUpdate(
    docs: IterableIterator<[string, T]> | [string, T][],
    factory?: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkUpdate(this.index, docs, factory, outputItems, batch)
  }
  bulkUpdateDocs(
    docs: IterableIterator<T> | T[],
    objToId: (o: T) => string,
    factory: (o: [string, T]) => UpdateStatement,
    outputItems?: boolean,
    batch?: number
  ): IterableIterator<Promise<IBulkOpResult>> {
    return this.ops.bulkUpdateDocs(
      this.index,
      docs,
      objToId,
      factory,
      outputItems,
      batch
    )
  }
  updateByQuery(
    q: RootQuery,
    opts?: UpdateByQueryOptions
  ): Promise<UpdateByQueryResult> {
    return this.ops.updateByQuery(this.index, q, opts)
  }
  deleteFields(
    q: RootQuery,
    ...fields: string[]
  ): Promise<UpdateByQueryResult> {
    return this.ops.deleteFields(this.index, q, ...fields)
  }
  deleteMatching(q: RootQuery): Promise<BulkDeleteResult> {
    return this.ops.deleteMatching(this.index, q)
  }
}

export const OpsFactory = (...urls: string[]): IElasticSearchOps => {
  //let sel = new UncheckedSelector(...urls);
  let sel = EndpointSelectorFactory(60000, ...urls)
  return new ElasticSearchOps(sel)
}
