import { BSCP_TOTAL_LABS } from "@/data/bscp";
import { COURSE } from "@/data/course";

export type CourseId = "pen200" | "bscp";

export interface Course {
  id: CourseId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  accentColor: string;
  totalItems: number;
  href: string;
}

const pen200Total = COURSE.reduce((moduleSum, module) => {
  return moduleSum + module.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.lessons.length, 0);
}, 0);

export const COURSES: Course[] = [
  {
    id: "pen200",
    name: "OffSec PEN-200 (OSCP)",
    shortName: "PEN-200",
    description: "Penetration Testing with Kali Linux - OSCP exam prep",
    icon: "P2",
    accentColor: "red",
    totalItems: pen200Total,
    href: "pen200",
  },
  {
    id: "bscp",
    name: "PortSwigger Web Security Academy",
    shortName: "BSCP",
    description: "274 labs covering web app security - BSCP cert prep",
    icon: "BS",
    accentColor: "orange",
    totalItems: BSCP_TOTAL_LABS,
    href: "bscp",
  },
];
