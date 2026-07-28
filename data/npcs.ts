import type { NPC } from "@/lib/types";

// Placeholder NPC roster. Later this moves behind lib/data.ts into
// Firestore / Realtime Database — keep the shape in lib/types.ts stable.
export const NPCS: NPC[] = [
  {
    id: "lyra-vess",
    name: "Lyra Vess",
    age: 31,
    gender: "Female",
    occupation: "Sigil Engineer",
    workplace: "S.K.AM Tower — R&D Level 12",
    home: "Apt 4C, Lantern Row",
    homeKnown: false,
    summary:
      "Senior sigil engineer on the Firmament Core team. Keeps irregular hours. Frequently seen at the Coppergate tram station after midnight.",
    portraitSeed: 1,
  },
  {
    id: "dorian-ashe",
    name: "Dorian Ashe",
    age: 47,
    gender: "Male",
    occupation: "Estate Broker",
    workplace: "Gilded Key Realty, Coppergate",
    home: "19 Wyrmshadow Lane",
    homeKnown: true,
    summary:
      "Handles most property transfers in the upper districts. Known to broker deals off the ledger for the right clientele.",
    portraitSeed: 2,
  },
  {
    id: "mera-quill",
    name: "Mera Quill",
    age: 26,
    gender: "Female",
    occupation: "Courier",
    workplace: "Aether Post — Spindle Depot",
    home: "Unknown boarding house, The Spindle",
    homeKnown: false,
    summary:
      "Fastest courier in the lower city. Carries sealed parcels for S.K.AM executives. Does not ask questions; does not answer them either.",
    portraitSeed: 3,
  },
  {
    id: "hollis-brandt",
    name: "Hollis Brandt",
    age: 58,
    gender: "Male",
    occupation: "Night Watch Captain",
    workplace: "Coppergate Watch House",
    home: "7 Emberfell Court",
    homeKnown: true,
    summary:
      "Runs the night shift across three districts. Owes gambling debts to the Vessel & Vine syndicate. Potentially cooperative.",
    portraitSeed: 4,
  },
  {
    id: "isolde-fane",
    name: "Isolde Fane",
    age: 39,
    gender: "Female",
    occupation: "Archivist",
    workplace: "Concord Hall of Records",
    home: "Unknown",
    homeKnown: false,
    summary:
      "Keeper of the civic archives. Has access to sealed property records predating the Concord Accords. Rarely leaves the Hall before dark.",
    portraitSeed: 5,
  },
];
