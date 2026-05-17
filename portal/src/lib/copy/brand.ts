/** Oakrange portal microcopy — consistent, professional, UK English */

export const brand = {
  tagline: "Calibration you can prove. Instantly.",
  companyName: "Oakrange Engineering",

  auth: {
    portalTitle: "Secure Certificate Portal",
    portalLead:
      "Access calibration certificates and compliance documents issued by Oakrange Engineering — securely, anytime.",
    login: {
      portalEyebrow: "Customer portal",
      websiteLabel: "Go to Oakrange website",
      websiteUrl: "https://www.oakrange.co.uk",
      contactUrl: "https://www.oakrange.co.uk/contact-us",
      heroTagline: "Testing the automotive industry to the limit.",
      heroLead:
        "Access calibration certificates, electrical reports, and liability / TUV certificates — all in one secure portal.",
      signInPrompt: "To view your certificates and reports, please sign in below.",
      welcomeTitle: "Welcome",
      welcomeLead:
        "This portal gives you access to calibration certificates, electrical reports, and liability and TUV certificates issued by Oakrange Engineering.",
      emailHint: "Use the email address or login details supplied by Oakrange.",
      noCredentials:
        "If you have not yet received your username and password, please contact us.",
      feedbackLead:
        "We welcome your feedback on the portal. Please let us know if you have any comments or suggestions.",
      vagNoticeTitle: "VAG customers",
      vagNotice:
        "If you are preparing for a VAG audit, please contact us so we can ensure your certificates and reports are ready.",
      companyLegal: "Oakrange Engineering Limited",
      address: "Manor Farm, Styrup Road, Oldcotes, S81 8JB",
      phone: "01709 542334",
      phoneTel: "+441709542334",
      webDesignLabel: "Designed by HTwebsolution",
      webDesignUrl: "https://htwebsolution.com",
    },
  },

  admin: {
    dashboardEyebrow: "Operations centre",
    dashboardTitle: "Admin dashboard",
    dashboardLead:
      "Monitor customers, certificates, and portal activity. Publish documents when calibrations are complete.",
    uploadPrimary: "Upload certificate",
    attentionTitle: "Certificates needing attention",
    attentionEmpty: "No certificates due in the next 30 days — you're up to date.",
    recentUploadsTitle: "Recent uploads",
    customersTitle: "Recently added customers",
    usersTitle: "Recently added users",
    uploadPageTitle: "Upload certificate",
    uploadPageLead:
      "Publish a calibration PDF to the secure portal. Customers only see documents after you publish.",
    uploadHelper:
      "Files are stored privately. Customers access certificates through time-limited signed links only.",
  },

  portal: {
    dashboardEyebrow: "Customer portal",
    dashboardTitle: "Dashboard",
    dashboardLead: (name: string) =>
      `Welcome back, ${name}. Here is a snapshot of your calibration certificates and site coverage.`,
    certificatesTitle: "Certificates",
    certificatesLead:
      "Published certificates you are authorised to view. Open, view, or download PDFs on any device.",
    certificatesEmpty:
      "No certificates are currently available for your account. Contact Oakrange if you expect documents here.",
    detailBack: "Back to certificates",
    mobileViewPdf: "View PDF",
    mobileDownload: "Download",
    sitesTitle: "Your sites",
  },
} as const;
