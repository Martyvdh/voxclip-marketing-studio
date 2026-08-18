#!/bin/bash
#
# Dubbelklik dit bestand om te pushen.
#
# Meer dan `git push` doet het niet, maar het opent zijn eigen venster, laat
# eerst zien wat er weggaat, en blijft daarna open zodat je de uitslag kunt
# lezen. Een terminal die meteen weer dichtklapt is de reden dat je dit vraagt.

cd "$(dirname "$0")" || exit 1

echo ""
echo "  VoxClip Marketing Studio"
echo "  ------------------------"
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo "  Let op: er staan nog niet-vastgelegde wijzigingen open."
  echo "  Die gaan NIET mee. Alleen commits worden gepusht."
  echo ""
fi

AHEAD=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')

if [ "$AHEAD" = "0" ]; then
  echo "  Niets te pushen. Alles staat al op GitHub."
  echo ""
  echo "  Druk op Enter om te sluiten."
  read -r
  exit 0
fi

echo "  Dit gaat weg ($AHEAD commit(s)):"
echo ""
git log --oneline origin/main..HEAD | sed 's/^/    /'
echo ""
echo "  Pushen..."
echo ""

if git push; then
  echo ""
  echo "  Gelukt. Vercel bouwt nu vanzelf, dat duurt een minuut of twee."
else
  echo ""
  echo "  Er ging iets mis. De melding staat hierboven."
fi

echo ""
echo "  Druk op Enter om te sluiten."
read -r
