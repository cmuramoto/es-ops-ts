import { ISearchResult } from "../ops/exports";

const _stream = function*(itr: Scroll<any>) {
  let done: boolean;
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

const _async_stream = async function*(itr: Scroll<any>) {
  let v = await itr.head;

  let done: boolean = !v || v.isEmptyOrComplete();
  let scrollId = v.scrollId();

  if (!done) {
    yield v;

    do {
      v = await itr.factory(scrollId);

      done = !v || v.isEmptyOrComplete();

      if (!done) {
        yield v;
      }
    } while (!done);
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

  asyncStream(): AsyncIterableIterator<ISearchResult<T>> {
    return _async_stream(this) as AsyncIterableIterator<ISearchResult<T>>;
  }
}
