import { IElasticSearchOps, OpsFactory } from "../api/ies-ops";
import {
  DynamicTemplate,
  GeneralType,
  IndexDefinition,
  Mappings,
  Property,
  Type,
  IndexedType
} from "../config/exports";

const ops = OpsFactory("http://localhost:9300","http://localhost:9200");

const DATE_PATTERNS = ["yyyy-MM-dd", "HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss.SSS"];

const IX_NAME = "le_index";

class IndexState {
  exists: boolean = false;
  created: boolean = false;
  deleted: boolean = false;

  json() {
    return JSON.stringify(this);
  }
}

const initializeIndex = async (
  index: string,
  ops: IElasticSearchOps
): Promise<IndexState> => {
  let rv = new IndexState();
  let exists = await ops.exists(index);
  rv.exists = exists;

  if (exists) {
    let deleted = await ops.deleteIndex(index);
    if (!deleted) {
      console.log("Unable to delete " + index);

      return rv;
    }
    rv.deleted = true;
  }

  console.log("Creating " + index);

  var analyzed = DynamicTemplate.of(GeneralType.string)
    .useJavaRegex()
    .matching("txt_.+")
    .mappingTo(Property.get().withType(Type.text));

  var nonIxFieldPaths = DynamicTemplate.of(null)
    .pathMatching("*no_ix*")
    .mappingTo(
      Property.get()
        .noIndex()
        .disabled()
        .noStore()
    );

  var indexed_strings = DynamicTemplate.of(GeneralType.string)
    .pathUnMatching("*no_ix*")
    .mappingTo(Property.get().withType(Type.keyword));

  let def = IndexDefinition.get().withMappings(
    Mappings.get()
      .defaultDisableAll()
      .withDefaults(
        IndexedType.get() //
          .asDynamic() //
          .autoDetectingDatesWith(...DATE_PATTERNS) //
          .withTemplate("analyzed", analyzed) //
          .withTemplate("no_ix_paths", nonIxFieldPaths) //
          .withTemplate("kw_only", indexed_strings)
      )
  );

  //console.log(def.json());

  let created = await ops.createIndex(index, def);

  rv.created = created;

  return rv;
};

const infos = () => {
  ops.info().then(info => {
    console.log(info.json());
  });
};

const mappings = () => {
  ops.mappings(IX_NAME).then(v => {
    console.log(v.json());
    let doc = v.type("doc");
    if (doc) {
      console.log(doc.json());
    }
  });
};

const settings = () => {
  ops.settings(IX_NAME).then(v => {
    console.log(v);
  });
};

const run = async () => {
  let state = await initializeIndex(IX_NAME, ops);

  console.log(state.json());

  state = await initializeIndex(IX_NAME, ops);

  console.log(state.json());

  infos();
  mappings();
  settings();
};

run();
