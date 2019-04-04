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


### Creating Index with DynamicTemplates

### Streaming Large Datasets

