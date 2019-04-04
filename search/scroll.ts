import { ISearchResult } from "../ops/exports";

const _stream = function*(itr: Scroll<any>) {
  let done:boolean;
  let scrollId;
  
  yield itr.head.then(sr => {
    scrollId = sr.scrollId();
    
    done = sr.isEmptyOrComplete();
    
    return sr;
  });

  while (!done) {
    yield itr.factory(scrollId).then(
      sr => {
        if (!sr || sr.isEmpty()) {
          done = true;
        }
        return sr;
      },
      err => {
        console.log(err);
        done = true;
      }
    );
  }
};

export class Scroll<T> {
  head: Promise<ISearchResult<T>>;
  factory: (scrollId: string) => Promise<ISearchResult<T>>;

  constructor(
    head: Promise<ISearchResult<T>>,
    factory: (scrollId: string) => Promise<ISearchResult<T>>
  ) {
    this.head = head;
    this.factory = factory;
  }

  stream(): IterableIterator<Promise<ISearchResult<T>>> {
    return _stream(this) as IterableIterator<Promise<ISearchResult<T>>>;
  }
}
