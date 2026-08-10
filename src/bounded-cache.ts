export class BoundedStringCache {
  private readonly values = new Map<string, string>();

  constructor(private readonly capacity: number) {}

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    if (this.values.has(key)) this.values.delete(key);
    this.values.set(key, value);

    if (this.values.size > this.capacity) {
      this.values.delete(this.values.keys().next().value as string);
    }
  }
}
