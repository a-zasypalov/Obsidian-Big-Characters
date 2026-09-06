export class BoundedCache<Value> {
  private readonly values = new Map<string, Value>();

  constructor(private readonly capacity: number) {}

  get(key: string): Value | undefined {
    return this.values.get(key);
  }

  set(key: string, value: Value): void {
    if (this.values.has(key)) this.values.delete(key);
    this.values.set(key, value);

    if (this.values.size > this.capacity) {
      this.values.delete(this.values.keys().next().value as string);
    }
  }
}
