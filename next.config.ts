import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Een server action mag standaard één megabyte ontvangen.
     *
     * Dat is ruim voor een formulier en niets voor een video. Een upload van
     * een paar megabyte klapte er daarom uit voordat onze eigen controle in
     * `src/lib/assets/rules.ts` ook maar keek naar het bestand — je kreeg een
     * kapotte pagina in plaats van "dit bestand is te groot".
     *
     * Deze grens ligt bewust net boven `MAX_BYTES`. Zo is de app degene die
     * "te groot" zegt, met een leesbare reden, in plaats van het raamwerk dat
     * de verbinding verbreekt.
     */
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
