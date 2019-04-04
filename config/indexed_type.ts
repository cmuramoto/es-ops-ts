import { Source } from "./source";
import { Property } from "./property";
import { DynamicTemplate } from "./dynamic_template";

type All = { enabled: boolean };

export class IndexedType {
  static get(): IndexedType {
    return new IndexedType();
  }

  _source?: Source;
  _all?: All;
  dynamic?: boolean;
  properties?: Record<string, Property>;
  dynamic_templates?: Record<string, DynamicTemplate>[];
  //dynamic_date_formats?: Set<string>;
  dynamic_date_formats?: Array<string>;

  add(name: string, prop: Property): IndexedType {
    let p = this.properties;
    if (!p) {
      p = this.properties = {};
    }
    p[name] = prop;

    return this;
  }

  autoDetectingDatesWith(...patterns: string[]): IndexedType {
    let formats = this.dynamic_date_formats;
    if (!formats) {
      formats = this.dynamic_date_formats = [];
    }
    for (let p in patterns) {
      if (formats.indexOf(patterns[p]) < 0) {
        formats.push(patterns[p]);
      }
    }

    return this;
  }

  disableAll(): IndexedType {
    this._all = { enabled: false };
    return this;
  }

  enableAll(): IndexedType {
    this._all = { enabled: true };
    return this;
  }

  asDynamic(): IndexedType {
    this.dynamic = true;
    return this;
  }

  props(): Record<string, Property> | undefined {
    return this.properties;
  }

  with(source: Source): IndexedType {
    this._source = source;
    return this;
  }

  withTemplate(label: string, template: DynamicTemplate): IndexedType {
    let templates = this.dynamic_templates;
    if (!templates) {
      templates = this.dynamic_templates = [];
    }
    let o: Record<string, DynamicTemplate> = {};
    o[label] = template;
    templates.push(o);

    return this;
  }

  cleanUp(): IndexedType {
    let dts = this.dynamic_templates;
    let fmts = this.dynamic_date_formats;
    if (!fmts || fmts.length == 0) {
      delete this.dynamic_date_formats;
    }

    if (dts) {
      dts.forEach(r => {
        if (r) {
          let dt = Object.values(r)[0];
          if (dt) {
            dt.cleanUp();
          }
        }
      });
    }

    return this;
  }

  json() {
    return JSON.stringify(this, null, "  ");
  }
}
