import { DateFormat, IndexOptions, Type } from "./base";

export class Property {
  type?: Type;

  format?: DateFormat;

  enabled?: boolean;

  index?: boolean;

  store?: boolean;

  dynamic?: boolean;

  doc_values?: boolean;

  include_in_all?: boolean;

  index_options?: IndexOptions;

  fields?: Record<string, Property>;

  properties?: Record<string, Property>;

  analyzer?: string;

  search_analyzer?: string;

  static get(): Property {
    return new Property();
  }

  static keyword(): Property {
    let rv = Property.get();
    rv.type = Type.keyword;
    return rv;
  }

  static epochMillis(): Property {
    return Property.get()
      .withType(Type.date)
      .withFormat(DateFormat.epoch_millis);
  }

  withType(type: Type) {
    this.type = type;
    return this;
  }

  withFormat(fmt: DateFormat): Property {
    this.format = fmt;
    return this;
  }

  withOpts(opts: IndexOptions): Property {
    this.index_options = opts;
    return this;
  }

  add(name: string, prop: Property): Property {
    let p = this.properties;
    if (p == null) {
      p = this.properties = {};
    }
    p[name] = prop;

    return this;
  }

  analyzedWith(analyzer: string) {
    this.analyzer = analyzer;
    return this;
  }

  disabled(): Property {
    this.enabled = false;
    return this;
  }

  indexed(): Property {
    this.index = true;
    return this;
  }

  noIndex(): Property {
    this.index = false;
    return this;
  }

  nested(): Record<string, Property> | undefined {
    let t = this.fields;
    return t;
  }

  noDocValues(): Property {
    this.doc_values = false;
    return this;
  }

  notIndexed(): Property {
    this.index = false;
    return this;
  }

  noStore(): Property {
    this.store = false;
    return this;
  }
  searchedWith(analyzer: string): Property {
    this.analyzer = analyzer;
    return this;
  }

  stored(): Property {
    this.store = true;
    return this;
  }

  getType(): Type | undefined {
    return this.type;
  }

  withDocValues(): Property {
    this.doc_values = true;
    return this;
  }

  withSubField(name: string, prop: Property): Property {
    let p = this.fields;
    if (p == null) {
      p = this.fields = {};
    }
    p[name] = prop;

    return this;
  }
}
