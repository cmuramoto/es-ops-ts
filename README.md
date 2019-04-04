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

  count(index: string, q: RootQuery): Promise<number>;
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

```
N= (int)(number of docs matched by a query)/(page size) + ((number of docs matched by a query)%(size of ppage size)?1:0)
```

The following scroll harness test sucessfully consumed an Index of 212.715.000 documents:

```typescript
import { RootQuery } from "../search/exports";
import { OpsFactory } from "../api/ies-ops";

const ops = OpsFactory("http://localhost:9201");

class PF {
  cpf: number;
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

  while (next && !next.done) {
    let v = await next.value;
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

    //console.log(v);
    next = stream.next();
  }

  q = RootQuery.matchAll();
  ops.count("pf", q).then(v => {
    console.log(count);

    if (v != count) {
      console.log(`FUCK. Scroll Count != Query Count: (${count}!=${v})`);
    } else {
      console.log(`Scroll Count == Query Count: (${count}==${v})`);
    }

    if (expectedLoops != loops) {
      console.log(
        `FUCK. Actual Roundtrips != Expected Roundtrips: (${loops}!=${expectedLoops})`
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


### Creating Index with DynamicTemplates

### Bulk Inserts

### Bulk Updates

### Paging and Search After

