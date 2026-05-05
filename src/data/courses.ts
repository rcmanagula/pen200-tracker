import { BSCP_TOTAL_LABS } from "@/data/bscp";
import { COURSE } from "@/data/course";
import { WEB200_COURSE } from "@/data/web200";
import { WEB300_COURSE } from "@/data/web300";

export type CourseId = "pen200" | "bscp" | "web200" | "web300";

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

function totalLessons(course: typeof COURSE): number {
  return course.reduce((moduleSum, module) => {
    return moduleSum + module.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.lessons.length, 0);
  }, 0);
}

const pen200Total = totalLessons(COURSE);
const web200Total = totalLessons(WEB200_COURSE);
const web300Total = totalLessons(WEB300_COURSE);

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
  {
    id: "web200",
    name: "OffSec WEB-200 (OSWA)",
    shortName: "WEB-200",
    description: "Web Attacks with Kali Linux - OSWA exam prep",
    icon: "W2",
    accentColor: "blue",
    totalItems: web200Total,
    href: "web200",
  },
  {
    id: "web300",
    name: "OffSec WEB-300 (OSWE)",
    shortName: "WEB-300",
    description: "Advanced Web Attacks and Exploitation - OSWE exam prep",
    icon: "W3",
    accentColor: "purple",
    totalItems: web300Total,
    href: "web300",
  },
];
