import { GeneralType, Type } from "./base";
import { Property } from "./property";

export class DynamicTemplate {
  static keywordDefaults(): DynamicTemplate {
    let dt = DynamicTemplate.of(GeneralType.string);
    dt.mapping = Property.get().withType(Type.keyword);
    return dt;
  }

  static of(type: GeneralType): DynamicTemplate {
    let dt = new DynamicTemplate();
    dt.match_mapping_type = type;
    return dt;
  }

  match_mapping_type!: GeneralType;

  match?: string;

  unmatch?: string;

  path_match?: string;

  path_unmatch?: string;

  match_pattern?: string;

  mapping?: Property;

  mappingTo(mapping: Property): DynamicTemplate {
    this.mapping = mapping;
    return this;
  }

  matching(match: string): DynamicTemplate {
    this.match = match;
    return this;
  }

  pathMatching(path_match: string): DynamicTemplate {
    this.path_match = path_match;
    return this;
  }

  pathUnMatching(path_unmatch: string): DynamicTemplate {
    this.path_unmatch = path_unmatch;
    return this;
  }

  unMatching(match: string): DynamicTemplate {
    this.unmatch = match;
    return this;
  }

  useJavaRegex(): DynamicTemplate {
    this.match_pattern = "regex";

    return this;
  }

  cleanUp(): DynamicTemplate {
    let o = this;
    if (!this.match_mapping_type) {
      delete o.match_mapping_type;
    }

    return o;
  }
}
