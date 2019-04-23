export const concatPaths = (l: string, r: string, s?: string) => {
  return s
    ? l.endsWith("/")
      ? r.endsWith("/")
        ? l + r + s
        : `${l}${r}/${s}`
      : r.endsWith("/")
      ? `${l}/${r}${s}`
      : `${l}/${r}/${s}`
    : l.endsWith("/")
    ? l + r
    : `${l}/${r}`
}
