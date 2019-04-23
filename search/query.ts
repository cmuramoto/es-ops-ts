import { RootQuery } from "./root_query"

export enum Kind {
  bool = "bool",
  boosting = "boosting",
  common = "common",
  constant_score = "constant_score",
  dis_max = "dis_max",
  exists = "exists",
  function_score = "function_score",
  fuzzy = "fuzzy",
  has_child = "has_child",
  has_parent = "has_parent",
  ids = "ids",
  match = "match",
  match_all = "match_all",
  match_phrase = "match_phrase",
  match_phrase_prefix = "match_phrase_prefix",
  more_like_this = "more_like_this",
  multi_match = "multi_match",
  nested = "nested",
  parent_id = "parent_id",
  percolate = "percolate",
  prefix = "prefix",
  query_string = "query_string",
  range = "range",
  regexp = "regexp",
  script = "script",
  simple_query_string = "simple_query_string",
  template = "template",
  term = "term",
  terms = "terms",
  type = "type",
  wildcard = "wildcard"
}

export /*interface*/ abstract class IQuery {
  abstract kind(): Kind

  kindName(): string {
    return this.kind()
  }

  rewrite(): any {
    return this
  }

  toRecord(): Record<Kind, any> {
    let o = {} as Record<Kind, any>
    o[this.kind()] = this.rewrite()
    return o
  }

  asRoot(): RootQuery {
    let q = new RootQuery()
    let o: any = {}
    o[this.kind()] = this.rewrite()
    q.query = o
    return q
  }
}
