# Start hier

Korte handleiding om dit lokaal draaiend te krijgen. Alles hieronder is getest behalve de
stappen die een echte database nodig hebben, want die had ik niet.

## 1. Database aanmaken

Neem een gratis Postgres bij [Neon](https://neon.tech) en kopieer de connection string.
Lokaal werkt ook: Postgres.app of `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`.

## 2. Omgeving invullen

```bash
cd "~/Claude/VoxClipStudio nieuw"
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # zet dit in SESSION_SECRET
```

Vul in `.env` de `DATABASE_URL` en `SESSION_SECRET` in. Laat `ENABLE_REAL_PUBLISHING` op `false`.

## 3. Installeren en starten

```bash
npm install
npm run db:migrate     # zet de 29 tabellen neer
npm run db:seed        # maakt je admin-account en laadt Product Truth
npm run dev            # http://localhost:3000
```

De seed print je wachtwoord één keer. Bewaar het, en verander het zodra dat kan.

## 4. Controleren of alles klopt

```bash
npm run verify         # lint, typecheck, 86 tests, productie-build
```

Dit moet volledig groen zijn. Als iets faalt: niet omzeilen, maar de oorzaak zoeken. Zo staat het
ook in `AGENTS.md`.

## 5. Op GitHub zetten

```bash
git remote add origin git@github.com:<jij>/voxclip-marketing-studio.git
git push -u origin main
```

De CI in `.github/workflows/ci.yml` draait dan vanzelf: lint, types, tests, migraties, seed, build,
plus een check op hardgecodeerde secrets. Er staan geen productie-secrets in CI, met opzet.

## 6. Deployen

Vercel-project aanmaken, de repo koppelen, en in de project settings dezelfde variabelen zetten als
in `.env`. Zet `APP_URL` op `https://marketing.voxclip.it`.

## Wat je van mij nodig hebt voordat het verder kan

1. **De oude `index.html`.** Die zat niet in het project, dus ik kon niets overzetten. Zet hem in de
   map en ik port de generators over.
2. **Toegang tot de bron van `voxclip.it`.** Zonder die kan de blog- en Learn-publicatie niet echt
   gebouwd worden.
3. **Toegang tot de desktop-repo of `Arend0/voxclip-releases`.** De versie en de sneltoetsen staan nu
   bewust op *niet geverifieerd* en blokkeren elke tekst die ze noemt.
4. **API-toegang per kanaal.** Zonder officiële toegang blijft elke adapter een nep-adapter die de
   payload opslaat en niets plaatst.

## Wat er bewust nog niet in zit

Campagnes aanmaken via de UI, de review-knoppen, de huisformats, de asset-bibliotheek, de kanaal-
adapters en de attributie. De volgorde en de exacte eerste stappen staan in
`docs/plans/master-plan.md`.
