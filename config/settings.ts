import { StoreType } from "./base";

export class Analysis {
  analyzer?: Record<string, Record<string, any>>;
  filter?: Record<string, Record<string, any>>;
  tokenizer?: Record<string, Record<string, any>>;

  withAnalyzer(an: string, params: Record<string, any>): Analysis {
    let analyzer = this.analyzer;
    if (!analyzer) {
      analyzer = this.analyzer = {};
    }
    analyzer[an] = params;

    return this;
  }

  withFilter(tk: string, params: Record<string, any>): Analysis {
    let filter = this.filter;
    if (!filter) {
      filter = this.filter = {};
    }
    filter[tk] = params;

    return this;
  }

  withTokenizer(tk: string, params: Record<string, any>): Analysis {
    let tokenizer = this.tokenizer;
    if (!tokenizer) {
      tokenizer = this.analyzer = {};
    }
    tokenizer[tk] = params;

    return this;
  }
}

export class Settings {
  static get(): Settings {
    return new Settings();
  }

  number_of_shards?: number;

  number_of_replicas?: number;

  refresh_interval?: number;

  max_result_window?: number;

  auto_expand_replicas?: string;

  storeType?: StoreType;

  creation_date?: number;

  analysis?: Analysis;

  public getOrCreateAnalysis(): Analysis {
    let an = this.analysis;

    if (an == null) {
      an = this.analysis = new Analysis();
    }

    return an;
  }

  public autoExpandingReplicas(low: number, high: number): Settings {
    if (high == 0x7fffffff) {
      this.auto_expand_replicas = `${low}-all`;
    } else {
      this.auto_expand_replicas = `${low}-${high}`;
    }

    return this;
  }

  public creationDate(): number {
    let rv = this.creation_date;

    if (!rv) {
      rv = 0;
    }

    return rv;
  }

  public installNGram(
    label: string,
    min: number,
    max: number,
    edge: boolean,
    normalize: boolean
  ): Settings {
    let fp: Record<string, any> = {};
    fp["type"] = edge ? "edge_ngram" : "ngram";
    fp["min_gram"] = min;
    fp["max_gram"] = max;

    let ap: Record<string, any> = {};
    ap.put("type", "custom");
    ap.put("tokenizer", "standard");
    let filters: Array<string> = [];
    if (normalize) {
      filters.push("lowercase");
    }
    filters.push(label);
    ap.put("filter", filters);

    this.getOrCreateAnalysis()
      .withFilter(label, fp)
      .withAnalyzer(label, ap);
    return this;
  }

  public refreshingEvery(seconds: number): Settings {
    this.refresh_interval = seconds;
    return this;
  }

  public withReplicas(shards: number): Settings {
    this.number_of_replicas = shards;
    return this;
  }

  public withShards(shards: number): Settings {
    this.number_of_shards = shards;
    return this;
  }

  mirror(): any {
    let o: any = { ...this };
    let st = o.storeType;
    if (st) {
      o["index.store.type"] = st;
      delete o.storeType;
    }

    return o;
  }
}