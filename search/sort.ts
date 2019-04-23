export enum Mode {
  avg = "avg",
  max = "max",
  median = "median",
  min = "min",
  sum = "sum"
}

export enum Order {
  asc = "asc",
  desc = "desc"
}

export class Sort {
  order: Order = Order.asc
  mode?: Mode
  nested_path?: string
  nested_filter?: Record<string, Record<string, string>>
  missing?: string

  public static asc(): Sort {
    let s = new Sort()
    return s
  }

  public static desc(): Sort {
    let s = new Sort()
    s.order = Order.desc
    return s
  }

  public missingFirst(): Sort {
    this.missing = "_first"
    return this
  }

  public missingLast(): Sort {
    this.missing = "_last"
    return this
  }

  public nested(path: string): Sort {
    this.nested_path = path
    return this
  }

  public nestedFilter(path: string, term: string): Sort {
    this.nested_filter = {}
    let o: Record<string, string> = (this.nested_filter["term"] = {})
    o[path] = term
    return this
  }

  with(mode: Mode): Sort {
    this.mode = mode
    return this
  }
}
