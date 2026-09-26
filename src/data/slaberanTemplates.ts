import type { SlaberanTemplate } from "../types/slaberan";

export const slaberanTemplates: SlaberanTemplate[] = [
  {
    id: "neurologi-deviyanty-v1",
    name: "Slaberan Neurologi — dr. Deviyanty",
    specialty: "Neurologi",
    hospital: "RSUD Sawerigading Palopo",
    opening:
      "Assalamualaikum warahmatullahi wabarakatuh dok, tabe dok, mohon izin mengirimkan slaberan hari ini dok",
    showEmptyRooms: true,
    locationGroups: [
      {
        label: "Lantai 1",
        rooms: ["Anggrek", "Bougenville", "Cemara", "Dahlia", "Edelwais"],
      },
      {
        label: "Lantai 2",
        rooms: [
          "Anggrek",
          "Cemara",
          "Dahlia",
          "Flamboyan",
          "Edelwais",
          "Geranium",
        ],
      },
    ],
    specialRooms: ["CVCU/ICCU", "ICU", "IGD"],
  },
];

export function getDefaultSlaberanTemplate() {
  return slaberanTemplates[0];
}
