import { atom } from "jotai";
import type { UserProfile } from "@/api/apiSchemas";

export const currentAuthUserAtom = atom<UserProfile | null>(null);
