# Credits

## Networking

[Trystero](https://github.com/dmotz/trystero) by Dan Motzenbecker, under the MIT
licence, does the part with no server in it: peers find each other over public
nostr relays, MQTT brokers and BitTorrent trackers, and talk directly by WebRTC.
Three of its transports run at once here and are merged into one mesh.

When two peers cannot reach each other directly, ICE falls back to
[Open Relay](https://www.metered.ca/tools/openrelay/)'s free public TURN servers.

## Avatar styles

Generated locally with [DiceBear](https://www.dicebear.com). Nothing is fetched
at runtime; each style is a lazily-imported package. Bunny is drawn in this
repository against the same interface.

Under **CC0 1.0** — no attribution required, listed for completeness:

| Style | Author |
|---|---|
| Lorelei | [Lisa Wischofsky](https://www.instagram.com/lischi_art/) |
| Open Peeps | Pablo Stanley |
| Notionists | Zoish |
| Thumbs | DiceBear |
| Pixel Art | DiceBear |
| Bunny | this repository |

Under **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** — attribution
required, which is what this section is for:

Each artist is linked as they are named in the style's own package metadata,
alongside the Figma community file the set was published from.

| Style | Artist | Published |
|---|---|---|
| Nomad (DiceBear's *Adventurer*) | [Lisa Wischofsky](https://www.instagram.com/lischi_art/) | [Figma](https://www.figma.com/community/file/1184595184137881796) |
| Micah (*Avatar Illustration System*) | [Micah Lanier](https://dribbble.com/micahlanier) | [Figma](https://www.figma.com/community/file/829741575478342595) |
| Dylan (*Dylan! The Avatar Generator*) | [Natalia Spivak](https://nataspvk.tilda.ws/) | [Figma](https://www.figma.com/community/file/1356575240759683500) |

The CC0 pool holds only three people-style sets, which is why the other three
are CC BY.

## Silhouettes

The two spy silhouettes on the landing screen are from
[Pixabay](https://pixabay.com) by **mohamed_hassan**, under the Pixabay Content
Licence. Attribution is not required; it is here because it costs nothing.

## Typefaces

**OpenDyslexic** ships in `public/fonts/` and powers the dyslexia-friendly
setting. It is fetched only when that switch is turned on. By Abbie Gonzalez,
under the [SIL Open Font License 1.1](https://opendyslexic.org).

Everything else is bundled from Fontsource: Archivo Black, Oswald and Chivo,
all under the SIL Open Font License 1.1.

## Sound

Every cue is synthesized at runtime except one: the knock a peg makes passing
the wheel's flapper, `public/sfx/peg-knock.mp3`. Trimmed from
[Door knock](https://pixabay.com/sound-effects/film-special-effects-door-knock-291150/)
by **universfield**, under the Pixabay Content Licence. Attribution is not
required; it is here because it costs nothing.

## Word lists

See [`src/data/wordlists/SOURCES.md`](src/data/wordlists/SOURCES.md).
