import { OpsFactory } from "../api/ies-ops";

const ops = OpsFactory("http://localhost:9200");

const infos = async () => {
  ops.info().then(info => {
    console.log(info.json());
  });
};

const mappings = async () => {
  ops.mappings("docs").then(v => {
    console.log(v.json());
    let doc = v.type("doc");
    if (doc) {
      console.log(doc.json());
    }
  });
};

const settings = async () => {
  ops.settings("docs").then(v => {
    console.log(v);
  });
};

infos()
  .then(_ => mappings().then(_ => settings()))
  .finally(() => ops.close());
