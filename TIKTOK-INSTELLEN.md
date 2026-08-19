# TikTok-cijfers automatisch ophalen

Alles is gebouwd. Er zijn nog drie dingen die alleen jij kunt doen, want het zijn
sleutels — die typ jij, niet ik.

Reken op een kwartier.

---

## Wat het doet

Elke nacht om vier uur haalt de Studio van elke post waar je de TikTok-link bij
hebt geplakt de views, likes, reacties en shares op, en zet die bij de campagne.
Je tikt nooit meer een getal over.

**Het plaatst niets.** Dat blijf jij zelf doen. Voor automatisch posten eist
TikTok een audit waarbij je account op privé moet staan en je elke video daarna
met de hand zichtbaar moet maken — dat is meer werk dan gewoon zelf posten.

---

## 1. Maak een app aan bij TikTok

Ga naar **developers.tiktok.com**, log in en maak een app.

- **Naam:** VoxClip Marketing Studio
- **Redirect URI:** `https://marketing-studio.vercel.app/api/tiktok/callback`
  (en later ook die van `marketing.voxclip.it`, zodra je domein staat)
- **Producten:** kies **Login Kit** en **Display API**
- **Scopes:** `user.info.basic` en `video.list`

Vraag géén Content Posting API aan. Dat is de audit die je niet nodig hebt.

Als je klaar bent heb je een **Client key** en een **Client secret**.

---

## 2. Zet drie waarden in Vercel

Ga naar je project op Vercel → **Settings** → **Environment Variables**. Voeg toe:

| Naam | Waarde |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | de client key van TikTok |
| `TIKTOK_CLIENT_SECRET` | het client secret van TikTok |
| `CRON_SECRET` | een lange willekeurige tekst die je zelf verzint |

Die laatste beschermt de nachtelijke ronde. Zonder zou iedereen die het adres
raadt jouw verzoeklimiet bij TikTok kunnen opmaken. Verzin iets van dertig tekens
of laat je wachtwoordbeheerder er een maken.

Klik daarna op **Redeploy**, anders kent de app ze nog niet.

---

## 3. Verbinden

Ga in de Studio naar **Channels**. Daar staat nu **TikTok-cijfers ophalen** met
een knop **Verbind TikTok**. Eén klik, inloggen bij TikTok, toestemming geven,
klaar.

---

## Daarna

Bij elke post die je afvinkt plak je de link van je TikTok erbij. Dat is het
haakje waarmee de cijfers bij de juiste video terechtkomen — zonder die link
blijft die post leeg, en dat zegt de samenvatting er ook bij.

De eerste ronde draait de nacht erop. Wil je het meteen zien, dan kun je hem
handmatig aftrappen; vraag me dan even om het commando.

---

## Wat er onder de motorkap gebeurt

- Je tokens gaan **versleuteld** de database in, met AES-256-GCM. Ze komen nooit
  in de browser en niet in de logs.
- Het toegangstoken wordt automatisch ververst vijf minuten voordat het verloopt.
- Elke ronde schrijft **nieuwe** waarnemingen in plaats van de oude te overschrijven,
  zodat je het verloop over de dagen houdt en ziet of een video na drie dagen nog
  aantrekt.
- Een ontbrekend cijfer wordt opgeslagen als *onbekend*, niet als nul. Nul views
  en "TikTok gaf niets terug" zijn twee verschillende dingen.
