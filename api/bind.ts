import {
  Mappings,
  IndexedType,
  Source,
  Property,
  DynamicTemplate,
  NodeInfo,
  VersionInfo,
  Settings
} from "../config/exports"

import { Result, RefreshResult, ShardStats } from "../ops/exports"

const __Mappings = Mappings.prototype
const __Settings = Settings.prototype
const __IndexedType = IndexedType.prototype
const __Source = Source.prototype
const __Property = Property.prototype
const __DynamicTemplate = DynamicTemplate.prototype
const __NodeInfo = NodeInfo.prototype
const __VersionInfo = VersionInfo.prototype
//
const __Result = Result.prototype
const __RefreshResult = RefreshResult.prototype
const __ShardsStats = ShardStats.prototype

const castTo = <T>(dst: any, proto: T) => {
  if (dst) {
    dst.__proto__ = proto
  }
  return dst as T
}

export class Converter {
  static castToRefreshResult(o: any): RefreshResult {
    let rv = castTo(o, __RefreshResult)
    castTo(rv._shards, __ShardsStats)
    return rv
  }
  static castToResult(o: any): Result {
    let rv = castTo(o, __Result)

    return rv
  }

  static castToSettings(o: any): Settings {
    let rv = castTo(o, __Settings)

    return rv
  }
  static castToMapping(o: any): Mappings {
    let rv = castTo(o, __Mappings)
    let p = rv.unwrap()

    if (p) {
      Object.values(p as any).forEach(v => {
        let it = castTo(v, __IndexedType)
        castTo(it._source, __Source)
        let props = it.properties
        if (props) {
          Object.values(props as any).forEach(prop => {
            Converter.castToProperty(prop)
          })
        }

        let dt = it.dynamic_templates as []
        if (dt) {
          dt.forEach(dtt => {
            castTo(Object.values(dtt)[0], __DynamicTemplate)
          })
        }
      })
    }

    return rv
  }

  static castToProperty(o: any): Property {
    let rv = castTo(o, __Property)

    let q = rv.fields
    if (q) {
      Object.entries(q as any).forEach(f => {
        Converter.castToProperty(f)
      })
    }
    q = rv.properties
    if (q) {
      Object.entries(q as any).forEach(f => {
        Converter.castToProperty(f)
      })
    }

    return rv
  }

  static castToNodeInfo(o: any): NodeInfo {
    let rv = castTo(o, __NodeInfo)

    let v = rv.version
    if (v) {
      castTo(v, __VersionInfo)
    }

    return rv
  }
}
