export class Source {
  static get(): Source {
    return new Source();
  }

  enabled: boolean = true;
  includes?: Set<string>;
  excludes?: Set<string>;

  exclude(...fields: string[]): Source {
    let s = this.excludes;
    if (!s) {
      s = this.excludes = new Set<string>();
    }
    for (let field in fields) {
      s.add(field);
    }
    return this;
  }

  include(...fields: string[]) {
    let s = this.includes;
    if (!s) {
      s = this.includes = new Set<string>();
    }
    for (let field in fields) {
      s.add(field);
    }
    return this;
  }
  disable(): Source {
    this.enabled = false;
    return this;
  }
}