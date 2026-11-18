import { Hono } from "hono";
import { serve } from "@hono/node-server";
import pg from "pg";
import ssh2 from "ssh2";
import { generateKeyPairSync, timingSafeEqual } from "node:crypto";
import { check, type Receipt } from "./check.ts";

// Ekonomihuset: a stand-in for the clinic's accountant's system, the grey old box on 0c's map. It takes
// one file a night, in SIE 4, and books it all or none. Two doors: SFTP (how such systems usually take
// files: put it in /inbox, read the receipt from /outbox) and HTTPS (POST /files), for where SFTP can't
// run. Receipts come back a moment after the file, as a real system's batch would.

const pool = new pg.Pool({ connectionString: process.env.EKONOMIHUSET_DATABASE_URL });
const TOKEN = process.env.EKONOMIHUSET_TOKEN ?? "eko_local";
const USER = process.env.EKONOMIHUSET_USER ?? "linden";
const PASSWORD = process.env.EKONOMIHUSET_PASSWORD ?? "linden";

await pool.query(`
  CREATE TABLE IF NOT EXISTS files (
    name text PRIMARY KEY,
    body bytea NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    receipt jsonb
  )`);

// Take a file. A name already booked is refused: sending the same night twice must not book it twice.
async function receive(name: string, body: Buffer): Promise<{ ok: boolean; message: string }> {
  if (!/^[\w.-]+\.se$/.test(name)) return { ok: false, message: "File names look like linden-20261118.se" };
  const { rows } = await pool.query("SELECT receipt FROM files WHERE name = $1", [name]);
  if (rows[0]?.receipt?.status === "accepted") return { ok: false, message: name + " has been booked already." };
  await pool.query(
    `INSERT INTO files (name, body) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET body = $2, received_at = now(), receipt = NULL`,
    [name, body],
  );
  // The night's batch, a second later.
  setTimeout(async () => {
    const receipt: Receipt = check(body);
    await pool.query("UPDATE files SET receipt = $2 WHERE name = $1", [name, JSON.stringify(receipt)]);
    console.log(
      name +
        ": " +
        (receipt.status === "accepted"
          ? "booked, " + receipt.verifications + " verifications"
          : "rejected at row " + receipt.row + ": " + receipt.message),
    );
  }, 1000);
  return { ok: true, message: "Received " + name };
}

async function receipt(name: string): Promise<Receipt | null> {
  const { rows } = await pool.query("SELECT receipt FROM files WHERE name = $1", [name]);
  return rows[0]?.receipt ?? null;
}

// The receipt as a text file in /outbox, as the SFTP door shows it.
const receiptText = (r: Receipt) =>
  r.status === "accepted"
    ? `ACCEPTED\n${r.verifications} verifications, ${r.rows} rows\n`
    : `REJECTED\nrow ${r.row}: ${r.message}\nNothing in the file was booked.\n`;

// HTTPS door.
const app = new Hono();
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
app.use("/files/*", async (c, next) => {
  if (!same(c.req.header("authorization") ?? "", "Bearer " + TOKEN)) return c.json({ error: "Not allowed." }, 401);
  await next();
});
app.put("/files/:name", async (c) => {
  const answer = await receive(c.req.param("name"), Buffer.from(await c.req.arrayBuffer()));
  return c.json(answer, answer.ok ? 202 : 409);
});
app.get("/files/:name/receipt", async (c) => {
  const found = await receipt(c.req.param("name"));
  return found ? c.json(found) : c.json({ status: "waiting" }, 404);
});
app.get("/", async (c) => {
  const { rows } = await pool.query("SELECT name, received_at, receipt FROM files ORDER BY received_at DESC LIMIT 30");
  return c.text(
    "Ekonomihuset · files received\n\n" +
      rows
        .map(
          (r) =>
            `${r.received_at.toISOString()}  ${r.name}  ${r.receipt ? receiptText(r.receipt).split("\n").slice(0, 2).join(" · ") : "waiting"}`,
        )
        .join("\n"),
  );
});
serve({ fetch: app.fetch, port: Number(process.env.EKONOMIHUSET_PORT ?? 4300) });

// SFTP door: just enough of the protocol to put a file in /inbox and read receipts from /outbox.
const { utils } = ssh2;
const { OPEN_MODE, STATUS_CODE } = utils.sftp;
const hostKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs1", format: "pem" });
const dirAttrs = { mode: 0o40755, uid: 0, gid: 0, size: 0, atime: 0, mtime: 0 };
const fileAttrs = (size: number) => ({
  mode: 0o100644,
  uid: 0,
  gid: 0,
  size,
  atime: 0,
  mtime: Math.floor(Date.now() / 1000),
});

new ssh2.Server({ hostKeys: [hostKey] }, (client) => {
  client.on("authentication", (ctx) => {
    if (ctx.method === "password" && ctx.username === USER && same(ctx.password, PASSWORD)) ctx.accept();
    else ctx.reject(["password"]);
  });
  client.on("ready", () => {
    client.on("session", (accept) => {
      const session = accept();
      session.on("sftp", (acceptSftp) => {
        const sftp = acceptSftp();
        const handles = new Map<string, { path: string; chunks: Buffer[]; read?: Buffer; listed?: boolean }>();
        let next = 0;
        const handle = (state: { path: string; chunks: Buffer[]; read?: Buffer }) => {
          const h = Buffer.from(String(next++));
          handles.set(h.toString(), state);
          return h;
        };
        sftp.on("REALPATH", (id, path) => {
          const clean =
            "/" +
            path
              .split("/")
              .filter((p) => p && p !== ".")
              .join("/");
          sftp.name(id, [{ filename: clean, longname: clean, attrs: dirAttrs }]);
        });
        sftp.on("STAT", async (id, path) => statOf(id, path));
        sftp.on("LSTAT", async (id, path) => statOf(id, path));
        async function statOf(id: number, path: string) {
          if (["/", "/inbox", "/outbox"].includes(path)) return sftp.attrs(id, dirAttrs);
          const r = path.startsWith("/outbox/") ? await receipt(path.slice(8).replace(/\.receipt\.txt$/, "")) : null;
          if (r) return sftp.attrs(id, fileAttrs(receiptText(r).length));
          return sftp.status(id, STATUS_CODE.NO_SUCH_FILE);
        }
        sftp.on("OPEN", async (id, path, flags) => {
          if (path.startsWith("/inbox/") && flags & OPEN_MODE.WRITE)
            return sftp.handle(id, handle({ path, chunks: [] }));
          if (path.startsWith("/outbox/") && flags & OPEN_MODE.READ) {
            const r = await receipt(path.slice(8).replace(/\.receipt\.txt$/, ""));
            if (!r) return sftp.status(id, STATUS_CODE.NO_SUCH_FILE);
            return sftp.handle(id, handle({ path, chunks: [], read: Buffer.from(receiptText(r)) }));
          }
          sftp.status(id, STATUS_CODE.PERMISSION_DENIED);
        });
        sftp.on("WRITE", (id, h, offset, data) => {
          const state = handles.get(h.toString());
          if (!state) return sftp.status(id, STATUS_CODE.FAILURE);
          state.chunks.push(Buffer.from(data));
          sftp.status(id, STATUS_CODE.OK);
        });
        sftp.on("READ", (id, h, offset, length) => {
          const state = handles.get(h.toString());
          if (!state?.read || offset >= state.read.length) return sftp.status(id, STATUS_CODE.EOF);
          sftp.data(id, state.read.subarray(offset, offset + length));
        });
        sftp.on("FSTAT", (id, h) => {
          const state = handles.get(h.toString());
          sftp.attrs(id, fileAttrs(state?.read?.length ?? 0));
        });
        sftp.on("OPENDIR", (id, path) => {
          if (!["/", "/inbox", "/outbox"].includes(path)) return sftp.status(id, STATUS_CODE.NO_SUCH_FILE);
          sftp.handle(id, handle({ path, chunks: [] }));
        });
        sftp.on("READDIR", async (id, h) => {
          const state = handles.get(h.toString()) as { path: string; listed?: boolean } | undefined;
          if (!state || state.listed) return sftp.status(id, STATUS_CODE.EOF);
          state.listed = true;
          if (state.path === "/") {
            return sftp.name(
              id,
              ["inbox", "outbox"].map((d) => ({
                filename: d,
                longname: "drwxr-xr-x 1 eko eko 0 " + d,
                attrs: dirAttrs,
              })),
            );
          }
          const { rows } = await pool.query(
            "SELECT name, length(body) AS size, receipt FROM files ORDER BY received_at",
          );
          const list =
            state.path === "/inbox"
              ? rows.map((r) => ({ filename: r.name, size: r.size }))
              : rows
                  .filter((r) => r.receipt)
                  .map((r) => ({ filename: r.name + ".receipt.txt", size: receiptText(r.receipt).length }));
          if (list.length === 0) return sftp.status(id, STATUS_CODE.EOF);
          sftp.name(
            id,
            list.map((f) => ({
              filename: f.filename,
              longname: "-rw-r--r-- 1 eko eko " + f.size + " " + f.filename,
              attrs: fileAttrs(f.size),
            })),
          );
        });
        sftp.on("CLOSE", async (id, h) => {
          const state = handles.get(h.toString());
          handles.delete(h.toString());
          if (state && state.path.startsWith("/inbox/") && !state.read) {
            const answer = await receive(state.path.slice(7), Buffer.concat(state.chunks));
            if (!answer.ok) {
              console.log(answer.message);
              return sftp.status(id, STATUS_CODE.FAILURE, answer.message);
            }
          }
          sftp.status(id, STATUS_CODE.OK);
        });
      });
    });
  });
}).listen(Number(process.env.EKONOMIHUSET_SFTP_PORT ?? 2222), "127.0.0.1", () => {
  console.log("Ekonomihuset: https on http://localhost:4300, sftp on sftp://" + USER + "@localhost:2222");
});
