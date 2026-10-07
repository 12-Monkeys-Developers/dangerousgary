/**
 * Génère la source YAML du compendium du guide (src/packs/guide) à partir des pages HTML de guide/html/fr/.
 * Dans les pages, `@@page:<fichier>@@` devient un lien vers la page du guide, et `@@img:<nom>@@` le chemin de la capture assets/guide/<nom>.webp.
 * Les identifiants sont fixes pour que les liens et les mises à jour restent stables : `npm run guide`, puis `npm run YMLtoLDB` (Foundry fermé).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import yaml from "js-yaml"

const SYSTEM_ID = "dangerousgary"
const PACK = "guide"
const JOURNAL_ID = "tlbfAE79HHg82HaN"
const JOURNAL_NAME = "Guide du système"

/** Pages dans l'ordre du guide : fichier HTML, identifiant de page, titre */
const PAGES = [
  { file: "introduction", id: "nU5S7qoXnx7VCATH", title: "Introduction" },
  { file: "options", id: "B5mvayI7qCFZcDBz", title: "Réglages" },
  { file: "personnage", id: "AjSC5t5kjsmsNFZq", title: "Le Personnage" },
  { file: "classes", id: "mdWehQH6tzWz2xyA", title: "Classes, talents et artefacts" },
  { file: "rencontre", id: "01Y5Jr6ZBUXkRBYz", title: "La Rencontre" },
  { file: "jets", id: "H6d2D2QVYtF1Kwbx", title: "Jets et messages" },
  { file: "combat", id: "EDrxwaqLnf5XCESY", title: "Combat et macros" },
]

let missing = 0

const pageLink = (file) => {
  const page = PAGES.find((p) => p.file === file)
  if (!page) throw new Error(`Page inconnue : ${file}`)
  return `@UUID[Compendium.${SYSTEM_ID}.${PACK}.JournalEntry.${JOURNAL_ID}.JournalEntryPage.${page.id}]{${page.title}}`
}
const imagePath = (name) => {
  const path = `assets/guide/${name}.webp`
  if (!existsSync(path)) {
    console.warn(`Image absente : ${path}`)
    missing++
  }
  return `systems/${SYSTEM_ID}/${path}`
}

const pages = PAGES.map((page, index) => {
  const content = readFileSync(`guide/html/fr/${page.file}.html`, "utf-8")
    .replace(/@@page:([a-z]+)@@/g, (_, file) => pageLink(file))
    .replace(/@@img:([a-z0-9-]+)@@/g, (_, name) => imagePath(name))
    .trimEnd()
  return {
    _id: page.id,
    name: page.title,
    type: "text",
    title: { show: false, level: 1 },
    image: {},
    text: { format: 1, content },
    video: { controls: true, volume: 0.5 },
    src: null,
    system: {},
    sort: (index + 1) * 100000,
    ownership: { default: -1 },
    flags: {},
    _key: `!journal.pages!${JOURNAL_ID}.${page.id}`,
  }
})

const journal = {
  _id: JOURNAL_ID,
  name: JOURNAL_NAME,
  pages,
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {},
  _key: `!journal!${JOURNAL_ID}`,
}

const dir = `src/packs/${PACK}`
if (existsSync(dir)) for (const f of readdirSync(dir)) rmSync(`${dir}/${f}`)
mkdirSync(dir, { recursive: true })
const fileName = `${dir}/journal_Guide_du_systeme_${JOURNAL_ID}.yml`
writeFileSync(fileName, yaml.dump(journal, { lineWidth: -1, noRefs: true }))
console.log(`${fileName} : ${pages.length} pages`)
if (missing) console.warn(`${missing} image(s) absente(s)`)
