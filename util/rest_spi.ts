import { IEndpointSelector, HttpHost } from "./ha_client"

import { concatPaths } from "./strings"

const tryLoad = (name: string, skip: boolean = false) => {
  try {
    return skip ? null : require(name)
  } catch (e) {
    return null
  }
}

const axios = tryLoad("axios")
const unirest = tryLoad("unirest", true)

type HttpResponse = {
  status: number
  body: {}
  data: {}
  raw_body: any
  error: {} | PromiseLike<{}> | undefined
}

enum HttpMethod {
  GET = "get",
  PUT = "put",
  POST = "post",
  DELETE = "delete",
  HEAD = "head"
}

const tryExtractError = (err?: any) => {
  if (err) {
    try {
      return JSON.parse(err)
    } catch (e) {
      return err
    }
  }
}

export interface IHttpClient {
  doGet<T>(path: string, extract: (b: any) => T): Promise<T>

  doGetWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T>

  doPostWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T>

  doPutWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T>

  doHeadWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T>

  doDeleteWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T>

  doPostWithContingencyAndFactory<T>(
    sel: IEndpointSelector,
    ctx: string,
    factory: () => Buffer | string,
    extract: (b: any) => T
  ): Promise<T>
}

abstract class BaseImpl implements IHttpClient {
  abstract doGet<T>(path: string, extract: (b: any) => T): Promise<T>

  doGetWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T> {
    return this.doHttpWithContingency<T>(
      HttpMethod.GET,
      sel,
      ctx,
      buffer,
      extract
    )
  }
  doPostWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T> {
    return this.doHttpWithContingency<T>(
      HttpMethod.POST,
      sel,
      ctx,
      buffer,
      extract
    )
  }
  doPutWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T> {
    return this.doHttpWithContingency<T>(
      HttpMethod.PUT,
      sel,
      ctx,
      buffer,
      extract
    )
  }
  doHeadWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T> {
    return this.doHttpWithContingency<T>(
      HttpMethod.HEAD,
      sel,
      ctx,
      buffer,
      extract
    )
  }
  doDeleteWithContingency<T>(
    sel: IEndpointSelector,
    ctx: string,
    extract: (b: any) => T,
    buffer?: string | Buffer
  ): Promise<T> {
    return this.doHttpWithContingency<T>(
      HttpMethod.DELETE,
      sel,
      ctx,
      buffer,
      extract
    )
  }

  protected abstract doHttpWithContingency<T>(
    method: HttpMethod,
    sel: IEndpointSelector,
    ctx: string,
    buffer: string | Buffer | undefined,
    extract: (b: any) => T
  ): Promise<T>

  doPostWithContingencyAndFactory<T>(
    sel: IEndpointSelector,
    ctx: string,
    factory: () => string | Buffer,
    extract: (b: any) => T
  ): Promise<T> {
    return this.doHttpWithContingency(
      HttpMethod.POST,
      sel,
      ctx,
      factory(),
      extract
    )
  }
}

class UnirestImpl extends BaseImpl {
  doGet<T>(path: string, extract: (b: any) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      unirest
        .get(path)
        .send()
        .end((res: HttpResponse) => {
          return resolve(extract(res.body))
        })
    })
  }

  private prepareCall(
    method: HttpMethod,
    url: string,
    buffer: string | Buffer | undefined
  ) {
    let o
    switch (method) {
      case HttpMethod.GET:
        o = unirest.get(url)
        break
      case HttpMethod.PUT:
        o = unirest.put(url)
        break
      case HttpMethod.POST:
        o = unirest.post(url)
        break
      case HttpMethod.DELETE:
        o = unirest.delete(url)
        break
      case HttpMethod.HEAD:
        o = unirest.head(url)
        break
      default:
        throw "Unusupported " + method
    }
    o = o.headers({
      "Content-Type": "application/json"
    })
    return buffer ? o.send(buffer) : o.send()
  }

  protected doHttpWithContingency<T>(
    method: HttpMethod,
    sel: IEndpointSelector,
    ctx: string,
    buffer: string | Buffer | undefined,
    extract: (b: any) => T
  ) {
    return this.performCall(method, sel, sel.available(), ctx, buffer, extract)
  }

  private performCall<T>(
    method: HttpMethod,
    sel: IEndpointSelector,
    hosts: IterableIterator<HttpHost>,
    ctx: string,
    buffer: string | Buffer | undefined,
    extract: (b: any) => T
  ): Promise<T> {
    let res = hosts.next()
    let curr = res.done ? null : res.value
    let rv: Promise<T>

    if (!curr) {
      rv = Promise.reject("Exausted Hosts") as Promise<T>
    } else {
      rv = new Promise<T>((resolve, reject) => {
        let path = concatPaths(curr.url(), ctx)
        this.prepareCall(method, path, buffer).end((res: HttpResponse) => {
          //TODO better status handling
          if (res.error || res.status >= 400) {
            if (res.status) {
              resolve()
            } else {
              //Network error
              sel.onFailure(curr)
              reject({
                host: curr,
                err: res.error,
                body: tryExtractError(res.raw_body)
              })
            }
          } else {
            resolve(extract(res.body))
          }
        })
      }) //
        .catch(e => {
          console.log(JSON.stringify(e))
          return this.performCall<T>(method, sel, hosts, ctx, buffer, extract)
        }) as Promise<T>
    }

    return rv
  }
}

class AxiosImpl extends BaseImpl {
  doGet<T>(path: string, extract: (b: any) => T): Promise<T> {
    return axios.get(path).then((res: HttpResponse) => extract(res.data))
  }
  private prepareCall(
    method: HttpMethod,
    url: string,
    buffer: string | Buffer | undefined
  ) {
    let o: any = {
      method: method,
      url: url,
      headers: { "Content-Type": "application/json" }
    }

    if (buffer) {
      o.data = buffer
    }

    return axios(o)
  }

  private performCall<T>(
    method: HttpMethod,
    sel: IEndpointSelector,
    hosts: IterableIterator<HttpHost>,
    ctx: string,
    buffer: string | Buffer | undefined,
    extract: (b: any) => T
  ): Promise<T> {
    let res = hosts.next()
    let curr = res.done ? null : res.value
    let rv: Promise<T>

    if (!curr) {
      rv = Promise.reject("Exausted Hosts") as Promise<T>
    } else {
      let path = ctx
        ? ctx.startsWith("http")
          ? ctx
          : concatPaths(curr.url(), ctx)
        : curr.url()
      rv = this.prepareCall(method, path, buffer)
        .then((res: HttpResponse) => {
          return extract(res.data)
        }) //
        .catch((e: any) => {
          if (e.code == "ECONNREFUSED") {
            sel.onFailure(curr)
            return this.performCall<T>(method, sel, hosts, ctx, buffer, extract)
          } else if (e.response && e.response.status == 404) {
            return null
          } else {
            throw e
          }
        }) as Promise<T>
    }

    return rv
  }

  protected doHttpWithContingency<T>(
    method: HttpMethod,
    sel: IEndpointSelector,
    ctx: string,
    buffer: string | Buffer | undefined,
    extract: (b: any) => T
  ) {
    return this.performCall(method, sel, sel.available(), ctx, buffer, extract)
  }
}

export const ActiveDispatch: IHttpClient = axios
  ? new AxiosImpl()
  : unirest
  ? new UnirestImpl()
  : null

if (!ActiveDispatch) {
  throw new Error("Http Client spi required")
}
