export type Chapter = {
  num: number;
  name: string;
  lessons: number[];
  missing?: number[];
  durations?: number[];
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
      { num: 2, name: "Passive Information Gathering", lessons: [1, 2, 3, 4, 5, 6], durations: [128, 265, 107, 99, 141, 153] },
      { num: 3, name: "Active Information Gathering", lessons: [1, 3, 4, 5, 6], missing: [2], durations: [602, 1069, 289, 191, 386] },
    ] },
  { season: "02", code: "VS", name: "Vulnerability Scanning",
    chapters: [
      { num: 1, name: "Vulnerability Scanning Theory", lessons: [] },
      { num: 2, name: "Vulnerability Scanning with Nessus", lessons: [2, 3, 4, 5, 6], missing: [1], durations: [287, 360, 433, 435, 407] },
      { num: 3, name: "Vulnerability Scanning with Nmap", lessons: [1, 2], durations: [318, 225] },
    ] },
  { season: "03", code: "ITWAA", name: "Introduction to Web Application Attacks",
    chapters: [
      { num: 1, name: "Web Application Assessment Methodology", lessons: [] },
      { num: 2, name: "Web Application Assessment Tools", lessons: [1, 3, 4], missing: [2], durations: [85, 96, 644] },
      { num: 3, name: "Web Application Enumeration", lessons: [1, 2, 3], durations: [213, 201, 627] },
      { num: 4, name: "Cross-Site Scripting", lessons: [4, 5], missing: [1, 2, 3], durations: [240, 613] },
    ] },
  { season: "04", code: "CWAA", name: "Common Web Application Attacks",
    chapters: [
      { num: 1, name: "Directory Traversal", lessons: [1, 2, 3], durations: [292, 586, 142] },
      { num: 2, name: "File Inclusion Vulnerabilities", lessons: [1, 2, 3], durations: [651, 395, 191] },
      { num: 3, name: "File Upload Vulnerabilities", lessons: [1, 2], durations: [525, 525] },
      { num: 4, name: "Command Injection", lessons: [1], durations: [500] },
    ] },
  { season: "05", code: "SQLI", name: "SQL Injection Attacks",
    chapters: [
      { num: 1, name: "SQL Theory and Databases", lessons: [2], missing: [1], durations: [336] },
      { num: 2, name: "Manual SQL Exploitation", lessons: [1, 2, 3], durations: [312, 360, 179] },
      { num: 3, name: "Manual and Automated Code Execution", lessons: [1, 2], durations: [273, 320] },
    ] },
  { season: "06", code: "CSA", name: "Client-Side Attacks",
    chapters: [
      { num: 1, name: "Target Reconnaissance", lessons: [1, 2], durations: [240, 355] },
      { num: 2, name: "Exploiting Microsoft Office", lessons: [3], missing: [1, 2], durations: [759] },
      { num: 3, name: "Abusing Windows Library Files", lessons: [1], durations: [939] },
    ] },
  { season: "07", code: "AVE", name: "Antivirus Evasion",
    chapters: [
      { num: 1, name: "AV Software Key Components and Operations", lessons: [3], missing: [1, 2], durations: [404] },
      { num: 2, name: "Bypassing Antivirus Detections", lessons: [] },
      { num: 3, name: "AV Evasion in Practice", lessons: [2, 3], missing: [1], durations: [803, 463] },
    ] },
  { season: "08", code: "PA", name: "Password Attacks",
    chapters: [
      { num: 1, name: "Attacking Network Services Logins", lessons: [1, 2], durations: [242, 383] },
      { num: 2, name: "Password Cracking Fundamentals", lessons: [1, 2, 4, 5], missing: [3], durations: [496, 769, 460, 656] },
      { num: 3, name: "Working with Password Hashes", lessons: [1, 2, 3, 4], durations: [389, 561, 332, 278] },
    ] },
  { season: "09", code: "FE", name: "Fixing Exploits",
    chapters: [
      { num: 1, name: "Fixing Memory Corruption Exploits", lessons: [2, 3, 4, 5], missing: [1], durations: [143, 147, 352, 240] },
      { num: 2, name: "Fixing Web Exploits", lessons: [2, 3], missing: [1], durations: [237, 210] },
    ] },
  { season: "10", code: "LOCPE", name: "Locating Public Exploits",
    chapters: [
      { num: 1, name: "Getting Started", lessons: [] },
      { num: 2, name: "Online Exploit Resources", lessons: [] },
      { num: 3, name: "Offline Exploit Resources", lessons: [2, 3], missing: [1], durations: [259, 83] },
      { num: 4, name: "Exploiting a Target", lessons: [1], durations: [525] },
    ] },
  { season: "11", code: "WPE", name: "Windows Privilege Escalation",
    chapters: [
      { num: 1, name: "Enumerating Windows", lessons: [2, 3, 4, 5], missing: [1], durations: [1170, 616, 723, 391] },
      { num: 2, name: "Leveraging Windows Services", lessons: [1, 2, 3], durations: [1056, 986, 752] },
      { num: 3, name: "Abusing Other Windows Components", lessons: [1, 2], durations: [313, 533] },
    ] },
  { season: "12", code: "LPE", name: "Linux Privilege Escalation",
    chapters: [
      { num: 1, name: "Enumerating Linux", lessons: [2, 3], missing: [1], durations: [1457, 201] },
      { num: 2, name: "Exposed Confidential Information", lessons: [1, 2], durations: [342, 195] },
      { num: 3, name: "Insecure File Permissions", lessons: [1, 2], durations: [200, 172] },
      { num: 4, name: "Insecure System Components", lessons: [1, 2, 3], durations: [486, 294, 335] },
    ] },
  { season: "13", code: "PRAT", name: "Port Redirection and SSH Tunneling",
    chapters: [
      { num: 1, name: "Why Port Redirection and Tunneling?", lessons: [] },
      { num: 2, name: "Port Forwarding with Linux Tools", lessons: [1, 2, 3], durations: [247, 574, 519] },
      { num: 3, name: "SSH Tunneling", lessons: [1, 2, 3, 4, 5], durations: [844, 543, 438, 409, 175] },
      { num: 4, name: "Port Forwarding with Windows Tools", lessons: [1, 2, 3], durations: [305, 476, 442] },
    ] },
  { season: "14", code: "PRAT2", name: "Tunneling Through Deep Packet Inspection",
    chapters: [
      { num: 1, name: "HTTP Tunneling Theory and Practice", lessons: [1, 2], durations: [129, 602] },
      { num: 2, name: "DNS Tunneling Theory and Practice", lessons: [1, 2], durations: [840, 408] },
    ] },
  { season: "15", code: "TMF", name: "The Metasploit Framework",
    chapters: [
      { num: 1, name: "Getting Familiar with Metasploit", lessons: [1, 2, 3], durations: [443, 511, 657] },
      { num: 2, name: "Using Metasploit Payloads", lessons: [1, 2, 3], durations: [195, 610, 503] },
      { num: 3, name: "Performing Post-Exploitation with Metasploit", lessons: [1, 2, 3], durations: [591, 482, 661] },
      { num: 4, name: "Automating Metasploit", lessons: [1], durations: [378] },
    ] },
  { season: "16", code: "ADIE", name: "Active Directory Intro and Enumeration",
    chapters: [
      { num: 1, name: "Active Directory - Introduction", lessons: [] },
      { num: 2, name: "Active Directory - Manual Enumeration", lessons: [1, 2, 3, 4], durations: [240, 462, 833, 276] },
      { num: 3, name: "Manual Enumeration - Expanding our Repertoire", lessons: [1, 2, 3, 4, 5], durations: [107, 909, 153, 453, 333] },
      { num: 4, name: "Active Directory - Automated Enumeration", lessons: [1, 2], durations: [195, 1002] },
    ] },
  { season: "17", code: "AADA", name: "Attacking Active Directory Authentication",
    chapters: [
      { num: 1, name: "Understanding Active Directory Authentication", lessons: [3], missing: [1, 2], durations: [314] },
      { num: 2, name: "Performing Attacks on Active Directory Authentication", lessons: [1, 2, 3, 4, 5], durations: [703, 339, 315, 520, 280] },
    ] },
  { season: "18", code: "ADLM", name: "Lateral Movement in Active Directory",
    chapters: [
      { num: 1, name: "AD Lateral Movement Techniques", lessons: [1, 2, 3, 4, 5, 6], durations: [628, 109, 86, 400, 292, 222] },
      { num: 2, name: "Active Directory Persistence", lessons: [1, 2], durations: [362, 193] },
    ] },
  { season: "19", code: "ATP", name: "Assembling the Pieces",
    chapters: [
      { num: 1, name: "Enumerating the Public Network", lessons: [0, 1, 2], durations: [53, 373, 548] },
      { num: 2, name: "Attacking a Public Machine", lessons: [1, 2], durations: [339, 794] },
      { num: 3, name: "Gaining Access to the Internal Network", lessons: [1, 2], durations: [288, 570] },
      { num: 4, name: "Enumerating the Internal Network", lessons: [1, 2], durations: [989, 925] },
      { num: 5, name: "Attacking an Internal Web Application", lessons: [1, 2], durations: [212, 533] },
      { num: 6, name: "Gaining Access to the Domain Controller", lessons: [1, 2], durations: [162, 73] },
    ] },
];
