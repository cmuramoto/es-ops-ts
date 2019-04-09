import { IQuery, Kind } from "./query";

export abstract class ICompoundQuery extends IQuery {}

export class Bool extends ICompoundQuery {
  static bool(): Bool {
    return new Bool();
  }

  private must: Record<Kind, Object>[];
  private must_not: Record<Kind, Object>[];
  private filter: Record<Kind, Object>[];
  private should: Record<Kind, Object>[];
  private minimum_should_match: number;
  private boost: number;

  private append(target: Record<Kind, any>[], ...source: IQuery[]): void {
    source.forEach(q => {
      target.push(q.toRecord());
    });
  }

  private _must(): Record<Kind, any>[] {
    return this.must || (this.must = []);
  }

  private _should(): Record<Kind, any>[] {
    return this.should || (this.should = []);
  }

  private _must_not(): Record<Kind, any>[] {
    return this.must_not || (this.must_not = []);
  }

  private _filter(): Record<Kind, any>[] {
    return this.filter || (this.filter = []);
  }

  withFilter(...queries: IQuery[]): Bool {
    this.append(this._filter(), ...queries);

    return this;
  }

  withMust(...queries: IQuery[]): Bool {
    this.append(this._must(), ...queries);

    return this;
  }

  withShould(...queries: IQuery[]): Bool {
    this.append(this._should(), ...queries);

    return this;
  }

  withMustNot(...queries: IQuery[]): Bool {
    this.append(this._must_not(), ...queries);

    return this;
  }

  withMinShouldMatch(val: number): Bool {
    this.minimum_should_match = val;
    return this;
  }

  withBoost(boost: number): Bool {
    this.boost = boost;
    return this;
  }

  kind(): Kind {
    return Kind.bool;
  }
}
