import { OpsFactory } from "../api/ies-ops";

import { RootQuery } from "../search/exports";
import { IndexedType } from "../config/exports";

const ops = OpsFactory("http://localhost:9200");

const infos = () => {
  ops.info().then(info => {
    console.log(info.json());
  });
};

const mappings = () => {
  ops.mappings("docs").then(v => {
    console.log(v.json());
    let doc = v.type("doc");
    if (doc) {
      console.log(doc.json());
    }
  });
};

const settings = () => {
  ops.settings("docs").then(v => {
    console.log(v);
  });
};

infos();
mappings();
settings();
