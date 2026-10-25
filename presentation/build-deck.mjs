import PptxGenJS from "pptxgenjs";

const C = {
  navy: "0F172A",
  charcoal: "111827",
  orange: "F97316",
  amber: "F59E0B",
  bg: "F8FAFC",
  card: "FFFFFF",
  border: "E5E7EB",
  muted: "64748B",
  slate300: "CBD5E1",
  slate400: "94A3B8",
  slate700: "334155",
  orangeTint: "FFF7ED",
  siteOff: "E2E8F0",
};
const FONT = "Segoe UI";
const OUT = "Oakrange-Portal-Access-Levels.pptx";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.author = "Oakrange Engineering";
pres.company = "Oakrange Engineering";
pres.title = "Oakrange Certificate Portal - Access levels";

function logo(slide, x, y, size, { dark }) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w: size, h: size,
    fill: { color: C.orange }, line: { color: C.orange }, rectRadius: size * 0.22,
  });
  slide.addText("OE", {
    x, y, w: size, h: size, align: "center", valign: "middle",
    fontFace: FONT, fontSize: size * 26, bold: true, color: "FFFFFF", margin: 0,
  });
  slide.addText(
    [
      { text: "Oakrange Engineering", options: { bold: true, fontSize: Math.max(14, size * 22), color: dark ? "FFFFFF" : C.navy, breakLine: true } },
      { text: "Certificate Portal", options: { fontSize: Math.max(11, size * 17), color: dark ? C.slate400 : C.muted } },
    ],
    { x: x + size + 0.15, y, w: 4, h: size, valign: "middle", fontFace: FONT, margin: 0 },
  );
}

function heading(slide, title, subtitle) {
  slide.addText("ACCESS LEVELS", {
    x: 0.75, y: 1.0, w: 6, h: 0.3, fontFace: FONT, fontSize: 12, bold: true,
    color: C.orange, charSpacing: 2, margin: 0,
  });
  slide.addText(title, {
    x: 0.75, y: 1.3, w: 11.8, h: 0.65, fontFace: FONT, fontSize: 30, bold: true,
    color: C.navy, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.75, y: 1.95, w: 11.8, h: 0.4, fontFace: FONT, fontSize: 15,
      color: C.muted, margin: 0,
    });
  }
}

// ---------- Slide 1: title ----------
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  logo(s, 0.9, 0.8, 0.75, { dark: true });

  s.addShape(pres.ShapeType.rect, {
    x: 0.9, y: 2.75, w: 1.2, h: 0.08, fill: { color: C.orange }, line: { color: C.orange },
  });
  s.addText("One portal, the right access for every team", {
    x: 0.9, y: 3.0, w: 10.5, h: 1.6, fontFace: FONT, fontSize: 44, bold: true,
    color: "FFFFFF", valign: "top", margin: 0,
  });
  s.addText("Everyone sees exactly the certificates they're responsible for, and nothing else.", {
    x: 0.9, y: 4.75, w: 10.5, h: 0.6, fontFace: FONT, fontSize: 20,
    color: C.slate300, margin: 0,
  });
  s.addText("Precision calibration. Trusted results.", {
    x: 0.9, y: 6.6, w: 8, h: 0.4, fontFace: FONT, fontSize: 14, bold: true,
    color: C.orange, margin: 0,
  });

  s.addNotes(
    "Oakrange customers range from a single workshop to groups with many dealerships. " +
    "The portal gives each person exactly the right view: their own site, the sites they manage, or the whole company.",
  );
}

// ---------- Slide 2: the three levels ----------
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  logo(s, 0.75, 0.35, 0.45, { dark: false });
  heading(
    s,
    "Three levels of access, one login each",
    "Oakrange sets each person up with the level that matches their role.",
  );

  const levels = [
    {
      label: "LEVEL 1",
      title: "Single site",
      who: "Customers with one location.",
      sees: "Their own site's certificates only.",
      example: "e.g. a single dealership or workshop",
      sitesOn: [true, false, false, false],
      company: false,
    },
    {
      label: "LEVEL 2",
      title: "Team manager",
      who: "One login for every site they look after.",
      sees: "Certificates for all of their sites in one dashboard.",
      example: "e.g. a regional manager covering several dealerships",
      sitesOn: [true, true, true, false],
      company: false,
    },
    {
      label: "LEVEL 3",
      title: "Whole company",
      who: "Head office or group compliance.",
      sees: "Every site plus company-wide documents. New sites are included automatically.",
      example: "e.g. a group's compliance or head-office team",
      sitesOn: [true, true, true, true],
      company: true,
    },
  ];

  const cardY = 2.5;
  const cardH = 3.8;
  const cardW = 3.71;
  const gap = 0.35;

  levels.forEach((lvl, i) => {
    const x = 0.75 + i * (cardW + gap);

    s.addShape(pres.ShapeType.rect, {
      x, y: cardY, w: cardW, h: cardH,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
      shadow: { type: "outer", color: "000000", opacity: 0.08, blur: 6, offset: 2, angle: 90 },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y: cardY, w: cardW, h: 0.09, fill: { color: C.orange }, line: { color: C.orange },
    });

    const pad = 0.3;
    const innerW = cardW - pad * 2;

    s.addText(lvl.label, {
      x: x + pad, y: cardY + 0.3, w: innerW, h: 0.25, fontFace: FONT, fontSize: 11,
      bold: true, color: C.orange, charSpacing: 2, margin: 0,
    });
    s.addText(lvl.title, {
      x: x + pad, y: cardY + 0.55, w: innerW, h: 0.5, fontFace: FONT, fontSize: 24,
      bold: true, color: C.navy, margin: 0,
    });

    // Site diagram: orange squares are the sites this level can see.
    const sq = 0.42;
    const sqGap = 0.14;
    lvl.sitesOn.forEach((on, j) => {
      s.addShape(pres.ShapeType.roundRect, {
        x: x + pad + j * (sq + sqGap), y: cardY + 1.18, w: sq, h: sq,
        fill: { color: on ? C.orange : C.siteOff }, line: { color: on ? C.orange : C.siteOff },
        rectRadius: 0.06,
      });
    });
    const docX = x + pad + 4 * (sq + sqGap);
    s.addText("Company docs", {
      x: docX, y: cardY + 1.18, w: innerW - 4 * (sq + sqGap), h: sq,
      fontFace: FONT, fontSize: 10, bold: true, align: "center", valign: "middle", margin: 0,
      color: lvl.company ? "FFFFFF" : C.slate400,
      fill: { color: lvl.company ? C.navy : C.siteOff },
    });

    s.addText(
      [
        { text: lvl.who, options: { color: C.slate700, breakLine: true } },
        { text: " ", options: { fontSize: 6, breakLine: true } },
        { text: lvl.sees, options: { color: C.navy, bold: true } },
      ],
      {
        x: x + pad, y: cardY + 1.8, w: innerW, h: 1.15, fontFace: FONT, fontSize: 13,
        valign: "top", margin: 0, paraSpaceAfter: 2,
      },
    );

    s.addText(lvl.example, {
      x: x + pad, y: cardY + cardH - 0.82, w: innerW, h: 0.58, fontFace: FONT, fontSize: 11,
      italic: true, color: C.muted, valign: "middle", margin: [0, 8, 0, 8],
      fill: { color: C.orangeTint },
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 0.75, y: 6.5, w: 11.83, h: 0.62, fill: { color: C.navy }, line: { color: C.navy },
    rectRadius: 0.08,
  });
  s.addText(
    [
      { text: "Secure by design  ", options: { bold: true, color: C.orange } },
      {
        text: "Access is set up by Oakrange and enforced in the database, so certificates stay private to the people allowed to see them.",
        options: { color: "FFFFFF" },
      },
    ],
    { x: 1.0, y: 6.5, w: 11.4, h: 0.62, fontFace: FONT, fontSize: 12.5, valign: "middle", margin: 0 },
  );

  s.addNotes(
    "Level 1, single site: staff at a single location only ever see that site's certificates.\n" +
    "Level 2, team manager: Oakrange assigns the sites the manager looks after. One login, one dashboard, " +
    "certificates for all of those sites, and nothing from sites they don't manage.\n" +
    "Level 3, whole company: head office sees every site plus company-wide documents. " +
    "When Oakrange adds a new site, it appears automatically.\n" +
    "This is enforced in the database itself, not just hidden on screen.",
  );
}

// ---------- Slide 3: screenshots ----------
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  logo(s, 0.75, 0.35, 0.45, { dark: false });
  heading(s, "What each person sees when they log in");

  const shots = [
    {
      path: "images/team-manager-dashboard.png",
      label: "Team manager",
      caption: "Dashboard shows only the 2 sites they manage.",
    },
    {
      path: "images/whole-company-dashboard.png",
      label: "Whole company",
      caption: "Dashboard covers all sites in the company.",
    },
  ];
  const imgW = 5.6;
  const imgH = imgW * (720 / 1024);
  shots.forEach((shot, i) => {
    const x = 0.75 + i * (imgW + 0.63);
    s.addText(
      [
        { text: shot.label + "   ", options: { bold: true, color: C.orange } },
        { text: shot.caption, options: { color: C.slate700 } },
      ],
      { x, y: 2.15, w: imgW, h: 0.4, fontFace: FONT, fontSize: 14, valign: "middle", margin: 0 },
    );
    s.addShape(pres.ShapeType.rect, {
      x: x - 0.03, y: 2.67, w: imgW + 0.06, h: imgH + 0.06,
      fill: { color: C.card }, line: { color: C.border, width: 1 },
      shadow: { type: "outer", color: "000000", opacity: 0.1, blur: 8, offset: 3, angle: 90 },
    });
    s.addImage({ path: shot.path, x, y: 2.7, w: imgW, h: imgH });
  });

  s.addNotes(
    "Left: a team manager assigned to two sites. The dashboard says 2 assigned sites and lists just those.\n" +
    "Right: a whole-company login. The dashboard says All sites.\n" +
    "Same portal, same screens; the difference is purely which certificates each person is allowed to see.",
  );
}

// ---------- Slide 4: live demo ----------
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  logo(s, 0.9, 0.6, 0.6, { dark: true });

  s.addShape(pres.ShapeType.rect, {
    x: 0.9, y: 2.0, w: 1.2, h: 0.08, fill: { color: C.orange }, line: { color: C.orange },
  });
  s.addText("Live demo", {
    x: 0.9, y: 2.2, w: 10, h: 1.0, fontFace: FONT, fontSize: 48, bold: true,
    color: "FFFFFF", margin: 0,
  });

  const steps = [
    ["1", "Single site", "One site's certificates"],
    ["2", "Team manager", "Several sites from one login"],
    ["3", "Whole company", "Every site and company docs"],
  ];
  steps.forEach(([n, title, desc], i) => {
    const x = 0.9 + i * 3.95;
    const y = 4.0;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 3.65, h: 1.5, fill: { color: C.charcoal }, line: { color: C.slate700, width: 1 },
      rectRadius: 0.1,
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.3, y: y + 0.3, w: 0.5, h: 0.5, fill: { color: C.orange }, line: { color: C.orange },
    });
    s.addText(n, {
      x: x + 0.3, y: y + 0.3, w: 0.5, h: 0.5, align: "center", valign: "middle",
      fontFace: FONT, fontSize: 16, bold: true, color: "FFFFFF", margin: 0,
    });
    s.addText(
      [
        { text: title, options: { bold: true, fontSize: 18, color: "FFFFFF", breakLine: true } },
        { text: desc, options: { fontSize: 13, color: C.slate300 } },
      ],
      { x: x + 0.95, y: y + 0.2, w: 2.55, h: 1.1, fontFace: FONT, valign: "middle", margin: 0 },
    );
  });

  s.addNotes(
    "DEMO SCRIPT - presenter only. Do not show these logins on screen.\n" +
    "Site: www.oakrangeportal.co.uk  |  Password for all three: Testing  |  Log out between each step.\n\n" +
    "1. Single site - username Soton1018\n" +
    "   Dashboard shows 1 assigned site (Southampton Port Depot) and its 2 certificates. Nothing from Bristol or Manchester.\n\n" +
    "2. Team manager - username meridianmanager\n" +
    "   Dashboard shows 2 assigned sites: Bristol Distribution Centre and Manchester Hub, 7 certificates in total.\n" +
    "   Open Certificates and use the site filter to switch between the two. Point out Southampton is not there.\n\n" +
    "3. Whole company - username 1018MLG\n" +
    "   Dashboard says All sites: Bristol, Manchester and Southampton, 10 certificates,\n" +
    "   including the company-wide document that isn't tied to any one site.\n\n" +
    "Backup whole-company login if needed: Cardiff1019 (Harbourview Construction).",
  );
}

await pres.writeFile({ fileName: OUT });
console.log(`Wrote ${OUT}`);
