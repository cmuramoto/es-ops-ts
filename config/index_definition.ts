import { Settings } from "./settings"
import { IndexedType } from "./indexed_type"
import { Mappings } from "./mappings"

export class IndexDefinition {
  json(): string | Buffer {
    return JSON.stringify(this.cleanUp(), null, "  ")
  }
  cleanUp(): IndexDefinition {
    let m = this.mappings
    if (m) {
      Object.values(m).forEach(t => t.cleanUp())
    }

    return this
  }
  public static get(): IndexDefinition {
    return new IndexDefinition()
  }

  settings?: Settings

  mappings?: Record<string, IndexedType>

  withMappings(m: Mappings): IndexDefinition {
    this.mappings = m.unwrap()
    return this
  }

  withSettings(s: Settings): IndexDefinition {
    this.settings = s
    return this
  }
}
