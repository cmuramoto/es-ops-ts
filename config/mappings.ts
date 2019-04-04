import { IndexedType } from "./exports";

export class Mappings {
  static get(): Mappings {
    return new Mappings();
  }

  mappings?: Record<string, IndexedType>;

  add(name: string, index: IndexedType): Mappings {
    let m = this.mappings;
    if (!m) {
      m = this.mappings = {};
    }
    m[name] = index;
    return this;
  }

  defaultDisableAll(): Mappings {
    return this.withDefaults(IndexedType.get().disableAll());
  }

  public type(type: string): IndexedType | null {
    let m = this.mappings;
    return m ? m[type] : null;
  }

  unwrap(): Record<string, IndexedType> | undefined {
    return this.mappings;
  }

  public withDefaults(type: IndexedType): Mappings {
    return this.add("_default_", type);
  }

  json() {
    return JSON.stringify(this, null, "  ");
  }
}
