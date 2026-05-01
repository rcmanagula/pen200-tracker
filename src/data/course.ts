export type Chapter = {
  num: number;
  name: string;
  lessons: number[];
  missing?: number[];
};

export type CourseModule = {
  season: string;
  code: string;
  name: string;
  chapters: Chapter[];
};

export const COURSE: CourseModule[] = [
  { season: "01", code: "IG", name: "Information Gathering",
    chapters: [
      { num: 1, name: "The Penetration Testing Lifecycle", lessons: [] },
      { num: 2, name: "Passive Information Gathering", lessons: [1, 2, 3, 4, 5, 6] },
      { num: 3, name: "Active Information Gathering", lessons: [1, 3, 4, 5, 6], missing: [2] },
    ] },
  { season: "02", code: "VS", name: "Vulnerability Scanning",
    chapters: [
      { num: 1, name: "Vulnerability Scanning Theory", lessons: [] },
      { num: 2, name: "Vulnerability Scanning with Nessus", lessons: [2, 3, 4, 5, 6], missing: [1] },
      { num: 3, name: "Vulnerability Scanning with Nmap", lessons: [1, 2] },
    ] },
  { season: "03", code: "ITWAA", name: "Introduction to Web Application Attacks",
    chapters: [
      { num: 1, name: "Web Application Assessment Methodology", lessons: [] },
      { num: 2, name: "Web Application Assessment Tools", lessons: [1, 3, 4], missing: [2] },
      { num: 3, name: "Web Application Enumeration", lessons: [1, 2, 3] },
      { num: 4, name: "Cross-Site Scripting", lessons: [4, 5], missing: [1, 2, 3] },
    ] },
  { season: "04", code: "CWAA", name: "Common Web Application Attacks",
    chapters: [
      { num: 1, name: "Directory Traversal", lessons: [1, 2, 3] },
      { num: 2, name: "File Inclusion Vulnerabilities", lessons: [1, 2, 3] },
      { num: 3, name: "File Upload Vulnerabilities", lessons: [1, 2] },
      { num: 4, name: "Command Injection", lessons: [1] },
    ] },
  { season: "05", code: "SQLI", name: "SQL Injection Attacks",
    chapters: [
      { num: 1, name: "SQL Theory and Databases", lessons: [2], missing: [1] },
      { num: 2, name: "Manual SQL Exploitation", lessons: [1, 2, 3] },
      { num: 3, name: "Manual and Automated Code Execution", lessons: [1, 2] },
    ] },
  { season: "06", code: "CSA", name: "Client-Side Attacks",
    chapters: [
      { num: 1, name: "Target Reconnaissance", lessons: [1, 2] },
      { num: 2, name: "Exploiting Microsoft Office", lessons: [3], missing: [1, 2] },
      { num: 3, name: "Abusing Windows Library Files", lessons: [1] },
    ] },
  { season: "07", code: "AVE", name: "Antivirus Evasion",
    chapters: [
      { num: 1, name: "AV Software Key Components and Operations", lessons: [3], missing: [1, 2] },
      { num: 2, name: "Bypassing Antivirus Detections", lessons: [] },
      { num: 3, name: "AV Evasion in Practice", lessons: [2, 3], missing: [1] },
    ] },
  { season: "08", code: "PA", name: "Password Attacks",
    chapters: [
      { num: 1, name: "Attacking Network Services Logins", lessons: [1, 2] },
      { num: 2, name: "Password Cracking Fundamentals", lessons: [1, 2, 4, 5], missing: [3] },
      { num: 3, name: "Working with Password Hashes", lessons: [1, 2, 3, 4] },
    ] },
  { season: "09", code: "FE", name: "Fixing Exploits",
    chapters: [
      { num: 1, name: "Fixing Memory Corruption Exploits", lessons: [2, 3, 4, 5], missing: [1] },
      { num: 2, name: "Fixing Web Exploits", lessons: [2, 3], missing: [1] },
    ] },
  { season: "10", code: "LOCPE", name: "Locating Public Exploits",
    chapters: [
      { num: 1, name: "Getting Started", lessons: [] },
      { num: 2, name: "Online Exploit Resources", lessons: [] },
      { num: 3, name: "Offline Exploit Resources", lessons: [2, 3], missing: [1] },
      { num: 4, name: "Exploiting a Target", lessons: [1] },
    ] },
  { season: "11", code: "WPE", name: "Windows Privilege Escalation",
    chapters: [
      { num: 1, name: "Enumerating Windows", lessons: [2, 3, 4, 5], missing: [1] },
      { num: 2, name: "Leveraging Windows Services", lessons: [1, 2, 3] },
      { num: 3, name: "Abusing Other Windows Components", lessons: [1, 2] },
    ] },
  { season: "12", code: "LPE", name: "Linux Privilege Escalation",
    chapters: [
      { num: 1, name: "Enumerating Linux", lessons: [2, 3], missing: [1] },
      { num: 2, name: "Exposed Confidential Information", lessons: [1, 2] },
      { num: 3, name: "Insecure File Permissions", lessons: [1, 2] },
      { num: 4, name: "Insecure System Components", lessons: [1, 2, 3] },
    ] },
  { season: "13", code: "PRAT", name: "Port Redirection and SSH Tunneling",
    chapters: [
      { num: 1, name: "Why Port Redirection and Tunneling?", lessons: [] },
      { num: 2, name: "Port Forwarding with Linux Tools", lessons: [1, 2, 3] },
      { num: 3, name: "SSH Tunneling", lessons: [1, 2, 3, 4, 5] },
      { num: 4, name: "Port Forwarding with Windows Tools", lessons: [1, 2, 3] },
    ] },
  { season: "14", code: "PRAT2", name: "Tunneling Through Deep Packet Inspection",
    chapters: [
      { num: 1, name: "HTTP Tunneling Theory and Practice", lessons: [1, 2] },
      { num: 2, name: "DNS Tunneling Theory and Practice", lessons: [1, 2] },
    ] },
  { season: "15", code: "TMF", name: "The Metasploit Framework",
    chapters: [
      { num: 1, name: "Getting Familiar with Metasploit", lessons: [1, 2, 3] },
      { num: 2, name: "Using Metasploit Payloads", lessons: [1, 2, 3] },
      { num: 3, name: "Performing Post-Exploitation with Metasploit", lessons: [1, 2, 3] },
      { num: 4, name: "Automating Metasploit", lessons: [1] },
    ] },
  { season: "16", code: "ADIE", name: "Active Directory Intro and Enumeration",
    chapters: [
      { num: 1, name: "Active Directory - Introduction", lessons: [] },
      { num: 2, name: "Active Directory - Manual Enumeration", lessons: [1, 2, 3, 4] },
      { num: 3, name: "Manual Enumeration - Expanding our Repertoire", lessons: [1, 2, 3, 4, 5] },
      { num: 4, name: "Active Directory - Automated Enumeration", lessons: [1, 2] },
    ] },
  { season: "17", code: "AADA", name: "Attacking Active Directory Authentication",
    chapters: [
      { num: 1, name: "Understanding Active Directory Authentication", lessons: [3], missing: [1, 2] },
      { num: 2, name: "Performing Attacks on Active Directory Authentication", lessons: [1, 2, 3, 4, 5] },
    ] },
  { season: "18", code: "ADLM", name: "Lateral Movement in Active Directory",
    chapters: [
      { num: 1, name: "AD Lateral Movement Techniques", lessons: [1, 2, 3, 4, 5, 6] },
      { num: 2, name: "Active Directory Persistence", lessons: [1, 2] },
    ] },
  { season: "19", code: "ATP", name: "Assembling the Pieces",
    chapters: [
      { num: 1, name: "Enumerating the Public Network", lessons: [0, 1, 2] },
      { num: 2, name: "Attacking a Public Machine", lessons: [1, 2] },
      { num: 3, name: "Gaining Access to the Internal Network", lessons: [1, 2] },
      { num: 4, name: "Enumerating the Internal Network", lessons: [1, 2] },
      { num: 5, name: "Attacking an Internal Web Application", lessons: [1, 2] },
      { num: 6, name: "Gaining Access to the Domain Controller", lessons: [1, 2] },
    ] },
];
