// bun studio.ts init <dir> | upgrade <dir> | status <dir>
// Makes and maintains a motion-studio workspace from the engine bundled with this plugin.
// The workspace vendors the engine, so a clip renders the same until you choose to upgrade.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const PLUGIN = resolve(import.meta.dir, "..");
const ENGINE = join(PLUGIN, "engine");
const MARKER = ".motion-studio.json";

// Replaced on upgrade. Everything else in a workspace belongs to its owner and is never touched.
const ENGINE_OWNED = ["src", "prompts", "tests", "assets/fonts", "CLAUDE.md", "justfile", "package.json", "bun.lock", "tsconfig.json"];
// Copied once by init, then left alone: examples, registries and brand assets the owner edits.
const SEEDED = ["brand.ts", "themes", "films", "concepts", "clips", "docs", "assets/brand", "assets/aws-icons"];

interface Marker {
  engine: string;
  created: string;
  upgraded?: string;
}

const pluginVersion = async (): Promise<string> =>
  ((await Bun.file(join(PLUGIN, ".claude-plugin/plugin.json")).json()) as { version: string }).version;

const readMarker = async (dir: string): Promise<Marker | undefined> => {
  const f = Bun.file(join(dir, MARKER));
  return (await f.exists()) ? ((await f.json()) as Marker) : undefined;
};

const today = (): string => new Date().toISOString().slice(0, 10);

function copy(rel: string, dir: string): void {
  const from = join(ENGINE, rel);
  if (!existsSync(from)) return;
  cpSync(from, join(dir, rel), { recursive: true, force: true });
}

async function install(dir: string): Promise<void> {
  const p = Bun.spawn(["bun", "install"], { cwd: dir, stdout: "inherit", stderr: "inherit" });
  if ((await p.exited) !== 0) throw new Error("bun install failed");
}

async function preflight(): Promise<void> {
  const missing = ["ffmpeg", "ffprobe", "just"].filter((b) => !Bun.which(b));
  if (missing.length) console.warn(`warning: not on PATH: ${missing.join(", ")}. Renders need ffmpeg and ffprobe; recipes need just.`);
}

async function init(dir: string): Promise<void> {
  if (await readMarker(dir)) throw new Error(`${dir} is already a studio. Use: upgrade ${dir}`);
  if (existsSync(dir) && readdirSync(dir).filter((f) => f !== ".git" && f !== ".DS_Store").length) {
    throw new Error(`${dir} is not empty and is not a studio. Pick an empty folder.`);
  }
  mkdirSync(dir, { recursive: true });
  for (const rel of [...ENGINE_OWNED, ...SEEDED]) copy(rel, dir);
  cpSync(join(ENGINE, "gitignore.template"), join(dir, ".gitignore"));
  const engine = await pluginVersion();
  await Bun.write(join(dir, MARKER), `${JSON.stringify({ engine, created: today() } satisfies Marker, null, 2)}\n`);
  await install(dir);
  await preflight();
  console.log(`studio ready at ${dir} (engine ${engine}). Next: cd ${dir} && just check`);
}

async function upgrade(dir: string): Promise<void> {
  const m = await readMarker(dir);
  if (!m) throw new Error(`${dir} is not a studio (no ${MARKER}). Use: init ${dir}`);
  const engine = await pluginVersion();
  for (const rel of ENGINE_OWNED) {
    rmSync(join(dir, rel), { recursive: true, force: true });
    copy(rel, dir);
  }
  await Bun.write(join(dir, MARKER), `${JSON.stringify({ ...m, engine, upgraded: today() } satisfies Marker, null, 2)}\n`);
  await install(dir);
  await preflight();
  console.log(`studio at ${dir} upgraded ${m.engine} -> ${engine}. Run: just check`);
}

async function status(dir: string): Promise<void> {
  const m = await readMarker(dir);
  const engine = await pluginVersion();
  if (!m) console.log(`${dir}: not a studio. Plugin engine is ${engine}.`);
  else console.log(`${dir}: engine ${m.engine}${m.engine === engine ? " (current)" : `, plugin has ${engine}: run upgrade`}`);
}

const [cmd, arg] = process.argv.slice(2);
if (!cmd || !arg || !["init", "upgrade", "status"].includes(cmd)) {
  console.error("usage: bun studio.ts init|upgrade|status <dir>");
  process.exit(2);
}
const dir = resolve(arg);
try {
  await (cmd === "init" ? init(dir) : cmd === "upgrade" ? upgrade(dir) : status(dir));
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
