import { OpsFactory } from "../api/ies-ops";
import { Ids } from "../search/exports";
import { Status } from "../ops/result";

const ops = OpsFactory("http://localhost:9200");

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

  clone(): LeDoc {
    let rv = new LeDoc();
    Object.assign(rv, this);
    return rv;
  }

  clear(): LeDoc {
    this.path = null;
    this.creationTime = null;
    this.length = null;
    return this;
  }
}

const refresh = async () => {
  let res = await ops.refresh("docs");

  console.log(res._shards.json());
};

const __LeDoc = (new LeDoc() as any).__proto__;

const LeDocMapper = (o: any): LeDoc => {
  o.__proto__ = __LeDoc;
  let ct = o.creationTime;
  o.creationTime = ct ? new Date(Date.parse(ct as string)) : ct;

  return o as LeDoc;
};

const doBasicCrud = async () => {
  let doc = new LeDoc();
  doc.path = "/some/path";
  doc.length = 10000;
  doc.creationTime = new Date();

  let res = await ops.insert("docs", doc);

  if (res.result != Status.created) {
    console.log(`Error. Expected ${Status.created} got ${res.result}`);
  }

  let id = res._id;

  console.log(`Created ${id}`);

  await refresh();

  let updatedPath = "/some/other/path";
  let updatedDoc = doc.clone().clear();
  updatedDoc.path = updatedPath;

  res = await ops.partialUpdate("docs", id, updatedDoc);

  if (res.result != Status.updated) {
    console.log(`Error. Expected ${Status.updated} got ${res.result}`);
  }

  console.log(`Updated ${res._id}`);

  await refresh();

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
};

doBasicCrud();
