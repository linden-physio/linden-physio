// How Ekonomihuset reads a file: SIE 4, the Swedish standard for moving bookkeeping between programs.
// A file is read as a whole and booked as a whole: one bad row and nothing in it is booked, and the
// receipt names the row.

// SIE files are written in code page 437 (#FORMAT PC8), the character set of the IBM PC from 1981:
// one byte for each character. These are the bytes from 128 up.
const CP437_HIGH =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";

export function decodeCp437(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += byte < 128 ? String.fromCharCode(byte) : CP437_HIGH[byte - 128];
  return text;
}

// The accounts Ekonomihuset has for the clinic (its chart of accounts, from the BAS plan).
export const CHART: Record<string, string> = {
  "1580": "Fordringar för kontokort och kuponger",
  "1930": "Företagskonto",
  "2420": "Förskott från kunder",
  "3041": "Försäljning tjänster 25 % sv",
  "3044": "Försäljning tjänster momsfri",
};

export type Receipt =
  { status: "accepted"; rows: number; verifications: number } | { status: "rejected"; row: number; message: string };

// Box-drawing characters in a name are a sign of letters written in UTF-8 and read as code page 437:
// "ö" is two bytes in UTF-8, and they read as "├╢".
const NOT_TEXT = /[\u2500-\u25a0\u0393-\u03c6\u2219-\u2321\u207f]/;

// The fields of a row: words, or "quoted text" with \" inside, or { … }.
function fields(line: string): string[] {
  const out: string[] = [];
  const pattern = /"((?:[^"\\]|\\.)*)"|\{[^}]*\}|\S+/g;
  for (const match of line.matchAll(pattern))
    out.push(match[1] !== undefined ? match[1].replace(/\\"/g, '"') : match[0]);
  return out;
}

export function check(bytes: Uint8Array): Receipt {
  const lines = decodeCp437(bytes).split(/\r?\n/);
  const reject = (row: number, message: string): Receipt => ({ status: "rejected", row, message });
  let format: string | null = null;
  let type: string | null = null;
  let verifications = 0;
  let open: { row: number; sum: number; number: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const row = i + 1;
    const line = lines[i].trim();
    if (line === "") continue;
    if (NOT_TEXT.test(line)) {
      return reject(
        row,
        "Characters that aren't letters: " +
          JSON.stringify(line.match(/"[^"]*"/g)?.find((t) => NOT_TEXT.test(t)) ?? line) +
          ". Is the file in code page 437?",
      );
    }
    const [label, ...rest] = fields(line);
    if (line === "{") {
      if (!open) return reject(row, "A { with no #VER before it.");
      continue;
    }
    if (line === "}") {
      if (!open) return reject(row, "A } with no #VER before it.");
      if (Math.abs(open.sum) > 0.001) {
        return reject(open.row, `Verification ${open.number} doesn't balance: it's off by ${open.sum.toFixed(2)}.`);
      }
      open = null;
      verifications++;
      continue;
    }
    switch (label) {
      case "#FLAGGA":
      case "#PROGRAM":
      case "#GEN":
      case "#FNAMN":
      case "#ORGNR":
      case "#RAR":
      case "#KONTO":
        break;
      case "#FORMAT":
        format = rest[0];
        if (format !== "PC8") return reject(row, "Only #FORMAT PC8 is read here.");
        break;
      case "#SIETYP":
        type = rest[0];
        if (type !== "4") return reject(row, "Only SIE type 4 files can be imported.");
        break;
      case "#VER": {
        if (!format || !type) return reject(row, "#FORMAT and #SIETYP must come before the first #VER.");
        if (open) return reject(row, "A #VER inside another #VER.");
        const [series, number, date] = rest;
        if (!/^\d{8}$/.test(date ?? "")) return reject(row, "The date " + JSON.stringify(date) + " isn't YYYYMMDD.");
        open = { row, sum: 0, number: series + " " + number };
        break;
      }
      case "#TRANS": {
        if (!open) return reject(row, "#TRANS outside a #VER.");
        const [account, , amount] = rest;
        if (!CHART[account])
          return reject(row, "There is no account " + JSON.stringify(account) + " in the chart of accounts.");
        if (!/^-?\d+(\.\d{1,2})?$/.test(amount ?? "")) {
          return reject(row, "The amount " + JSON.stringify(amount) + " isn't a number like 200.00.");
        }
        open.sum += Number(amount);
        break;
      }
      default:
        return reject(row, "Ekonomihuset doesn't know " + JSON.stringify(label) + ".");
    }
  }
  if (open) return reject(open.row, "Verification " + open.number + " has no closing }.");
  return { status: "accepted", rows: lines.filter((l) => l.trim()).length, verifications };
}
