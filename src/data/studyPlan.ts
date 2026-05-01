export type StudyDay = {
  week: number;
  day: number;
  modules: string[];
  estHours: number;
  label: string;
  isReview?: boolean;
  isFinal?: boolean;
};

export const STUDY_PLAN: StudyDay[] = [
  { week: 1, day: 1, modules: ["IG"], estHours: 4.5, label: "Information Gathering" },
  { week: 1, day: 2, modules: ["VS"], estHours: 2.9, label: "Vulnerability Scanning" },
  { week: 1, day: 3, modules: ["ITWAA"], estHours: 3.6, label: "Intro to Web App Attacks" },
  { week: 1, day: 4, modules: ["CWAA"], estHours: 4.2, label: "Common Web App Attacks" },
  { week: 1, day: 5, modules: ["SQLI"], estHours: 3.8, label: "SQL Injection Attacks" },
  { week: 1, day: 6, modules: ["CSA", "AVE"], estHours: 5.9, label: "Client-Side Attacks + AV Evasion" },
  { week: 1, day: 7, modules: ["LOCPE", "FE"], estHours: 4.7, label: "Locating Exploits + Fixing Exploits" },
  { week: 2, day: 8, modules: ["PA"], estHours: 4.3, label: "Password Attacks" },
  { week: 2, day: 9, modules: ["WPE"], estHours: 4.7, label: "Windows Privilege Escalation" },
  { week: 2, day: 10, modules: ["LPE"], estHours: 4.7, label: "Linux Privilege Escalation" },
  { week: 2, day: 11, modules: ["PRAT"], estHours: 4.5, label: "Port Redirection & SSH Tunneling" },
  { week: 2, day: 12, modules: ["PRAT2", "TMF"], estHours: 6.3, label: "Deep Packet Tunneling + Metasploit" },
  { week: 2, day: 13, modules: ["ADIE"], estHours: 5.5, label: "Active Directory Intro & Enumeration" },
  { week: 2, day: 14, modules: [], estHours: 0, label: "Week 2 Review & Catch-up", isReview: true },
  { week: 3, day: 15, modules: ["AADA"], estHours: 4.3, label: "Attacking AD Authentication" },
  { week: 3, day: 16, modules: ["ADLM"], estHours: 4.6, label: "AD Lateral Movement" },
  { week: 3, day: 17, modules: ["ATP"], estHours: 4.7, label: "Assembling the Pieces" },
  { week: 3, day: 18, modules: [], estHours: 0, label: "Final Review & Wrap-up", isFinal: true },
];

export const CODE_TO_DAY = STUDY_PLAN.reduce<Record<string, number>>((acc, day) => {
  day.modules.forEach((code) => {
    acc[code] = day.day;
  });
  return acc;
}, {});
