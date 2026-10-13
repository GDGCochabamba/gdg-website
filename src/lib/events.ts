import type { ImageMetadata } from "astro";
import rawEvents from "../data/events.json";

// Events are synced from gdg.community.dev into the repo by
// scripts/sync-community-events.mjs, so the site never queries a backend.

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
  title: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  description: string;
  url: string;
  virtual: boolean;
  banner?: ImageMetadata;
  /** The banner is gdg.community.dev's generic one, not made for this event. */
  defaultBanner: boolean;
}

const banners = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/events/*.jpg",
  { eager: true },
);

export function listEvents(): PublicEvent[] {
  return rawEvents
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type as EventType,
      startDate: new Date(e.start),
      endDate: new Date(e.end),
      description: e.description,
      url: e.url,
      virtual: e.virtual,
      banner: e.banner
        ? banners[`../assets/events/${e.banner}`]?.default
        : undefined,
      defaultBanner: e.defaultBanner,
    }))
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

const longDate = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/La_Paz",
});

const shortRange = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  timeZone: "America/La_Paz",
});

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" });

export function formatEventDate(e: PublicEvent): string {
  const sameDay = dayKey.format(e.startDate) === dayKey.format(e.endDate);
  if (sameDay) return longDate.format(e.startDate);
  const sameYear = e.startDate.getFullYear() === e.endDate.getFullYear();
  if (sameYear) {
    return `${shortRange.format(e.startDate)} – ${longDate.format(e.endDate)}`;
  }
  return `${longDate.format(e.startDate)} – ${longDate.format(e.endDate)}`;
}
