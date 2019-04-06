# es-ops-ts
=================

#### A Typescript port of [es-ops](https://github.com/cmuramoto/es-ops) supporting easy CRUD operations on typed Models.

### Core Interface

```typescript

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



```

## Examples

### Basic Crud

Consider the following model to be indexed on ElasticSearch:

```typescript
class LeDoc {
  path!: string;
  length!: number;
  creationTime!: Date;

  json() {
    return JSON.stringify(this);
  }

  equals(o: LeDoc): boolean {
    return (
      o.path == this.path &&
      o.length == this.length &&
      o.creationTime == this.creationTime
    );
  }
}
```

The first step to do CRUD on such model consists in getting an instance of **IElasticSearchOps** through the **OpsFactory** function:

```typescript
import { OpsFactory } from "../api/ies-ops";

const ops = OpsFactory("http://localhost:9200");
```

Next we must tell how to map the the raw object presented in **_source** field to an instance of **LeDoc**:

```typescript
const __LeDocProto = (new LeDoc() as any).__proto__;

const LeDocMapper = (o: any): LeDoc => {
  o.__proto__ = __LeDocProto;
  let ct = o.creationTime;
  o.creationTime = ct ? new Date(Date.parse(ct as string)) : ct;  
  return o as LeDoc;
};
```

Note that, in this case, only one object is instantiated to convert **string -> Date**. The root object is converted to the Model's type only by getting its prototype, which is almost a noop. The same logic can be extended to more complex object graphs.

Now we are ready to CRUD instances of LeDoc:

```typescript
import { Ids } from "../search/exports";
import { Status } from "../ops/result";

//Force index refresh after doc modification. 
//ElasticSearch, in default settings, takes about 1 second to makes changes visible
const refresh = async () => {
  let res = await ops.refresh("docs");

  console.log(res._shards.json());
};

const doBasicCrud = async () => {
  let doc = new LeDoc();
  doc.path = "/some/path";
  doc.length = 10000;
  doc.creationTime = new Date();

  //Create new Document in 'docs' index. Result will hold the status and id (if the operation succeeds) of the created doc.
  let res = await ops.insert("docs", doc);

  if (res.result != Status.created) {
    console.log(`Error. Expected ${Status.created} got ${res.result}`);
  }

  let id = res._id;

  console.log(`Created ${id}`);

  await refresh();

  let updatedPath = "/some/other/path";
  let toUpdate = new LeDoc();
  toUpdate.path = updatedPath;
  
  //In partial update we only need to send the fields we want to change. 
  //We could just assign doc.path=updatedPath and pass doc to the function, but this induces an extra overhead in ES backend 
  res = await ops.partialUpdate("docs", id, toUpdate);

  if (res.result != Status.updated) {
    console.log(`Error. Expected ${Status.updated} got ${res.result}`);
  }

  console.log(`Updated ${res._id}`);

  await refresh();

  //Confirm update by fetching again
  let rec = await ops.lookup("docs", id, LeDocMapper);

  if (rec == null) {
    console.log(`Unable to fetch ${id}`);
  } else {
    if (rec.path !== updatedPath) {
      console.log("Update failed");
    } else {
      console.log("Updated confirmed!");
    }
  }
};
```

### Querying

Every query in es-ops is encapsulated in the type **RootQuery**, which contains a single instance of **match**, **boolean**, **ids**, etc, of the supported query types, which are defined in:

```typescript
export enum Kind {
  bool = "bool",
  boosting = "boosting",
  common = "common",
  constant_score = "constant_score",
  dis_max = "dis_max",
  exists = "exists",
  function_score = "function_score",
  fuzzy = "fuzzy",
  has_child = "has_child",
  has_parent = "has_parent",
  ids = "ids",
  match = "match",
  match_all = "match_all",
  match_phrase = "match_phrase",
  match_phrase_prefix = "match_phrase_prefix",
  more_like_this = "more_like_this",
  multi_match = "multi_match",
  nested = "nested",
  parent_id = "parent_id",
  percolate = "percolate",
  prefix = "prefix",
  query_string = "query_string",
  range = "range",
  regexp = "regexp",
  script = "script",
  simple_query_string = "simple_query_string",
  template = "template",
  term = "term",
  terms = "terms",
  type = "type",
  wildcard = "wildcard"
}
```
(We use a="a" in order to instruct the ts compiler to translate enums as strings, which makes conversion to the final json easier).

Queries in es-ops are descendantes of

```typescript
export abstract class IQuery {
 
  abstract kind():Kind;

  kindName(): string {
    return this.kind();
  }

  rewrite(): any {
    return this;
  }

  asRoot(): RootQuery {
    let q = new RootQuery();
    let o: any = {};
    o[this.kind()] = this.rewrite();
    q.query = o;
    return q;
  }
}
```

For example, consider the simple **ids** query. In es-ops we can use it as:

```typescript
 let result = await ops.query(
    "docs",
    Ids.of("doc")
      .appendOrSet(id)
      .asRoot(),
    LeDocMapper
  );

  if (result.size() != 1) {
    console.log("Oops");
  } else {
    let qrec = result.first();

    if (qrec === rec) {
      console.log("Why same ptr?");
    }

    if (!qrec.equals(rec)) {
      console.log("Lookup!=query!!!");
    }
  }
```

Query operations will return an instance of 

```typescript
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

  scrollId(): string;
}
```
, which in turn will hold datasets of **Hit** instances containing at most 10.000 elements.

### Streaming Large Datasets

Large datasets in Elastic Search can be consumed using the Scroll API approach.

In typescript scrolls can easily be translated into generators, which will query the database **N+1**-times, where

```typescript
let ps = ...;//pagesize
let total = ...;//number of docs matched by a query
N= (int)(total)/(ps) + (total%ps ? 1 : 0)
```

The following scroll harness test sucessfully consumed an Index of 212.715.000 documents:

```typescript
import { RootQuery } from "../search/exports";
import { OpsFactory } from "../api/ies-ops";

const ops = OpsFactory("http://localhost:9201");

class PF {
  cpf: number;
  //...other fields
}

const __PF = (new PF() as any).__proto__;

const PFMapper = (o: any): PF => {
  o.__proto__ = __PF;
  return o as PF;
};

const humongous_stream = async () => {
  var q = RootQuery.matchAll();

  let ps = 10000;
  let count = 0;
  let total = 0;
  let loops = 0;
  let expectedLoops = 0;

  let stream = ops.stream("pf", q.limit(ps), PFMapper);

  let next = stream.next();

  // compiler won't let us use for(v of stream)
  for (const next of stream) {
    let v = await next;
    if (count == 0) {
      total = v.total();
      //1 extra since it takes a final round-trip to get an empty result
      expectedLoops = 1 + ~~(total / ps) + (total % ps ? 1 : 0);
      console.log(
        `Doc Count: ${total}. Expected Roundtrips: ${expectedLoops} (ps:${ps})`
      );
    }
    count += v.size();
    loops++;

    if (loops % 1000 == 0) {
      console.log(
        `[${new Date()}]: ${loops}/${expectedLoops} (${(
          (100 * loops) /
          expectedLoops
        ).toFixed(2)}%) roundtrips -- ${count}/${total} (${(
          (100 * count) /
          total
        ).toFixed(2)}%) Fetched`
      );
    }
  }

  q = RootQuery.matchAll();
  ops.count("pf", q).then(v => {
    console.log(count);

    if (v != count) {
      console.log(`Oops. Scroll Count != Query Count: (${count}!=${v})`);
    } else {
      console.log(`Scroll Count == Query Count: (${count}==${v})`);
    }

    if (expectedLoops != loops) {
      console.log(
        `Oops. Actual Roundtrips != Expected Roundtrips: (${loops}!=${expectedLoops})`
      );
    } else {
      console.log(
        `Actual Roundtrips == Expected Roundtrips: (${loops}==${expectedLoops})`
      );
    }
  });
};

humongous_stream();
```

Alternatively, if you are running Node 10+, you can run asyncStream with for/await for a more concise code:

```typescript
  let stream = ops.asyncStream("pf", q.limit(ps), PFMapper);

  for await (const v of stream) {
  //...
  }
```


### Creating Index with DynamicTemplates

### Bulk Inserts

IElasticSearchOps provides the following signature in order to handle large amounts of data to be indexed:

```typescript
bulkInsert<T>(
    index: string,
    docs: IterableIterator<T> | Array<T>,
    outputItems?: boolean,
    batch?: number,
    idFactory?: (o: T) => string,
    sink?: (src: T, dst: IGrowableBuffer) => void
  ): IterableIterator<Promise<IBulkInsertResult>>;
```

The optional parameters in this function carry the following semantics:

1. **outputItems**: Whether or not **IBulkInsertResult** should hold a reference to a list of ```{ _id: string; status: number }```. If ids are to be used after indexing docs, then pass true, otherwise pass false.
2. **batch**: How many docs should be buffered before invoking an insert operation. If batch is either not supplied or is negative, by default it will take the value of **1000**. If a value greater than 10000 is passed, batch will be fixed in **10000**. 
⋅⋅* This parameter controls the tradeoff between memory usage and database roundtrips, which will be equal to ```docs.length/batch + ((docs.length % batch)?1:0)```. The upper bound of **10000** was purposely introduced to preserve memory on both client and server sides. The increase for [Larger Batches](https://www.elastic.co/blog/benchmarking-rest-client-transport-client) is not as significant.
3. **idFactory**: Are the document id's generated by client code? If so, pass this function to send the ids to Elastic backend, else pass nothing to let Elastic auto-generate the ids.
4. **sink**: Customize how documents should be buffered. If nothing is provided this function behaves as ```(src: T, dst: IGrowableBuffer) => { dst.write(JSON.stringify(src);}```.
⋅⋅* The IGrowableBuffer interface was introduced in order to cope with the lack of typescript's native **Buffer** 'reset' support. A Bulk Insert operation will initially allocate a Buffer instance with **batch**x1024 bytes and fill it up to **batch** times with json data. If the buffer gets full, it will be copied to and replaced by a new one with **double** its size.

Example code:

```typescript
import { OpsFactory } from "../api/ies-ops";
import { Exists } from "../search/exports";
import { IBulkInsertResult } from "../ops/bulk_op_result";

const ops = OpsFactory("http://localhost:9200");
const index = "docs";

const refresh = async () => {
  let res = await ops.refresh("docs");

  console.log(`Refresh: ${res._shards.json()}`);
};

//Id Generation Support
class Sequence {
  static readonly DEFAULT: Sequence = new Sequence();

  static defaultNext() {
    return Sequence.DEFAULT.next();
  }

  val: number = 0;

  next(): number {
    return this.val++;
  }
}

//Custom field to avoid mixing up CustomDoc with other docs
const TAG = "superUniqueTagNameOfCustomDoc";

class CustomDoc {
  sequence: number = Sequence.defaultNext();
  superUniqueTagNameOfCustomDoc: string = "CD";
  timestamp: Date = new Date();
}

const makeDocsStream = function*(max: number) {
  for (let ix = 0; ix < max; ix++) {
    yield new CustomDoc();
  }
};

const run_bulk_insert = async (
  src:  IterableIterator<CustomDoc>
) => {
  //delete all docs that have 'superUniqueTagNameOfCustomDoc' field
  let del = await ops.deleteMatching(index, Exists.exists(TAG).asRoot());

  if (del.total > 0) {
    console.log(`Deleted ${del.total}`);
    await refresh();
  }

  let stream = ops.bulkInsert(index, src, false, 100, doc => "" + doc.sequence);

  let root: IBulkInsertResult = null;


  for (const pres of stream) {
    let res = await pres;

    /*
     * Reduce BulkInsert Result. This is not required and not advised if outputItems is set to true,
     * because it will concatenate every partial list of Item instances into a single one, which may
     * cause an OOM error.
     *
     * This is useful to accumulate the total time taken for all round trips as well as finding out wether 
     * an error has ocurred during the operation or not.
     */
    if (root) {
      root = root.merge(res);
    } else {
      root = res;
    }
  }

  return root;
};

const do_bulk_insert = async () => {
  let res = await run_bulk_insert(makeDocsStream(10000));
  console.log(`Merged Bulk Insert Status: ${JSON.stringify(res)}`);
  await refresh();
  let count = await ops.count(index,Exists.exists(TAG).asRoot());
  console.log(`Post Insert Count:${count}`);
};

do_bulk_insert();


```

**Note**: Bulk insert will synchronously traverse the **docs** stream during buffering. If it's used outside an async function, e.g., by collecting all promises into an array, it may consume resources of the main 'thread'.

### Bulk Updates

### Paging and Search After

