import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Een server action mag standaard één megabyte ontvangen; dat is ruim voor
     * een formulier en niets voor een video.
     *
     * Hier stond even 26mb, en dat was een belofte die de hosting niet kan
     * waarmaken: Vercel kapt elk verzoek aan een serverless function af op
     * 4,5 MB. Hoger zetten verandert daar niets aan — het verzoek komt gewoon
     * nooit aan.
     *
     * Dus staat het op wat er echt doorheen past, net boven `MAX_BYTES`, zodat
     * de app "te groot" zegt met een leesbare reden in plaats van dat het
     * platform de verbinding verbreekt.
     *
     * Zie https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE
     */
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
