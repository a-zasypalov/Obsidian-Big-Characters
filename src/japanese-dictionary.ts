import type { DataAdapter } from "obsidian";

const COMPLETION_MARKER = ".complete";

export async function ensureJapaneseDictionary(
  adapter: Pick<DataAdapter, "exists" | "mkdir" | "write" | "writeBinary">,
  pluginDirectory: string,
  version: string,
  files: Readonly<Record<string, Uint8Array>>
): Promise<string> {
  const directory = `${pluginDirectory.replace(/\/+$/u, "")}/japanese-dictionary/${version}`;
  const marker = `${directory}/${COMPLETION_MARKER}`;
  if (await adapter.exists(marker)) return directory;

  if (!(await adapter.exists(directory))) await adapter.mkdir(directory);
  for (const [name, bytes] of Object.entries(files)) {
    const buffer = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer as ArrayBuffer
      : bytes.slice().buffer;
    await adapter.writeBinary(
      `${directory}/${name}`,
      buffer
    );
  }
  await adapter.write(marker, version);
  return directory;
}
