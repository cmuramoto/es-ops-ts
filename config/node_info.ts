export class VersionInfo {
  number!: string
  build_hash!: string
  build_date!: string
  build_snapshot!: string
  lucene_version!: string
}

export class NodeInfo {
  name!: string
  cluster_name!: string
  cluster_uuid!: string
  version!: VersionInfo
  tagline!: string

  json(): string {
    return JSON.stringify(this, null, "  ")
  }
}
