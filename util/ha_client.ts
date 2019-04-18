import { StringSet, StringMap } from "./collection";
import { clearInterval } from "timers";
import { ActiveDispatch } from "./rest_spi";

export class HttpHost {
  private readonly _url: string;

  constructor(url: string) {
    this._url = url.endsWith("/") ? url.substring(0, url.length - 1) : url;
  }

  url(): string {
    return this._url;
  }
}

export interface IEndpointSelector {
  available(): IterableIterator<HttpHost>;
  onFailure(host: HttpHost): void;
  close(): void;
}

class EndpointSelector implements IEndpointSelector {
  close(): void {
    let task = this.sniffTask;
    if (task) {
      clearInterval(task);
    }
  }
  readonly hosts: StringSet<HttpHost>;
  readonly blacklist: StringMap<HttpHost, DeadHostState>;
  roundRobinSeq: number = 0;
  sniffTask: NodeJS.Timeout;
  sniffer: IHostSniffer;

  constructor(masterHosts: HttpHost[], sniffInterval: number) {
    let ke: (h: HttpHost) => string = h => h.url();
    let hosts = new StringSet<HttpHost>(ke);

    masterHosts.forEach(h => hosts.add(h));

    this.hosts = hosts;

    this.blacklist = new StringMap<HttpHost, DeadHostState>(ke);

    if (sniffInterval > 0) {
      let sniffer = new ElasticSniffer();
      this.sniffer = sniffer;

      this.sniffTask = setInterval(async () => {
        try {
          let maybeNew = await sniffer.sniffHosts(this);

          if (maybeNew && maybeNew.length) {
            maybeNew.forEach(h => {
              if (hosts.add(h)) {
                console.log(`Host Discovered: ${h.url()}`);
              }
            });
          }
        } catch (e) {
          console.log(e);
        }
      }, sniffInterval);
    }
  }

  *_available(): IterableIterator<HttpHost> {
    let bl = this.blacklist;
    let candidates = this.hosts.vals();
    let len = candidates.length;
    let fallback: HttpHost;
    let state: DeadHostState;
    if (len) {
      for (var ix = 0; ix < len; ix++) {
        let host = candidates[(ix + this.roundRobinSeq) % len];
        let dead = bl.get(host);
        if (!dead) {
          yield host;
        } else {
          if (!state || state.deadUntil > dead.deadUntil) {
            state = dead;
            fallback = host;
          }
        }
      }

      this.roundRobinSeq++;

      if (fallback) {
        yield fallback;
      }
    }
  }

  available(): IterableIterator<HttpHost> {
    return this._available();
  }

  onFailure(host: HttpHost) {
    let state = this.blacklist.computeIfAbsent(host, _ => new DeadHostState());
    state.fail();
  }
}

class DeadHostState {
  static readonly MIN_CONNECTION_TIMEOUT_MILLIS = 60000;
  static readonly MAX_CONNECTION_TIMEOUT_MILLIS = 30 * 60000;

  failed: number;
  deadUntil: number;

  constructor() {
    this.failed = 1;
    this.deadUntil = Date.now() + DeadHostState.MIN_CONNECTION_TIMEOUT_MILLIS;
  }

  fail(): DeadHostState {
    let timeout = Math.min(
      DeadHostState.MIN_CONNECTION_TIMEOUT_MILLIS *
        2 *
        Math.pow(2, this.failed * 0.5 - 1),
      DeadHostState.MAX_CONNECTION_TIMEOUT_MILLIS
    );
    this.deadUntil = Date.now() + timeout;
    this.failed++;

    return this;
  }
}

interface IHostSniffer {
  sniffHosts(client: EndpointSelector): Promise<HttpHost[]>;
}

class ElasticSniffer implements IHostSniffer {
  sniffHosts(client: EndpointSelector): Promise<HttpHost[]> {
    let single = client.available().next();
    let url = single && single.value.url();

    if (url) {
      let path = url + "/_nodes/http";
      return ActiveDispatch.doGet(path, (body: any) => {
        let rv;
        if (body && (body = body.nodes)) {
          rv = Object.values(body)
            .map((node: any) => {
              let v = node.http;
              v = v && v.publish_address;
              return v ? new HttpHost(v as string) : null;
            })
            .filter(v => v != null);
        }

        return rv;
      });
    }
    return Promise.resolve([]);
  }
}

export const EndpointSelectorFactory = (
  sniffInterval: number = 60000,
  ...hosts: HttpHost[] | string[]
): IEndpointSelector => {
  let hs: HttpHost[];
  if (typeof hosts[0] === "string") {
    hs = (hosts as string[]).map(h => new HttpHost(h));
  } else {
    hs = hosts as HttpHost[];
  }
  return new EndpointSelector(hs, sniffInterval);
};
