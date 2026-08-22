import {mkdir, writeFile} from 'node:fs/promises'
import {normalize} from '../src/game/wordlist.ts'

const BASE = 'https://raw.githubusercontent.com/jacksun007/codenames/HEAD'
const OUT = new URL('../src/data/wordlists/', import.meta.url)

const PACKS = [
  {id: 'original', file: 'vanilla', name: 'Original', note: 'The base game deck'},
  {id: 'disney', file: 'disney', name: 'Disney', note: 'Themed'},
  {id: 'potter', file: 'potter', name: 'Harry Potter', note: 'Themed'}
]

/**
 * Written here rather than fetched — nobody publishes this one. Agents, maps,
 * guns, ability names and the words people actually shout in comms.
 *
 * The roster moves: anything added to the game after this was written is simply
 * missing, and adding it is one line. `KAY/O` is spelled KAYO because the
 * validator only allows letters, digits, spaces, hyphens and apostrophes.
 */
const VALORANT = `
Brimstone Viper Omen Cypher Sova Sage Phoenix Jett Raze Breach Reyna Killjoy
Skye Yoru Astra KAYO Chamber Neon Fade Harbor Gekko Deadlock Iso Clove Vyse
Tejo Waylay
Bind Haven Split Ascent Icebox Breeze Fracture Pearl Lotus Sunset Abyss Range
Classic Shorty Frenzy Ghost Sheriff Stinger Spectre Bucky Judge Bulldog
Guardian Phantom Vandal Marshal Outlaw Operator Ares Odin Knife
Snakebite Trapwire Cybercage Neural Skysmoke Orbital Incendiary Stim Beacon
Blaze Curveball Hothands Cloudburst Updraft Tailwind Bladestorm Boombot
Blastpack Showstopper Paintshells Aftershock Flashpoint Rolling Thunder
Paranoia Shrouded Dark Cover Leer Devour Dismiss Empress Alarmbot Turret
Nanoswarm Lockdown Regrowth Guiding Trailblazer Seekers Fakeout Blindside
Gatecrash Dimensional Astral Gravity Nebula Nova Cosmic Trademark Headhunter
Rendezvous Fastlane Highgear Relay Overdrive Prowler Haunt Seize Nightfall
Cove Hightide Cascade Reckoning Wingman Dizzy Moshpit Thrash Gravnet Sonic
Barriermesh Annihilation Undercut Doubletap Contingency Ruse Meddle Razorvine
Shear Arcrose Steelgarden Recon Shockdart Owldrone Huntersfury Resurrection
Barrier Slow Healing Poison Toxic Judgement Salvo Armageddon
Spike Defuse Plant Ace Clutch Eco Bonus Force Save Retake Rotate Lurk Peek
Jiggle Wallbang Headshot Whiff Flick Spray Burst Tap Crosshair Ultimate Orb
Attack Defense Spawn Site Mid Heaven Hell Elbow Ramp Catwalk Tube Garage
Market Hookah Showers Rafters Teleporter Yard Sewer Boathouse Nest Screens
Pizza Link Alley Tree Generator Library Dish Kitchen Bridge Rope Tunnel
Duelist Initiator Controller Sentinel Entry Anchor Flank Bait Refrag Onetap
Trade Ninja Spikerush Deathmatch Swiftplay Premier Ranked Overtime Pistol
Shield Credits Buyphase
Radiant Immortal Ascendant Diamond Platinum Gold Silver Bronze Iron
Radianite Kingdom Omega Alpha Protocol Mirror Firstlight Champions Masters
Elderflame Reaver Prime Glitchpop Oni Ruination Butterfly Karambit Skinline
Battlepass Nulcmd Fragment Zeropoint Flashdrive Suddendeath
`
  .split(/\s+/)
  .filter(Boolean)

/**
 * The hundred countries most people could place, not the UN roster: a deck is
 * only fun if every card is a word both teams recognise. Two-word names are
 * kept short so they still fit a card.
 */
const COUNTRIES = `
Argentina, Australia, Austria, Bangladesh, Belgium, Bolivia, Brazil, Bulgaria,
Cambodia, Cameroon, Canada, Chile, China, Colombia, Costa Rica, Croatia, Cuba,
Czechia, Denmark, Ecuador, Egypt, Ethiopia, Fiji, Finland, France,
Georgia, Germany, Ghana, Greece, Guatemala, Haiti, Honduras, Hungary, Iceland,
India, Indonesia, Iran, Iraq, Ireland, Israel, Italy, Jamaica, Japan, Jordan,
Kazakhstan, Kenya, Kuwait, Laos, Lebanon, Libya, Luxembourg,
Madagascar, Malaysia, Mexico, Monaco, Mongolia, Morocco, Nepal,
Netherlands, New Zealand, Nicaragua, Nigeria, Norway, Oman, Pakistan, Panama,
Paraguay, Peru, Philippines, Poland, Portugal, Qatar, Romania, Russia, Rwanda,
Saudi Arabia, Senegal, Serbia, Singapore, Somalia,
South Africa, South Korea, Spain, Sri Lanka, Sudan, Sweden, Switzerland, Syria,
Taiwan, Tanzania, Thailand, Tunisia, Turkey, Uganda, Ukraine, Uruguay,
Venezuela, Vietnam, Yemen, Zimbabwe
`
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)

await mkdir(OUT, {recursive: true})

const rows: string[] = []
const manifest: Array<{id: string; name: string; count: number; note: string}> = []

type Source = {id: string; name: string; note: string; file: string; lines: () => Promise<string[]>}

const sources: Source[] = [
  ...PACKS.map(p => ({
    ...p,
    lines: async () => {
      const res = await fetch(`${BASE}/${p.file}.txt`)
      if (!res.ok) throw new Error(`${p.file}: ${res.status}`)
      return (await res.text()).split(/\r?\n/)
    }
  })),
  {
    id: 'valorant',
    name: 'Valorant',
    note: 'Agents, maps, guns and comms',
    file: 'written in this script',
    lines: async () => VALORANT
  },
  {
    id: 'countries',
    name: 'Countries',
    note: 'The hundred most recognisable',
    file: 'written in this script',
    lines: async () => COUNTRIES
  }
]

for (const pack of sources) {
  const words = normalize(await pack.lines())
  await writeFile(new URL(`${pack.id}.json`, OUT), `${JSON.stringify(words)}\n`)
  rows.push(`| ${pack.name} | \`${pack.id}.json\` | ${words.length} | ${pack.file}.txt | ${pack.note} |`)
  manifest.push({id: pack.id, name: pack.name, count: words.length, note: pack.note})
  console.log(`${pack.id.padEnd(12)} ${words.length}`)
}

await writeFile(new URL('manifest.json', OUT), `${JSON.stringify(manifest, null, 2)}\n`)

await writeFile(
  new URL('SOURCES.md', OUT),
  `# Word list sources

Generated by \`scripts/build-wordlists.ts\`. Do not hand-edit the JSON; rerun the
script instead. Regenerating is a deliberate act and is not part of \`npm run build\`.

Every pack is normalized identically: drop blanks and \`#\` comments, strip leading
\`=\` and \`-\` markers, collapse whitespace, uppercase, dedupe case-insensitively
keeping the first occurrence, sort.

| Pack | File | Words | Source file | Notes |
|---|---|---|---|---|
${rows.join('\n')}

Fetched from [jacksun007/codenames](${BASE.replace('/raw.githubusercontent.com', '/github.com').replace('/HEAD', '')}),
which carries the widest spread of expansions and themed decks in one place.

Cross-checked against:

- [sagelga/codenames](https://github.com/sagelga/codenames) — multi-language, the
  source if non-English packs are ever added
- [Filodoxia/codenames-wordlists](https://github.com/Filodoxia/codenames-wordlists)
  — the horsepaste.com lists

## Licensing

Neither source carries a licence file. Individual words are not copyrightable,
but a curated deck is arguably a compilation, and the themed packs lean on
trademarks. This is the normal risk people take for a private game among
friends; it is recorded here so it is known rather than discovered.
`
)

console.log('SOURCES.md written')
