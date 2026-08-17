"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Of de hulp aan staat, in een cookie.
 *
 * Een cookie en niet localStorage, zodat de server het al weet voordat de
 * pagina rendert. Anders zie je het paneel bij elke navigatie even opflitsen
 * voordat het zich wegdrukt, en dan is uitzetten niet echt uitzetten.
 */
const COOKIE = "voxclip_coach";

export async function isCoachHidden(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === "off";
}

async function setCoach(value: "on" | "off") {
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function hideCoach() {
  await setCoach("off");
  revalidatePath("/", "layout");
}

export async function showCoach() {
  await setCoach("on");
  revalidatePath("/", "layout");
}
