// Seed content for the student "Support & Safety" pages (Immediate Help, University Support,
// Safety Guidance). It is served by GET /api/support/contacts, so editing this file (no database
// migration needed) changes what students see after a backend restart.
//
// IMPORTANT: confirm every number and link below with your university / local authorities before
// release. Entries with an empty `phone` simply show without a call button.
// Numbers are Sri Lankan national services; replace them if your campus is elsewhere.

const supportDirectory = {
  immediate: {
    intro: "If you or someone else is in immediate danger, call emergency services first. Then, if you can, tell a person you trust where you are.",
    steps: [
      { title: "Get to a safer place", text: "If you can, move away from whatever is putting you at risk, and towards other people." },
      { title: "Call for help", text: "Use one of the emergency numbers below. You do not need to explain everything - say where you are and that you need help." },
      { title: "Don't stay alone", text: "Ask a friend, family member, lecturer or security officer to stay with you until help arrives." }
    ],
    contacts: [
      { name: "Police emergency", description: "Immediate danger, violence or any urgent threat to safety.", phone: "119", website: "", availability: "24 hours" },
      { name: "Suwa Seriya ambulance", description: "Free ambulance service for medical emergencies.", phone: "1990", website: "", availability: "24 hours" },
      { name: "National Mental Health Helpline", description: "Confidential support if you are in distress or having thoughts of harming yourself.", phone: "1926", website: "", availability: "24 hours" },
      { name: "Sumithrayo", description: "Free, confidential emotional support from trained volunteers.", phone: "0112682535", website: "https://www.sumithrayo.org", availability: "Daily, check website for hours" },
      { name: "CCC Line", description: "Free helpline for emotional support and guidance.", phone: "1333", website: "", availability: "24 hours" }
    ]
  },

  university: {
    intro: "Your university has people whose job is to help you. You do not need to be in crisis to reach out.",
    contacts: [
      { name: "University counselling", description: "Book a confidential session with an approved counsellor from the Counsellors tab in this app.", phone: "", website: "", availability: "Book in the app" },
      { name: "Student Affairs / Welfare", description: "Help with personal difficulties, financial hardship, accommodation and getting your studies back on track.", phone: "", website: "https://www.sliit.lk", availability: "Weekdays, university hours" },
      { name: "Academic advisors & lecturers", description: "Talk about extensions, deadlines, exam arrangements or a lighter workload when stress is affecting your work.", phone: "", website: "", availability: "Through your faculty office" },
      { name: "Campus security", description: "Report any safety concern on campus, or ask for an escort if you feel unsafe.", phone: "", website: "", availability: "24 hours, via the nearest security post" },
      { name: "Health centre / medical room", description: "Physical health concerns, including sleep, appetite and anxiety symptoms.", phone: "", website: "", availability: "Weekdays, university hours" }
    ]
  },

  safety: {
    intro: "Safety looks different for everyone. These are small, practical steps you can take one at a time.",
    steps: [
      { title: "Pause and breathe", text: "Slow your breathing: in for 4, hold for 4, out for 6. Repeat a few times. It will not fix everything, but it helps you think more clearly." },
      { title: "Make your space safer", text: "If you are worried you might hurt yourself, put distance between you and anything you could use to do so, and move to a room with other people." },
      { title: "Reach one person", text: "Message or call someone you trust, even just to say \"I'm having a hard time\". Your Trusted Person page in this app can help." },
      { title: "Use a helpline if you can't reach anyone", text: "National Mental Health Helpline 1926 is free, confidential and open 24 hours." },
      { title: "If you feel unsafe around someone", text: "Leave if you can, go where there are other people, and tell campus security or a person you trust. Police: 119. Women's helpline: 1938. Child protection: 1929." },
      { title: "Plan the next day", text: "Book a counsellor, tell your advisor if studies are suffering, and keep sleep, food and water simple and regular." }
    ],
    contacts: [
      { name: "Women's helpline", description: "Support after violence, harassment or abuse.", phone: "1938", website: "", availability: "24 hours" },
      { name: "Child protection hotline", description: "Report abuse or neglect of anyone under 18.", phone: "1929", website: "", availability: "24 hours" }
    ]
  }
};

module.exports = supportDirectory;
