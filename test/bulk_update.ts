import { OpsFactory } from "../api/ies-ops";
import { Exists, Sort, Bool, Range, RootQuery } from "../search/exports";
import { IBulkOpResult } from "../ops/exports";

const ops = OpsFactory("http://localhost:9500", "http://localhost:9200");
const index = "docs";

const refresh = async () => {
  let res = await ops.refresh("docs");

  console.log(`Refresh: ${res._shards.json()}`);
};

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

const TAG = "superUniqueTagNameOfCustomDoc";

class CustomDoc {
  sequence: number;
  superUniqueTagNameOfCustomDoc: string = "CD";
  timestamp: Date = new Date();
  mutable: number;
}

const __CustomDoc = (new CustomDoc() as any).__proto__;

const ObjToCustomDoc = (o: any): CustomDoc => {
  o.__proto__ = __CustomDoc;
  return o as CustomDoc;
};

const makeDocsArray = (max: number) => {
  let rv: CustomDoc[] = [];

  for (let ix = 0; ix < max; ix++) {
    const doc = new CustomDoc();
    doc.sequence = Sequence.defaultNext();
    doc.mutable = doc.sequence * 2;
    rv.push(doc);
  }

  return rv;
};

const run_bulk_insert = async (
  src: Array<CustomDoc> | IterableIterator<CustomDoc>
) => {
  let del = await ops.deleteMatching(index, Exists.exists(TAG).asRoot());

  if (del.total > 0) {
    console.log(`Deleted ${del.total}`);
    await refresh();
  }

  let stream = ops.bulkInsert(index, src, false, 100, doc => "" + doc.sequence);

  let root: IBulkOpResult = null;

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

const run_bulk_update = async (upTo: number) => {
  let q = await ops.query(
    index,
    Exists.exists(TAG)
      .asRoot()
      .limit(upTo)
      .orderBy("sequence", Sort.asc()),
    ObjToCustomDoc
  );

  //change internal state
  q.values().forEach(v => {
    v.mutable = v.sequence * 4;
  });

  let stream = await ops.bulkUpdate(index, q.tuples());

  let root: IBulkOpResult = null;

  for (const pres of stream) {
    let res = await pres;

    if (root) {
      root = root.merge(res);
    } else {
      root = res;
    }
  }

  return root;
};

const check_bulk_update = async (upTo: number) => {
  let must_be_updated = ops.stream(
    index,
    Exists.exists(TAG)
      .asRoot()
      .orderBy("sequence", Sort.asc()),
    ObjToCustomDoc
  );

  let upCount = 0;
  let notUpCount = 0;

  for (const o of must_be_updated) {
    let sr = await o;
    sr.values().forEach(v => {
      if (v.mutable == v.sequence * 4) {
        upCount++;
      }
    });
  }

  let must_not_be_updated = ops.stream(
    index,
    Bool.bool()
      .withFilter(Exists.exists(TAG), Range.range("sequence").gte(upTo))
      .asRoot()
      .orderBy("sequence", Sort.asc()),
    ObjToCustomDoc
  );

  for (const o of must_not_be_updated) {
    let sr = await o;
    sr.values().forEach(v => {
      if (v.mutable == v.sequence * 2) {
        notUpCount++;
      }
    });
  }

  let total = await ops.count(index, Exists.exists(TAG).asRoot());

  let msg: string;
  if (upCount + notUpCount != total) {
    msg = `Expected UpCount (${upCount}) + NotUpCount (${notUpCount}) != Total (${total})`;
  } else {
    msg = `Bulk Update Success: UpCount (${upCount}) + NotUpCount (${notUpCount}) == Total (${total})`;
  }

  return msg;
};

const do_update_by_query = async (upTo: number) => {
  await refresh();

  let expected_updates = await ops.count(
    index,
    Bool.bool()
      .withFilter(Exists.exists(TAG), Range.range("sequence").lt(upTo))
      .asRoot()
  );

  let total = await ops.count(index, Exists.exists(TAG).asRoot());

  console.log(`Expected updates: ${expected_updates}`);

  let res = await ops.deleteFields(
    index,
    Bool.bool()
      .withFilter(Exists.exists(TAG), Range.range("sequence").lt(upTo))
      .asRoot(),
    "mutable"
  );

  console.log(res.json());

  await refresh();

  let without_mutable = await ops.count(
    index,
    Bool.bool()
      .withFilter(Exists.exists(TAG))
      .withMustNot(Exists.exists("mutable"))
      .asRoot()
  );

  let with_mutable = await ops.count(
    index,
    Bool.bool()
      .withFilter(Exists.exists(TAG), Exists.exists("mutable"))
      .asRoot()
  );

  let msg: string;
  if (without_mutable + with_mutable != total) {
    msg = `Failed Update By Query:  Without Mutable (${without_mutable}) + With Mutable (${with_mutable}) != Total (${total})`;
  } else {
    msg = `Update By Query Success:  Without Mutable (${without_mutable}) + With Mutable (${with_mutable}) == Total (${total})`;
  }

  return msg;
};

const do_bulk_update = async () => {
  try {
    let res = await run_bulk_insert(makeDocsArray(10000));
    console.log(`Merged Bulk Insert Status: ${JSON.stringify(res)}`);
    await refresh();
    let count = await ops.count(index, Exists.exists(TAG).asRoot());
    console.log(`Post Insert Count:${count}`);

    res = await run_bulk_update(2000);
    console.log(`Merged Bulk Update Status: ${JSON.stringify(res)}`);
    await refresh();
    let check = await check_bulk_update(2000);
    console.log(check);

    check = await do_update_by_query(2000);
    console.log(check);
  } finally {
    ops.close();
  }
};

do_bulk_update().finally(() => ops.close());