import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type EventStatus = "upcoming" | "live" | "past";

export type EventType =
  | "devfest"
  | "io-extended"
  | "build-with-ai"
  | "techjoin"
  | "wgj"
  | "iwd"
  | "custom";

export interface PublicEvent {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  edition: number;
  status: EventStatus;
  featured: boolean;
  startDate: Date;
  endDate: Date;
  tagline: string;
  description: string;
  externalUrl: string;
  registrationUrl?: string;
  logoUrl: string;
  coverImageUrl: string;
}

export async function listPublicEvents(): Promise<PublicEvent[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), "events"),
      where("status", "in", ["upcoming", "live", "past"]),
      orderBy("startDate", "desc"),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      slug: data.slug,
      name: data.name,
      type: data.type,
      edition: data.edition,
      status: data.status,
      featured: data.featured ?? false,
      startDate: (data.startDate as Timestamp).toDate(),
      endDate: (data.endDate as Timestamp).toDate(),
      tagline: data.tagline ?? "",
      description: data.description ?? "",
      externalUrl: data.externalUrl ?? "",
      registrationUrl: data.registrationUrl,
      logoUrl: data.logoUrl ?? "",
      coverImageUrl: data.coverImageUrl ?? "",
    };
  });
}

const longDate = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortRange = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
});

export function formatEventDate(e: PublicEvent): string {
  const sameDay = e.startDate.toDateString() === e.endDate.toDateString();
  if (sameDay) return longDate.format(e.startDate);
  const sameYear = e.startDate.getFullYear() === e.endDate.getFullYear();
  if (sameYear) {
    return `${shortRange.format(e.startDate)} – ${longDate.format(e.endDate)}`;
  }
  return `${longDate.format(e.startDate)} – ${longDate.format(e.endDate)}`;
}
