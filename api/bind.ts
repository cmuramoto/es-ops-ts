import {
  Mappings,
  IndexedType,
  Source,
  Property,
  DynamicTemplate,
  NodeInfo,
  VersionInfo,
  Settings
} from "../config/exports";

import { Result, RefreshResult, ShardStats } from "../ops/exports";

const __Mappings = new Mappings();
const __Settings = new Settings();
const __IndexedType = new IndexedType();
const __Source = new Source();
const __Property = new Property();
const __DynamicTemplate = new DynamicTemplate();
const __NodeInfo = new NodeInfo();
const __VersionInfo = new VersionInfo();
//
const __Result = new Result();
const __RefreshResult = new RefreshResult();
const __ShardsStats = new ShardStats();

const protoAssign = <T>(dst: any, src: T) => {
  if (dst) {
    dst.__proto__ = (src as any).__proto__;
  }
  return dst as T;
};

export class Converter {
  static castToRefreshResult(o: any): RefreshResult {
    let rv = protoAssign(o, __RefreshResult);
    protoAssign(rv._shards, __ShardsStats);
    return rv;
  }
  static castToResult(o: any): Result {
    let rv = protoAssign(o, __Result);

    return rv;
  }

  static castToSettings(o: any): Settings {
    let rv = protoAssign(o, __Settings);

    return rv;
  }
  static castToMapping(o: any): Mappings {
    let rv = protoAssign(o, __Mappings);
    let p = rv.unwrap();

    if (p) {
      Object.values(p as any).forEach(v => {
        let it = protoAssign(v, __IndexedType);
        protoAssign(it._source, __Source);
        let props = it.properties;
        if (props) {
          Object.values(props as any).forEach(prop => {
            Converter.castToProperty(prop);
          });
        }

        let dt = it.dynamic_templates as [];
        if (dt) {
          dt.forEach(dtt => {
            protoAssign(Object.values(dtt)[0], __DynamicTemplate);
          });
        }
      });
    }

    return rv;
  }

  static castToProperty(o: any): Property {
    let rv = protoAssign(o, __Property);

    let q = rv.fields;
    if (q) {
      Object.entries(q as any).forEach(f => {
        Converter.castToProperty(f);
      });
    }
    q = rv.properties;
    if (q) {
      Object.entries(q as any).forEach(f => {
        Converter.castToProperty(f);
      });
    }

    return rv;
  }

  static castToNodeInfo(o: any): NodeInfo {
    let rv = protoAssign(o, __NodeInfo);

    let v = rv.version;
    if (v) {
      protoAssign(v, __VersionInfo);
    }

    return rv;
  }
}
