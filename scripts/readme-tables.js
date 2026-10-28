// Gera as tabelas de casos de uso, de tabelas por módulo e de dependências nos README, a partir de docs/design-data.js.
// Uso: node scripts/readme-tables.js          (reescreve os blocos entre os marcadores)
//      node scripts/readme-tables.js --check  (falha se algum README estiver desatualizado; para o CI)
const fs = require("fs");
const path = require("path");
require(path.join(__dirname, "..", "docs", "design-data.js"));

const root = path.join(__dirname, "..");
const esc = s => s.replace(/\|/g, "\\|");
const code = s => s.split(", ").map(x => `\`${x}\``).join(", ");
const endpoint = ep => ep.split(" · ").map(x => {
  const [verb, ...rest] = x.split(" ");
  return `\`${verb} /api/v1${rest.join(" ")}\``;
}).join(" · ");

const LANG = {
  pt: {
    file: "README.pt.md",
    head: "| Caso de uso | Tipo | Endpoint | Quem | O que faz |",
    kind: { "": "endpoint", job: "job", evento: "evento", "público": "público" },
    tablesHead: "| Módulo | Tabelas |",
    callsHead: "| Quem chama | Caso de uso público | Para quê |",
    eventsHead: "| Evento | Publica | Ouvem |",
    name: m => m.name,
    row: (m, [uc, kind, ep, who, fx]) => [kind ? ep : endpoint(ep), who, fx],
    why: c => c[3],
  },
  en: {
    file: "README.en.md",
    head: "| Use case | Type | Endpoint | Who | What it does |",
    kind: { "": "endpoint", job: "job", evento: "event", "público": "public" },
    tablesHead: "| Module | Tables |",
    callsHead: "| Caller | Public use case | What for |",
    eventsHead: "| Event | Published by | Heard by |",
    name: m => MODULE_NAMES_EN[m.id],
    row: (m, [uc, kind, ep]) => {
      const [when, who, fx] = USECASES_EN[`${m.id}.${uc}`];
      return [kind ? when : endpoint(ep), who, fx];
    },
    why: c => c[4],
  },
};

function blocks(L) {
  const usecases = MODULES.map(m => [
    `**${L.name(m)}** (\`${m.id}\`)`, "", L.head, "|---|---|---|---|---|",
    ...USECASES[m.id].map(r => {
      const [ep, who, fx] = L.row(m, r);
      return `| \`${r[0]}\` | ${L.kind[r[1]]} | ${ep} | ${esc(who)} | ${esc(fx)} |`;
    }),
  ].join("\n")).join("\n\n");
  const tables = [L.tablesHead, "|---|---|", ...MODULES.map(m => `| \`${m.id}\` | ${m.tables.map(t => `\`${t.name}\``).join(", ")} |`)].join("\n");
  const deps = [
    L.callsHead, "|---|---|---|", ...CALLS.map(c => `| \`${c[0]}\` | \`${c[1]}.${c[2]}\` | ${esc(L.why(c))} |`), "",
    L.eventsHead, "|---|---|---|", ...EVENTS.map(([ev, pub, subs]) => `| ${code(ev)} | \`${pub}\` | ${code(subs.join(", "))} |`),
  ].join("\n");
  return { usecases, tables, deps };
}

let stale = [];
for (const L of Object.values(LANG)) {
  const file = path.join(root, L.file);
  const before = fs.readFileSync(file, "utf8");
  let text = before;
  for (const [key, body] of Object.entries(blocks(L))) {
    const re = new RegExp(`(<!-- generated:${key} -->\\n)[\\s\\S]*?(\\n<!-- /generated:${key} -->)`);
    if (!re.test(text)) throw new Error(`${L.file}: falta o marcador generated:${key}`);
    text = text.replace(re, `$1${body}$2`);
  }
  if (text !== before) {
    stale.push(L.file);
    if (!process.argv.includes("--check")) fs.writeFileSync(file, text);
  }
}
if (process.argv.includes("--check") && stale.length) {
  console.error(`Desatualizado: ${stale.join(", ")}. Corra node scripts/readme-tables.js`);
  process.exit(1);
}
console.log(stale.length ? `Atualizado: ${stale.join(", ")}` : "Já estava atualizado");
