# Nu doen

Drie dingen die ik niet voor je kan doen, in volgorde. Daarna is alles wat er staat ook echt live.

## 1. De nieuwe tabel aanmaken

Er is één migratie bijgekomen (`0003_asset_blobs`) voor de assetbibliotheek. Zonder deze stap
geeft `/assets` een foutmelding dat `asset_blobs` niet bestaat.

```bash
cd ~/Claude/VoxClipStudio\ nieuw
npm run db:migrate
```

## 2. Pushen

Ik heb geen GitHub-toegang vanuit deze omgeving, dus de commits staan lokaal klaar:

```bash
git push
```

Vercel bouwt daarna vanzelf. Vergeet niet dat de migratie ook op de productiedatabase moet
draaien — dat is dezelfde Supabase, dus stap 1 dekt het.

## 3. Het domein omzetten

Bij mijn.host: de CNAME `marketing` wijst nu naar `martyvdh.github.io`. Zet hem op:

```
be643e4f2ecd3080.vercel-dns-017.com
```

Daar staat nu het oude prototype op GitHub Pages. Dat blijft gewoon bestaan; alleen waar het
domein naartoe wijst verandert.

---

## Wat er nog open staat

Niet blokkerend, wel eerlijk om te noemen.

- **Klikken tellen.** De getagde links werken, maar niets telt ze. Daar is een klein endpoint op
  `voxclip.it` voor nodig; dat is de enige plek waar de bezoeker langskomt.
- **Onderzoek en signalen.** De tabellen staan er, het scherm nog niet. Een campagne kan nu alleen
  vanaf een blanco brief starten, niet vanaf een vastgelegd signaal.
- **E-mail en advertenties.** Andere vorm, andere regels. Nu nog niet gebouwd.
- **Blog en Learn.** Wacht op toegang tot de bron van voxclip.it.
- **Meldingen.** Er is geen seintje als iets een week op review staat. Het staat wel bovenaan de
  wachtrij, maar je moet er zelf kijken.

Het databasewachtwoord staat nog in onze chatgeschiedenis. Je zei laat maar staan; het advies om
hem te roteren blijft staan, via Supabase → Connect → Direct → *Reset database password*.
