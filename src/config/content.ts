/**
 * Marketing copy that is not managed from the admin yet.
 *
 * TESTIMONIALS: the entries below are PLACEHOLDERS marked `sample: true`
 * and are labelled as samples on the site. Replace them with genuine
 * customer testimonials (with the customer's permission) before launch.
 *
 * Only testimonials from customers in TESTIMONIAL_CITY are shown on the site.
 */
export const TESTIMONIAL_CITY = "Lilongwe";

export interface Testimonial {
  quote: string;
  name: string;
  /** Type of project, e.g. "Driveway". */
  project: string;
  /** Customer's city; must match TESTIMONIAL_CITY to be published. */
  city: string;
  sample?: boolean;
}

const ALL_TESTIMONIALS: Testimonial[] = [
  {
    quote: "Hi Mozaik Pavers, your team has done a great job. Thank you so much.",
    name: "Pachalo",
    project: "Homeowner",
    city: "Lilongwe",
  },
  {
    quote: "The team measured, quoted and finished our driveway on schedule. The rainy season came and there isn't a single puddle.",
    name: "Homeowner",
    project: "Driveway",
    city: "Lilongwe",
    sample: true,
  },
  {
    quote: "Our customers noticed the new forecourt immediately. Clean finish, straight lines and the site was left tidy every day.",
    name: "Business owner",
    project: "Commercial forecourt",
    city: "Lilongwe",
    sample: true,
  },
  {
    quote: "The online estimate was close to the final price after the site visit, which made budgeting easy.",
    name: "Property manager",
    project: "Parking area",
    city: "Lilongwe",
    sample: true,
  },
];

export const TESTIMONIALS = ALL_TESTIMONIALS.filter(
  (t) => t.city.trim().toLowerCase() === TESTIMONIAL_CITY.toLowerCase(),
);

export const SERVICES = [
  {
    icon: "truck" as const,
    title: "Driveways",
    text: "Heavy-duty interlocking and herringbone driveways built on a properly compacted base to carry daily vehicle loads.",
  },
  {
    icon: "grid" as const,
    title: "Courtyards & Patios",
    text: "Outdoor living spaces in colours and patterns that suit your home, with falls designed to shed rainwater.",
  },
  {
    icon: "mapPin" as const,
    title: "Walkways & Paths",
    text: "Safe, slip-resistant footpaths that link gardens, entrances and outbuildings.",
  },
  {
    icon: "layers" as const,
    title: "Parking Areas",
    text: "Commercial car parks and forecourts with marked bays, edge restraints and drainage planning.",
  },
  {
    icon: "sparkles" as const,
    title: "Landscaping",
    text: "Planting beds, edging and finishing touches that frame your new paving.",
  },
  {
    icon: "shield" as const,
    title: "Site Preparation & Drainage",
    text: "Clearing, removal of old paving, levelling and drainage — assessed and priced on site.",
  },
];

export const WHY_CHOOSE = [
  { icon: "shield" as const, title: "Built to last", text: "Compacted sub-base, quality fitting dust and edge restraints — the parts you don't see are what make paving last." },
  { icon: "ruler" as const, title: "Transparent pricing", text: "Every quotation itemises materials, delivery, labour and consumables. No hidden extras." },
  { icon: "users" as const, title: "Skilled, supervised teams", text: "Experienced fitters with a supervisor on site from setting-out to final compaction." },
  { icon: "clock" as const, title: "On time, site left clean", text: "Clear schedules, daily clean-up and a final walk-through before handover." },
];

export const HOW_IT_WORKS = [
  { title: "Get an instant estimate", text: "Enter your area in square metres and see an itemised cost straight away." },
  { title: "Receive your PDF quotation", text: "We email a professional quotation with every quantity and unit rate." },
  { title: "Site assessment", text: "We visit, confirm measurements and ground conditions, and finalise your quote." },
  { title: "We transform your space", text: "Our team prepares the base, lays your pavers and hands over a finished space." },
];

/** About page: Vision, Mission and Core Values (Mozaik Pavers' own wording). */
export const VISION = "To be the most trusted paving company, transforming outdoor spaces into lasting legacies of quality, safety and beauty on a budget.";
export const MISSION = "Transforming driveways and backyards, leaving a space for beautiful memories.";
export const CORE_VALUES = ["Integrity", "Achieve quality with speed", "Deliver value for money"];
