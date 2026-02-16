import fs from 'fs/promises';
import path from 'path';
import { PROCESSED_DIR } from '@/lib/constants';

type DeletedMediaTombstoneFile = {
  paths: string[];
  hashes: string[];
};

type DeletedMediaTombstone = {
  paths: Set<string>;
  hashes: Set<string>;
};

const TOMBSTONE_PATH = path.join(PROCESSED_DIR, 'deleted-media.json');

function normalizePath(filePath: string): string {
  return path.resolve(filePath);
}

export async function loadDeletedMediaTombstone(): Promise<DeletedMediaTombstone> {
  try {
    const raw = await fs.readFile(TOMBSTONE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DeletedMediaTombstoneFile>;
    const paths = Array.isArray(parsed.paths) ? parsed.paths : [];
    const hashes = Array.isArray(parsed.hashes) ? parsed.hashes : [];

    return {
      paths: new Set(paths.map(normalizePath)),
      hashes: new Set(hashes),
    };
  } catch {
    return { paths: new Set<string>(), hashes: new Set<string>() };
  }
}

export async function registerDeletedMediaTombstone(input: {
  originalPath: string;
  hash: string;
}): Promise<void> {
  const tombstone = await loadDeletedMediaTombstone();
  tombstone.paths.add(normalizePath(input.originalPath));
  tombstone.hashes.add(input.hash);

  const serialized: DeletedMediaTombstoneFile = {
    paths: Array.from(tombstone.paths).sort(),
    hashes: Array.from(tombstone.hashes).sort(),
  };

  await fs.mkdir(path.dirname(TOMBSTONE_PATH), { recursive: true });
  await fs.writeFile(TOMBSTONE_PATH, JSON.stringify(serialized), 'utf8');
}
