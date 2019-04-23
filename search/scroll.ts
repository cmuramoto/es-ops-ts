import { ISearchResult } from "../ops/exports"

export class Scroll<T> {
  head: Promise<ISearchResult<T>>
  factory: (scrollId: string) => Promise<ISearchResult<T>>

  constructor(
    head: Promise<ISearchResult<T>>,
    factory: (scrollId: string) => Promise<ISearchResult<T>>
  ) {
    this.head = head
    this.factory = factory
  }

  *stream(): IterableIterator<Promise<ISearchResult<T>>> {
    //return _stream(this) as IterableIterator<Promise<ISearchResult<T>>>
    if (!this.head) {
      return
    }

    let done: boolean = false
    let scrollId

    yield this.head.then(sr => {
      scrollId = sr.scrollId()

      done = sr.isEmptyOrComplete()

      return sr
    })

    while (!done) {
      yield this.factory(scrollId).then(
        sr => {
          if (!sr || sr.isEmpty()) {
            done = true
          }
          return sr
        },
        err => {
          console.log(err)
          done = true
          throw err
        }
      )
    }
  }

  async *asyncStream(): AsyncIterableIterator<ISearchResult<T>> {
    let v = await this.head

    let done: boolean = !v || v.isEmptyOrComplete()
    let scrollId = v.scrollId()

    if (!done) {
      yield v

      do {
        v = await this.factory(scrollId)

        done = !v || v.isEmptyOrComplete()

        if (!done) {
          yield v
        }
      } while (!done)
    }
  }
}
