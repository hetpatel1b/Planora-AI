import {
  aiPlanBlueprintSchema,
  type AIPlanBlueprint,
  type PlanMilestone,
  type PlanSuggestedTask,
  type PlanProposedBudgetItem,
} from "@/lib/validations/plan";
import { TASK_PRIORITIES } from "@/lib/validations/task";

/**
 * Planora AI — Deterministic Event Plan Generator Engine (F02)
 *
 * Produces comprehensive, rule-based event blueprints conforming strictly
 * to `aiPlanBlueprintSchema`. Provides repeatable, validated planning artifacts
 * without external AI dependencies or persistent side effects.
 */

export interface EventPlanInput {
  name: string;
  event_type: string;
  event_date?: string | null;
  location?: string | null;
  guest_count?: number | null;
  budget?: number | string | null;
  preferences?: string | null;
  constraints?: string | null;
  cultural_requirements?: string | null;
}

export interface GeneratePlanOptions {
  /** Reference date used for timeline milestone calculations. Defaults to new Date(). */
  referenceDate?: Date;
}

interface EventTypeTemplate {
  category: string;
  themes: string[];
  milestones: Array<{
    title: string;
    timeframe: string;
    description: string;
    daysBefore: number;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    priority: (typeof TASK_PRIORITIES)[number];
    category: string;
    is_vendor_checklist: boolean;
    daysBefore: number;
  }>;
  budgetDistribution: Array<{
    category: string;
    item_name: string;
    ratio: number;
    notes?: string;
  }>;
  recommendations: string[];
}

/**
 * Normalizes input event type to match supported templates or fallback to generic.
 */
function normalizeEventType(type: string): string {
  const t = type.trim().toLowerCase();
  if (t.includes("wed")) return "wedding";
  if (t.includes("conf") || t.includes("summit")) return "conference";
  if (t.includes("corp") || t.includes("offsite") || t.includes("meeting")) return "corporate";
  if (t.includes("gala") || t.includes("fundrais") || t.includes("charit")) return "gala";
  if (t.includes("birth") || t.includes("party") || t.includes("social") || t.includes("annivers")) return "social";
  if (t.includes("meetup") || t.includes("workshop") || t.includes("train")) return "meetup";
  if (t.includes("exhibit") || t.includes("expo") || t.includes("trade")) return "exhibition";
  return "generic";
}

/**
 * Computes a milestone date relative to event date and reference date.
 * Guarantees that the suggested milestone date is never after the event date.
 */
function computeMilestoneDate(
  eventDateStr: string | null | undefined,
  daysBefore: number,
  refDate: Date
): string | null {
  if (!eventDateStr) return null;
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) return null;

  const eventTime = eventDate.getTime();
  const refTime = refDate.getTime();

  // If the event date is in the past or today, anchor to the event date itself
  if (eventTime <= refTime) {
    return eventDate.toISOString().split("T")[0];
  }

  const daysUntilEvent = Math.max(0, Math.floor((eventTime - refTime) / (1000 * 60 * 60 * 24)));

  let targetTime: number;
  if (daysUntilEvent >= daysBefore) {
    targetTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
  } else {
    // Proportional placement between reference date and event date
    const ratio = Math.max(0, Math.min(1, daysBefore / 180));
    const offsetDays = Math.round(daysUntilEvent * (1 - ratio));
    targetTime = refTime + offsetDays * 24 * 60 * 60 * 1000;
  }

  // Ensure milestone date is bounded: refTime <= targetTime <= eventTime
  targetTime = Math.min(eventTime, Math.max(refTime, targetTime));
  return new Date(targetTime).toISOString().split("T")[0];
}

/**
 * Apportions target budget into integer cents across line items.
 * Guarantees exact sum matching target budget with zero rounding drift or negative amounts.
 */
function allocateBudgetItems(
  targetBudget: number,
  items: Array<{ category: string; item_name: string; ratio: number; notes?: string }>
): PlanProposedBudgetItem[] {
  const targetCents = Math.round(Math.max(0, targetBudget) * 100);

  if (targetCents === 0) {
    return items.map((item) => ({
      category: item.category,
      item_name: item.item_name,
      estimated_amount: 0,
      notes: item.notes || "Estimated cost pending quote or target budget allocation.",
    }));
  }

  const totalRatio = items.reduce((acc, it) => acc + it.ratio, 0);
  const normalizedRatios = items.map((it) => it.ratio / (totalRatio > 0 ? totalRatio : 1));

  let allocatedCentsSum = 0;
  const centsArray: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemCents = Math.floor(targetCents * normalizedRatios[i]);
    centsArray.push(itemCents);
    allocatedCentsSum += itemCents;
  }

  // Assign any remainder cents from floor rounding to the first item (primary venue/space)
  const remainderCents = targetCents - allocatedCentsSum;
  if (remainderCents > 0 && centsArray.length > 0) {
    centsArray[0] += remainderCents;
  }

  return items.map((item, idx) => ({
    category: item.category,
    item_name: item.item_name,
    estimated_amount: Number((centsArray[idx] / 100).toFixed(2)),
    notes: item.notes ?? null,
  }));
}

/**
 * Event-type domain templates with curated themes, milestones, tasks, and budget distributions.
 */
const TEMPLATES: Record<string, EventTypeTemplate> = {
  wedding: {
    category: "Wedding & Reception",
    themes: [
      "Timeless Romance — Warm candlelight, organic greenery, and neutral palettes",
      "Modern Minimalist Garden — Clean architectural silhouettes, botanical accents, and glass accents",
      "Classic Heritage & Elegance — Rich velvet textures, traditional floral arches, and refined tableware",
    ],
    milestones: [
      {
        title: "Venue & Ceremony Selection",
        timeframe: "6 Months Prior",
        description: "Lock the ceremony and reception venues, verify noise ordinances, and sign primary venue contracts.",
        daysBefore: 180,
      },
      {
        title: "Vendor Lineup Confirmation",
        timeframe: "4 Months Prior",
        description: "Contract photographer, videographer, caterer, florist, and entertainment provider.",
        daysBefore: 120,
      },
      {
        title: "Invitations & Menu Tasting",
        timeframe: "2 Months Prior",
        description: "Send formal invitations, conduct menu tastings, and collect dietary requirements.",
        daysBefore: 60,
      },
      {
        title: "Seating Chart & Final Headcount",
        timeframe: "2 Weeks Prior",
        description: "Finalize table arrangements, escort cards, and provide final catering counts.",
        daysBefore: 14,
      },
      {
        title: "Rehearsal & Vendor Walkthrough",
        timeframe: "1 Day Prior",
        description: "Run ceremony processional rehearsal and align timeline with primary vendors.",
        daysBefore: 1,
      },
      {
        title: "Wedding Day Execution",
        timeframe: "Event Day",
        description: "Coordinate vendor load-in, bridal party schedule, ceremony cues, and reception flow.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Finalize venue contract and security deposit",
        description: "Ensure access hours, loading dock guidelines, and curfew policies are documented.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 180,
      },
      {
        title: "Book primary photographer and videographer",
        description: "Confirm shot list, coverage hours, and second shooter provisions.",
        priority: "high",
        category: "Photography & Video",
        is_vendor_checklist: true,
        daysBefore: 150,
      },
      {
        title: "Schedule catering tasting and beverage package selection",
        description: "Sample dinner options, choose cocktail tier, and log dietary accommodation processes.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 90,
      },
      {
        title: "Finalize floral design, centerpieces, and bouquet orders",
        description: "Select focal arch flowers, guest table arrangements, and personal boutonnieres.",
        priority: "medium",
        category: "Decor & Styling",
        is_vendor_checklist: true,
        daysBefore: 60,
      },
      {
        title: "Review DJ / live band timeline and ceremony music cues",
        description: "Provide processional songs, first dance track, and do-not-play list.",
        priority: "medium",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 30,
      },
      {
        title: "Assemble seating chart and print place cards",
        description: "Group guests by table and flag special accessibility or dietary needs.",
        priority: "high",
        category: "Logistics & Rentals",
        is_vendor_checklist: false,
        daysBefore: 14,
      },
      {
        title: "Confirm wedding party hair and makeup timeline",
        description: "Coordinate prep schedule, arrival times, and light refreshments for the morning of.",
        priority: "medium",
        category: "Staffing & Security",
        is_vendor_checklist: true,
        daysBefore: 7,
      },
      {
        title: "Prepare vendor final payment checks and tip envelopes",
        description: "Organize sealed envelopes for coordinator, catering captain, and musicians.",
        priority: "high",
        category: "Contingency",
        is_vendor_checklist: false,
        daysBefore: 2,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Ceremony & Reception Venue Rental", ratio: 35 },
      { category: "Catering & Bar", item_name: "Plated Dinner & Bar Service", ratio: 30 },
      { category: "Photography & Video", item_name: "Full-Day Photo & Cinema Package", ratio: 12 },
      { category: "Decor & Styling", item_name: "Floral Arrangements & Ambient Lighting", ratio: 10 },
      { category: "Entertainment & AV", item_name: "DJ / Live Ensemble & Sound Equipment", ratio: 8 },
      { category: "Contingency", item_name: "Emergency Reserve & Vendor Gratuities", ratio: 5 },
    ],
    recommendations: [
      "Secure wedding event liability insurance covering both ceremony and reception venues at least 60 days ahead.",
      "Assign an appointed point-of-contact so the wedding couple is never disturbed with operational vendor queries on event day.",
      "Buffer all timeline segments by 15 minutes to absorb inevitable photo and guest transit delays.",
    ],
  },

  corporate: {
    category: "Corporate Offsite & Summit",
    themes: [
      "Executive Focus & Innovation — Sleek contemporary lines, crisp presentation stages, and focused acoustics",
      "Collaborative Momentum — Workshop pods, interactive display walls, and open networking zones",
      "Visionary Horizons — High-impact digital staging, futuristic lighting accents, and seamless connectivity",
    ],
    milestones: [
      {
        title: "Venue & Keynote Speaker Alignment",
        timeframe: "3 Months Prior",
        description: "Contract conference facility, reserve guest room blocks, and confirm headline keynote speakers.",
        daysBefore: 90,
      },
      {
        title: "Agenda & Content Finalization",
        timeframe: "6 Weeks Prior",
        description: "Publish master agenda, review breakout session abstracts, and align presentation templates.",
        daysBefore: 42,
      },
      {
        title: "AV Production & Stage Tech Review",
        timeframe: "3 Weeks Prior",
        description: "Validate microphone distribution, slide deck aspect ratios, and livestream bandwidth redundancy.",
        daysBefore: 21,
      },
      {
        title: "Badge Printing & Collateral Distribution",
        timeframe: "1 Week Prior",
        description: "Generate attendee lanyards, prepare briefing folders, and finalize registration desk rosters.",
        daysBefore: 7,
      },
      {
        title: "Corporate Summit Execution",
        timeframe: "Event Day",
        description: "Manage stage green room, coordinate keynote cues, and oversee catered executive breaks.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Contract conference venue and breakout seminar spaces",
        description: "Ensure high-density WiFi coverage and dedicated speaker green rooms.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 90,
      },
      {
        title: "Finalize AV production and stage equipment contract",
        description: "Confirm dual confidence monitors, wireless lavaliers, and tech booth setup.",
        priority: "high",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 45,
      },
      {
        title: "Coordinate executive lunch and continuous coffee breaks",
        description: "Select energetic refreshments, dietary alternatives, and hydration stations.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 30,
      },
      {
        title: "Review speaker slide decks for brand compliance and timing",
        description: "Conduct pre-event dry runs to ensure slide format consistency.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: false,
        daysBefore: 14,
      },
      {
        title: "Prepare attendee registration badges and welcome collateral",
        description: "Organize badge alphabetical sorting and printed session schedules.",
        priority: "medium",
        category: "Logistics & Rentals",
        is_vendor_checklist: false,
        daysBefore: 7,
      },
      {
        title: "Conduct comprehensive stage and presentation tech check",
        description: "Test slide clickers, video audio feeds, and stage spotlighting.",
        priority: "urgent",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 1,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Conference Hall & Breakout Rooms", ratio: 32 },
      { category: "Entertainment & AV", item_name: "Stage Lighting, Audio & Projection AV", ratio: 28 },
      { category: "Catering & Bar", item_name: "Executive Luncheon & All-Day Beverage Stations", ratio: 24 },
      { category: "Marketing & Collateral", item_name: "Badges, Signage & Event Handouts", ratio: 10 },
      { category: "Contingency", item_name: "On-site Technical Support Reserve", ratio: 6 },
    ],
    recommendations: [
      "Ensure hardwired Ethernet lines for all primary presentation lecterns rather than relying solely on shared wireless.",
      "Schedule at least 20 minutes between keynote and breakout sessions to allow natural transit and networking.",
      "Have backup slide decks preloaded locally on the presentation master laptops.",
    ],
  },

  conference: {
    category: "Conference & Summit",
    themes: [
      "Global Industry Horizons — Multi-track technology showcases with immersive stage design",
      "Dynamic Exchange — Interactive workshop spaces, community lounges, and networking hubs",
      "The Next Frontier — Bold neon branding accents, futuristic staging, and hybrid broadcast feeds",
    ],
    milestones: [
      {
        title: "Venue & Call for Speakers",
        timeframe: "6 Months Prior",
        description: "Book convention center, initiate speaker submissions, and launch early-bird attendee registration.",
        daysBefore: 180,
      },
      {
        title: "Sponsor & Exhibitor Onboarding",
        timeframe: "3 Months Prior",
        description: "Finalize floor plan booth assignments, electrical drops, and sponsor branding collateral.",
        daysBefore: 90,
      },
      {
        title: "Schedule Release & Mobile Program",
        timeframe: "1 Month Prior",
        description: "Publish final multi-track conference schedule and activate attendee portal.",
        daysBefore: 30,
      },
      {
        title: "Exhibition Hall Load-In",
        timeframe: "1 Day Prior",
        description: "Oversee booth construction, sponsor banner placement, and stage audio rehearsal.",
        daysBefore: 1,
      },
      {
        title: "Conference Opening & Keynotes",
        timeframe: "Event Day",
        description: "Open registration kiosks, initiate keynote livestream, and coordinate exhibit hall traffic.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Contract convention center and main auditorium",
        description: "Verify loading dock access hours, freight elevator capacities, and union rules.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 180,
      },
      {
        title: "Procure multi-track stage AV and live broadcast infrastructure",
        description: "Lock dual-camera recording, stage audio mixers, and overflow room monitors.",
        priority: "urgent",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 120,
      },
      {
        title: "Coordinate attendee box lunches and networking coffee breaks",
        description: "Plan high-throughput distribution queues to feed large crowds efficiently.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 45,
      },
      {
        title: "Print directional banners, sponsor backdrops, and booth signage",
        description: "Validate color proofs and stage banner fire safety certifications.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: true,
        daysBefore: 21,
      },
      {
        title: "Brief registration staff and test QR code check-in kiosks",
        description: "Conduct load test on badge printers and verify attendee database sync.",
        priority: "high",
        category: "Staffing & Security",
        is_vendor_checklist: false,
        daysBefore: 3,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Auditorium & Exhibition Hall Rental", ratio: 35 },
      { category: "Entertainment & AV", item_name: "Multi-Track Audio, Video & Livestream Tech", ratio: 26 },
      { category: "Catering & Bar", item_name: "Attendee Meals, Refreshments & Welcome Reception", ratio: 22 },
      { category: "Marketing & Collateral", item_name: "Wayfinding Signage, Badges & Conference App", ratio: 11 },
      { category: "Staffing & Security", item_name: "Event Security & Registration Staffing", ratio: 6 },
    ],
    recommendations: [
      "Deploy self-service badge printing stations to avoid registration queues during morning peak hours.",
      "Ensure all stage audio feeds are recorded on isolated multitrack channels for post-event video distribution.",
      "Design clear, oversized directional wayfinding signs at every corridor intersection.",
    ],
  },

  gala: {
    category: "Gala & Fundraiser",
    themes: [
      "Black Tie & Starlight — Deep midnight navy, sparkling chandeliers, and gilded table accents",
      "Luminescent Hope — Ethereal uplighting, modern white floral sculptures, and mirror runways",
      "Heritage Benefactors — Warm mahogany, burgundy velvet, and timeless orchestral accompaniment",
    ],
    milestones: [
      {
        title: "Venue & Benefactor Selection",
        timeframe: "4 Months Prior",
        description: "Secure premier ballroom, select event honorees, and appoint fundraising chairs.",
        daysBefore: 120,
      },
      {
        title: "Sponsorship Table Sales & Auction Curation",
        timeframe: "2 Months Prior",
        description: "Solicit major donor table packages and curate exclusive live auction packages.",
        daysBefore: 60,
      },
      {
        title: "Invitations & Entertainment Booking",
        timeframe: "1 Month Prior",
        description: "Send formal gala invitations, confirm celebrity MC or musical guest, and review run of show.",
        daysBefore: 30,
      },
      {
        title: "VIP Seating & Auction Rehearsal",
        timeframe: "1 Week Prior",
        description: "Finalize high-donor table placements, briefing auctioneer, and testing bid paddle displays.",
        daysBefore: 7,
      },
      {
        title: "Gala Night & Live Auction",
        timeframe: "Event Day",
        description: "Host VIP cocktail reception, manage dinner service timing, and conduct fundraising paddle raise.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Lock formal ballroom venue and valet parking permits",
        description: "Confirm coat check facilities, valet staging space, and arrival red carpet permissions.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 120,
      },
      {
        title: "Finalize gourmet multi-course dinner and champagne pairings",
        description: "Conduct chef tasting for VIP sponsors and coordinate synchronized dinner service.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 60,
      },
      {
        title: "Book professional charity auctioneer and master of ceremonies",
        description: "Align storytelling scripts, donor spotlights, and target fundraising milestones.",
        priority: "high",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 45,
      },
      {
        title: "Design and print commemorative gala program booklets",
        description: "Incorporate sponsor advertisements and honoree biographies.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: true,
        daysBefore: 14,
      },
      {
        title: "Configure mobile bidding software and electronic donor terminals",
        description: "Verify payment gateway compliance and test high-volume card processing.",
        priority: "high",
        category: "Logistics & Rentals",
        is_vendor_checklist: false,
        daysBefore: 5,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Grand Ballroom & Red Carpet Foyer", ratio: 30 },
      { category: "Catering & Bar", item_name: "Gourmet Plated Dinner & Premium Wine Pairings", ratio: 32 },
      { category: "Entertainment & AV", item_name: "Auctioneer, Master of Ceremonies & Stage AV", ratio: 18 },
      { category: "Decor & Styling", item_name: "Dramatic Chandelier Lighting & Floral Centerpieces", ratio: 12 },
      { category: "Marketing & Collateral", item_name: "Gala Program Books & Donor Recognition Displays", ratio: 8 },
    ],
    recommendations: [
      "Keep the live auction appeal concise (under 25 minutes) to maintain maximum donor energy in the room.",
      "Station mobile bidding concierges near guest tables to assist donors with electronic pledges.",
      "Coordinate with catering so dinner plates are cleared before the main fundraising appeal starts.",
    ],
  },

  social: {
    category: "Social Celebration & Birthday Party",
    themes: [
      "Golden Hour Lounge — Warm amber lighting, velvet seating vignettes, and craft cocktail bars",
      "Retro Disco Glow — Neon accents, mirrored surfaces, vibrant party energy, and dancefloor focal points",
      "Bespoke Garden Gathering — Al fresco dining tables, festoon fairy lighting, and artisan dessert spreads",
    ],
    milestones: [
      {
        title: "Venue & Date Selection",
        timeframe: "6 Weeks Prior",
        description: "Select private party venue or residential setup, define party theme, and set guest list.",
        daysBefore: 42,
      },
      {
        title: "Invitations & Entertainment Booking",
        timeframe: "3 Weeks Prior",
        description: "Send digital invitations, book DJ or acoustic performer, and organize party entertainment.",
        daysBefore: 21,
      },
      {
        title: "Menu & Cake Finalization",
        timeframe: "10 Days Prior",
        description: "Confirm catering menu, signature cocktails, and custom celebration cake order.",
        daysBefore: 10,
      },
      {
        title: "Party Setup & Celebration",
        timeframe: "Event Day",
        description: "Complete balloon installation, chill beverages, welcome guests, and enjoy the party.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Confirm party venue or private dining room reservation",
        description: "Clarify outside food/cake corkage fees and decor hanging restrictions.",
        priority: "high",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 42,
      },
      {
        title: "Order custom celebration cake and specialty dessert table",
        description: "Confirm flavor profiles, design sketch, and delivery time window.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 21,
      },
      {
        title: "Curate high-energy party playlist or hire DJ",
        description: "Compile guest of honor's favorite tracks and crowd-pleasing dance anthems.",
        priority: "medium",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 14,
      },
      {
        title: "Finalize photo backdrop, balloons, and ambient lighting",
        description: "Set up photobooth props and personalized neon signage.",
        priority: "medium",
        category: "Decor & Styling",
        is_vendor_checklist: false,
        daysBefore: 7,
      },
      {
        title: "Purchase specialty cocktail mixers, garnishes, and ice",
        description: "Ensure sufficient glassware and non-alcoholic options.",
        priority: "medium",
        category: "Catering & Bar",
        is_vendor_checklist: false,
        daysBefore: 2,
      },
    ],
    budgetDistribution: [
      { category: "Catering & Bar", item_name: "Heavy Hors d'Oeuvres, Signature Bar & Cake", ratio: 42 },
      { category: "Venue & Facilities", item_name: "Private Room / Party Space Rental", ratio: 26 },
      { category: "Entertainment & AV", item_name: "DJ, Sound System & Photobooth", ratio: 16 },
      { category: "Decor & Styling", item_name: "Bespoke Balloon Arch & Table Styling", ratio: 10 },
      { category: "Favors & Gifts", item_name: "Personalized Guest Party Favors", ratio: 6 },
    ],
    recommendations: [
      "Establish an interactive photobooth or themed backdrop early near the entrance to capture guests as they arrive.",
      "Calculate 1.5 to 2 drinks per person for the first hour and 1 drink per person each subsequent hour.",
      "Designate an easily accessible space for guest gifts and coats upon arrival.",
    ],
  },

  meetup: {
    category: "Community Meetup & Workshop",
    themes: [
      "Collaborative Workshop — Practical whiteboard spaces, open discussion circles, and peer learning",
      "Community Catalyst — Welcoming acoustic environment, casual mingling lounges, and community boards",
    ],
    milestones: [
      {
        title: "Host Space & Topic Lock",
        timeframe: "1 Month Prior",
        description: "Reserve community or co-working venue, finalize interactive agenda, and publish event page.",
        daysBefore: 30,
      },
      {
        title: "Facilitator Alignment & Materials",
        timeframe: "2 Weeks Prior",
        description: "Review workshop exercises, verify presentation slides, and prepare printed exercise sheets.",
        daysBefore: 14,
      },
      {
        title: "Interactive Session & Networking",
        timeframe: "Event Day",
        description: "Welcome attendees, facilitate hands-on workshop modules, and coordinate open networking.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Reserve workshop venue with flexible seating layout",
        description: "Confirm room arrangement allows both presentation focus and small group breakout pods.",
        priority: "high",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 30,
      },
      {
        title: "Test projector, wireless presentation clicker, and microphones",
        description: "Verify display adapter dongles and HDMI compatibility.",
        priority: "high",
        category: "Entertainment & AV",
        is_vendor_checklist: false,
        daysBefore: 10,
      },
      {
        title: "Order light refreshments, coffee, and water service",
        description: "Keep snacks clean and convenient for working sessions.",
        priority: "medium",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 7,
      },
      {
        title: "Print attendee worksheets and name badges",
        description: "Ensure pens, post-it notes, and workshop supplies are pre-boxed.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: false,
        daysBefore: 3,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Workshop Space / Co-Working Hall Rental", ratio: 45 },
      { category: "Catering & Bar", item_name: "Networking Coffee, Tea & Artisan Pastries", ratio: 25 },
      { category: "Entertainment & AV", item_name: "AV Projector & Wireless Microphones", ratio: 15 },
      { category: "Marketing & Collateral", item_name: "Printed Worksheets, Name Badges & Pens", ratio: 15 },
    ],
    recommendations: [
      "Start with a 5-minute icebreaker exercise to encourage active participation from all attendees.",
      "Provide a clear digital link or QR code where attendees can access presentation slides and follow-up resources.",
    ],
  },

  exhibition: {
    category: "Exhibition & Trade Showcase",
    themes: [
      "Interactive Gallery — Immersive display stations with focused directional lighting",
      "Industry Marketplace — High-visibility trade booths, product demonstration pods, and meeting lounges",
    ],
    milestones: [
      {
        title: "Floor Plan & Booth Sales",
        timeframe: "4 Months Prior",
        description: "Design exhibition floor plan, allocate exhibitor footprints, and confirm utility drops.",
        daysBefore: 120,
      },
      {
        title: "Logistics & Freight Coordination",
        timeframe: "1 Month Prior",
        description: "Establish loading dock schedules, drayage guidelines, and exhibitor badges.",
        daysBefore: 30,
      },
      {
        title: "Exhibition Doors Open",
        timeframe: "Event Day",
        description: "Manage attendee flow, oversee booth operations, and maintain hall safety standards.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Contract exhibition hall and verify floor weight capacities",
        description: "Ensure emergency exit clearance and compliant aisle widths.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 120,
      },
      {
        title: "Organize pipe-and-drape booth rentals and electrical hookups",
        description: "Confirm standard 10x10 booth partitions and power strip distribution.",
        priority: "high",
        category: "Logistics & Rentals",
        is_vendor_checklist: true,
        daysBefore: 45,
      },
      {
        title: "Produce show guide maps and sponsor directories",
        description: "Print large-format wayfinding banners and exhibitor indexes.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: true,
        daysBefore: 14,
      },
      {
        title: "Brief floor marshals and security personnel",
        description: "Review emergency procedures and overnight booth protection protocols.",
        priority: "high",
        category: "Staffing & Security",
        is_vendor_checklist: false,
        daysBefore: 3,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Exhibition Hall & Loading Bay Rental", ratio: 42 },
      { category: "Logistics & Rentals", item_name: "Pipe, Drape, Tables & Electrical Infrastructure", ratio: 28 },
      { category: "Marketing & Collateral", item_name: "Exhibition Floor Maps & Directional Signage", ratio: 15 },
      { category: "Staffing & Security", item_name: "On-site Security & Event Floor Staff", ratio: 15 },
    ],
    recommendations: [
      "Stagger exhibitor move-in schedules by booth zones to prevent loading dock gridlock.",
      "Provide clearly marked emergency exits and keep wide main aisles to accommodate peak crowd flow.",
    ],
  },

  generic: {
    category: "Special Event",
    themes: [
      "Modern Sophistication — Polished atmosphere, tailored lighting, and streamlined guest experience",
      "Community Focus — Warm hospitality, comfortable seating arrangements, and interactive programming",
      "Celebratory Spark — Vibrant colors, dynamic soundscapes, and memorable focal points",
    ],
    milestones: [
      {
        title: "Concept Finalization & Space Selection",
        timeframe: "Initial Planning",
        description: "Establish core event objectives, confirm venue capacity, and outline master program.",
        daysBefore: 60,
      },
      {
        title: "Vendor Coordination & Guest Invitations",
        timeframe: "Mid-Term Planning",
        description: "Secure key vendors, distribute invitations, and monitor attendee RSVPs.",
        daysBefore: 30,
      },
      {
        title: "Final Run of Show & Logistics Check",
        timeframe: "Final Preparations",
        description: "Review operational schedule, verify equipment checklist, and conduct final supplier checks.",
        daysBefore: 7,
      },
      {
        title: "Event Execution",
        timeframe: "Event Day",
        description: "Coordinate on-site setup, oversee program timeline, and ensure guest comfort.",
        daysBefore: 0,
      },
    ],
    tasks: [
      {
        title: "Lock primary event space and review venue rules",
        description: "Verify loading access, capacity allowances, and cleaning policies.",
        priority: "urgent",
        category: "Venue & Facilities",
        is_vendor_checklist: true,
        daysBefore: 60,
      },
      {
        title: "Arrange food and beverage service for expected guests",
        description: "Select menu style, confirm service staffing, and accommodate dietary restrictions.",
        priority: "high",
        category: "Catering & Bar",
        is_vendor_checklist: true,
        daysBefore: 30,
      },
      {
        title: "Test sound equipment, microphones, and presentation displays",
        description: "Ensure clear audio coverage throughout the entire guest area.",
        priority: "high",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        daysBefore: 14,
      },
      {
        title: "Prepare signage, name tags, or welcoming collateral",
        description: "Ensure guests can easily navigate the venue entrance and facilities.",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: false,
        daysBefore: 7,
      },
      {
        title: "Conduct final operational walkthrough with on-site team",
        description: "Review schedule cues, point of contact numbers, and emergency protocols.",
        priority: "high",
        category: "Staffing & Security",
        is_vendor_checklist: false,
        daysBefore: 2,
      },
    ],
    budgetDistribution: [
      { category: "Venue & Facilities", item_name: "Event Space & Facility Rental", ratio: 38 },
      { category: "Catering & Bar", item_name: "Food, Refreshments & Hospitality Service", ratio: 32 },
      { category: "Entertainment & AV", item_name: "Sound, Lighting & Presentation Tech", ratio: 18 },
      { category: "Marketing & Collateral", item_name: "Signage, Badges & Printed Materials", ratio: 7 },
      { category: "Contingency", item_name: "Emergency Planning Reserve", ratio: 5 },
    ],
    recommendations: [
      "Confirm all vendor delivery and load-out time windows in writing prior to event day.",
      "Assign one primary coordinator to maintain the master run of show and resolve unforeseen issues.",
    ],
  },
};

/**
 * Builds a dynamic, cohesive summary text based on input parameters.
 */
function buildEventSummary(
  event: EventPlanInput,
  template: EventTypeTemplate
): string {
  const name = event.name.trim();
  const guestCount = event.guest_count && event.guest_count > 0 ? event.guest_count : null;
  const budget = typeof event.budget === "number" ? event.budget : Number(event.budget) || 0;
  const location = event.location?.trim() || null;

  const formattedBudget = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(budget);

  let summary = `Strategic event blueprint for "${name}", designed as a ${template.category}.`;

  if (location && guestCount) {
    summary += ` The gathering is planned for ${guestCount.toLocaleString()} attendees at ${location}.`;
  } else if (guestCount) {
    summary += ` The gathering is planned to host approximately ${guestCount.toLocaleString()} attendees.`;
  } else if (location) {
    summary += ` The event will be hosted at ${location}.`;
  }

  if (budget > 0) {
    summary += ` This blueprint targets an overall budget ceiling of ${formattedBudget}, with strategic allocations designed to balance core venue requirements, hospitality, and entertainment.`;
  } else {
    summary += ` This blueprint provides a structured planning foundation, prioritizing critical milestones and operational checklists while overall budget parameters are finalized.`;
  }

  if (event.preferences) {
    summary += ` Design directives incorporate the planner's aesthetic preference: "${event.preferences.trim()}".`;
  }

  if (event.constraints) {
    summary += ` Special operational consideration has been integrated to address noted constraints: "${event.constraints.trim()}".`;
  }

  return summary;
}

/**
 * Generates custom contextual recommendations based on specific event constraints and guest scale.
 */
function buildContextualRecommendations(
  event: EventPlanInput,
  template: EventTypeTemplate
): string[] {
  const recommendations = [...template.recommendations];

  const guestCount = event.guest_count && event.guest_count > 0 ? event.guest_count : 0;
  if (guestCount >= 200) {
    recommendations.push(
      `With ${guestCount.toLocaleString()} attendees anticipated, implement zoned registration and at least 3 distinct beverage stations to prevent bottlenecks.`
    );
  } else if (guestCount > 0 && guestCount <= 30) {
    recommendations.push(
      `For an intimate group of ${guestCount} guests, prioritize personalized hospitality touches and single-table seating arrangements.`
    );
  }

  if (event.cultural_requirements && event.cultural_requirements.trim()) {
    recommendations.push(
      `Brief all culinary and stage partners on designated cultural and dietary protocols: "${event.cultural_requirements.trim()}".`
    );
  }

  if (event.constraints && event.constraints.trim()) {
    recommendations.push(
      `Ensure contractual vendor agreements strictly accommodate venue constraints: "${event.constraints.trim()}".`
    );
  }

  // Schema limits recommendations to at most 10 items
  return recommendations.slice(0, 10);
}

/**
 * Main deterministic generator function.
 *
 * Produces a validated `AIPlanBlueprint` conforming strictly to `aiPlanBlueprintSchema`.
 */
export function generateEventPlan(
  event: EventPlanInput,
  options?: GeneratePlanOptions
): AIPlanBlueprint {
  const refDate = options?.referenceDate ?? new Date();
  const templateKey = normalizeEventType(event.event_type || "");
  const template = TEMPLATES[templateKey] || TEMPLATES.generic;

  // 1. High-level Summary & Themes
  const summary = buildEventSummary(event, template);
  const themes = template.themes.slice(0, 5);

  // 2. Schedule Milestones
  const scheduleMilestones: PlanMilestone[] = template.milestones.map((m) => ({
    title: m.title,
    timeframe: m.timeframe,
    description: m.description,
    suggested_date: computeMilestoneDate(event.event_date, m.daysBefore, refDate),
  }));

  // 3. Suggested Tasks
  const suggestedTasks: PlanSuggestedTask[] = template.tasks.map((t) => ({
    title: t.title,
    description: t.description,
    priority: t.priority,
    category: t.category,
    is_vendor_checklist: t.is_vendor_checklist,
    suggested_days_before: t.daysBefore,
  }));

  // 4. Proposed Budget Allocations
  const rawBudget = typeof event.budget === "number" ? event.budget : Number(event.budget) || 0;
  const budgetCeiling = Math.max(0, Math.min(rawBudget, 9_999_999_999.99));
  const proposedBudgetItems = allocateBudgetItems(budgetCeiling, template.budgetDistribution);

  // 5. Contextual Recommendations
  const keyRecommendations = buildContextualRecommendations(event, template);

  // 6. Metadata Provenance
  const metadata = {
    source: "deterministic" as const,
    model: "planora-rules-v1",
    generatedAt: refDate.toISOString(),
    promptSummary: `Deterministic blueprint synthesized for ${event.name.trim()} (${template.category}).`,
  };

  const rawBlueprint = {
    summary,
    themes,
    scheduleMilestones,
    suggestedTasks,
    proposedBudgetItems,
    keyRecommendations,
    metadata,
  };

  // Strictly validate through existing Zod schema before returning
  return aiPlanBlueprintSchema.parse(rawBlueprint);
}
