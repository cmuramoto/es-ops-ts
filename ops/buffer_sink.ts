export interface IGrowableBuffer {
  writeBuffer(b: Buffer): void;
  write(s: string): void;
  slice(): Buffer;
}

export class GrowableBuffer implements IGrowableBuffer {
  readonly encoding: string;
  offset: number = 0;
  buffer: Buffer;

  constructor(initialSize: number, encoding: string = "utf8") {
    this.buffer = Buffer.allocUnsafe(initialSize);
    this.encoding = encoding;
  }

  writeBuffer(buff: Buffer): void {
    let len = buff.length;
    let off = this.offset;

    if (off + len >= this.buffer.length) {
      let grown = Buffer.allocUnsafe(this.buffer.length * 2);
      grown.fill(this.buffer, 0);
      this.buffer = grown;
    }
    this.offset += len;
    this.buffer.fill(buff, off);
  }

  write(s: string): void {
    let buff = Buffer.from(s, this.encoding);
    this.writeBuffer(buff);
  }

  slice(): Buffer {
    let rv = this.buffer.slice(0, this.offset);
    //copy bytes, they might be ovewritten asynchronously
    rv = Buffer.alloc(rv.length, rv);
    this.offset = 0;
    return rv;
  }
}
