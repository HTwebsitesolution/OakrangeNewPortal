/** Oakrange portal microcopy — consistent, professional, UK English */

export const brand = {
  tagline: "Calibration you can prove. Instantly.",
  companyName: "Oakrange Engineering",

  auth: {
    portalTitle: "Secure Certificate Portal",
    portalLead:
      "Access calibration certificates and compliance documents issued by Oakrange Engineering — securely, anytime.",
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
