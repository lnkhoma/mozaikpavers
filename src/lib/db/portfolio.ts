import type { ProjectCategory } from "@/lib/constants";
import type { ProjectImageKind } from "./schema";

/**
 * Starter portfolio built from original Mozaik Pavers site photographs
 * (public/portfolio, EXIF/GPS metadata stripped). Seeded once into an empty
 * or fresh database; afterwards projects are managed in Admin → Projects.
 *
 * Location, area and completion date were not recorded with the photos, so
 * they are left general ("Malawi") / empty — fill them in from the admin.
 */
export interface PortfolioImage {
  kind: ProjectImageKind;
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface PortfolioProject {
  slug: string;
  name: string;
  location: string;
  categories: ProjectCategory[];
  description: string;
  paverType: string | null;
  featured: boolean;
  images: PortfolioImage[];
}

const P = (slug: string, file: string, kind: ProjectImageKind, alt: string, width = 480, height = 640): PortfolioImage => ({
  kind,
  url: `/portfolio/${slug}/${file}`,
  alt,
  width,
  height,
});

export const PORTFOLIO: PortfolioProject[] = [
  {
    slug: "double-storey-residence-forecourt",
    name: "Double-Storey Residence Forecourt",
    location: "Malawi",
    categories: ["residential", "driveways", "courtyards"],
    description:
      "A bare, red-soil frontage transformed into a paved forecourt across the full width of a new double-storey home. The ground was levelled and covered with fitting plastic, bedded with fitting dust, and finished in herringbone-pattern pavers right up to the front steps.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: true,
    images: [
      P("double-storey-residence-forecourt", "img_4023.jpg", "before", "Bare red-soil frontage of a double-storey house before paving"),
      P("double-storey-residence-forecourt", "img_4053.jpg", "after", "Completed herringbone paved forecourt in front of the double-storey house"),
      P("double-storey-residence-forecourt", "img_4022.jpg", "gallery", "Fitting plastic and dust being prepared in front of the house"),
      P("double-storey-residence-forecourt", "img_4024.jpg", "gallery", "Pavers stacked and ready while laying progresses"),
      P("double-storey-residence-forecourt", "img_4019.jpg", "gallery", "Paving advancing across the forecourt"),
      P("double-storey-residence-forecourt", "img_4020.jpg", "gallery", "Mozaik Pavers fitter laying pavers in front of the house"),
      P("double-storey-residence-forecourt", "img_4021.jpg", "gallery", "Laying the final section of the forecourt"),
    ],
  },
  {
    slug: "modern-home-driveway",
    name: "Modern Home Driveway",
    location: "Malawi",
    categories: ["residential", "driveways"],
    description:
      "Open, uneven earth beside a modern glass-fronted home replaced with a multi-tone herringbone driveway, with room to park and kerbed edges along the lawn and deck.",
    paverType: "Multi-tone pavers, herringbone pattern",
    featured: true,
    images: [
      P("modern-home-driveway", "img_5834.jpg", "before", "Bare earth beside a modern home before paving"),
      P("modern-home-driveway", "img_6174.jpg", "after", "Finished multi-tone herringbone driveway with parked cars"),
      P("modern-home-driveway", "img_5918.jpg", "gallery", "Mozaik Pavers fitter setting kerbs along the lawn edge"),
      P("modern-home-driveway", "img_5754.jpg", "gallery", "Site before work started, next to the house"),
      P("modern-home-driveway", "img_5755.jpg", "gallery", "Unpaved ground along the boundary fence"),
    ],
  },
  {
    slug: "walled-garden-courtyard",
    name: "Walled Garden Courtyard",
    location: "Malawi",
    categories: ["residential", "courtyards", "landscaping"],
    description:
      "A large walled garden paved in herringbone around an existing tree, with timber-edged planting beds kept for greenery. Photographed from ground preparation through to the finished courtyard.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: true,
    images: [
      P("walled-garden-courtyard", "img_4056.jpg", "after", "Completed herringbone courtyard around a tree in a walled garden"),
      P("walled-garden-courtyard", "img_4060.jpg", "gallery", "Finished courtyard viewed from the balcony"),
      P("walled-garden-courtyard", "img_4061.jpg", "gallery", "Courtyard paving alongside the house"),
      P("walled-garden-courtyard", "img_4054.jpg", "gallery", "Final section of paving being laid"),
      P("walled-garden-courtyard", "img_4034.jpg", "gallery", "Team laying pavers across the garden", 640, 480),
      P("walled-garden-courtyard", "img_4033.jpg", "gallery", "Paving progressing over the prepared base", 640, 480),
      P("walled-garden-courtyard", "img_4028.jpg", "gallery", "Site preparation with fitting plastic and dust"),
      P("walled-garden-courtyard", "img_4029.jpg", "gallery", "Paving starting from the house side"),
    ],
  },
  {
    slug: "brick-bungalow-compound",
    name: "Brick Bungalow Compound",
    location: "Malawi",
    categories: ["residential", "driveways"],
    description: "A full compound paved in herringbone, running from the front of a brick bungalow to the boundary wall.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: false,
    images: [
      P("brick-bungalow-compound", "img_4672.jpg", "after", "Herringbone paved compound in front of a brick bungalow"),
      P("brick-bungalow-compound", "img_4677.jpg", "gallery", "Paved compound and boundary wall"),
    ],
  },
  {
    slug: "gated-herringbone-driveway",
    name: "Gated Herringbone Driveway",
    location: "Malawi",
    categories: ["residential", "driveways"],
    description: "A herringbone driveway behind a gated entrance, shown freshly washed after completion.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: false,
    images: [P("gated-herringbone-driveway", "img_4717.jpg", "after", "Freshly washed herringbone driveway behind a gate")],
  },
  {
    slug: "walled-compound-paving",
    name: "Walled Compound Paving",
    location: "Malawi",
    categories: ["driveways", "parking_areas"],
    description: "A long walled compound paved in herringbone, giving a clean, durable surface for vehicles from the gate to the building.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: false,
    images: [
      P("walled-compound-paving", "img_5288.jpg", "after", "Herringbone paving along a walled compound"),
      P("walled-compound-paving", "img_5296.jpg", "gallery", "Paved compound with parked vehicle"),
      P("walled-compound-paving", "img_5294.jpg", "gallery", "Close-up of the herringbone pattern", 640, 480),
    ],
  },
  {
    slug: "herringbone-home-courtyard",
    name: "Herringbone Home Courtyard",
    location: "Malawi",
    categories: ["residential", "courtyards"],
    description: "A home courtyard and side yard finished in herringbone pavers, from the house front to the gate.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: false,
    images: [
      P("herringbone-home-courtyard", "img_3913.jpg", "after", "Herringbone courtyard alongside a house"),
      P("herringbone-home-courtyard", "img_3923.jpg", "gallery", "Paving in front of the house entrance"),
      P("herringbone-home-courtyard", "img_3921.jpg", "gallery", "Paved yard towards the gate"),
      P("herringbone-home-courtyard", "img_3919.jpg", "gallery", "Detail of the herringbone pattern"),
      P("herringbone-home-courtyard", "img_3924.jpg", "gallery", "Courtyard paving close to the house"),
      P("herringbone-home-courtyard", "img_3863.jpg", "gallery", "Work in progress around the drainage channel"),
    ],
  },
  {
    slug: "entrance-walkway-and-steps",
    name: "Entrance Walkway & Steps",
    location: "Malawi",
    categories: ["residential", "walkways", "landscaping"],
    description: "A paved entrance walkway meeting the front steps of a modern home, set out with string lines for straight, even courses.",
    paverType: "Rectangular pavers",
    featured: false,
    images: [
      P("entrance-walkway-and-steps", "img_3930.jpg", "after", "Paved walkway leading to the front steps"),
      P("entrance-walkway-and-steps", "img_3926.jpg", "gallery", "Walkway beside the entrance and planting"),
      P("entrance-walkway-and-steps", "img_3927.jpg", "gallery", "Mozaik Pavers team checking levels on the walkway"),
    ],
  },
  {
    slug: "interlocking-paving-grounds",
    name: "Interlocking Paving Grounds",
    location: "Malawi",
    categories: ["other"],
    description: "A large open area laid in interlocking zig-zag pavers, built to spread loads evenly across wide grounds.",
    paverType: "Interlocking zig-zag pavers",
    featured: false,
    images: [
      P("interlocking-paving-grounds", "img_5589.jpg", "after", "Wide area of interlocking pavers"),
      P("interlocking-paving-grounds", "img_5591.jpg", "gallery", "Interlocking paving with pavers ready for the edges"),
      P("interlocking-paving-grounds", "img_5574.jpg", "gallery", "Fitter laying interlocking pavers"),
      P("interlocking-paving-grounds", "img_5596.jpg", "gallery", "Paving progressing near the lawn"),
      P("interlocking-paving-grounds", "img_5581.jpg", "gallery", "Laying interlocking pavers across the site"),
    ],
  },
  {
    slug: "drainage-channels-and-kerbing",
    name: "Drainage Channels & Kerbing",
    location: "Malawi",
    categories: ["other"],
    description: "Concrete drainage channels with slotted covers and kerbing installed alongside paving to carry rainwater away from driveways and buildings.",
    paverType: "Drainage channels, covers and kerbs",
    featured: false,
    images: [
      P("drainage-channels-and-kerbing", "photo-76a9f29d.jpg", "after", "Completed drainage channel with slotted covers", 360, 640),
      P("drainage-channels-and-kerbing", "photo-f027be92.jpg", "gallery", "Channel covers set beside new paving", 360, 640),
      P("drainage-channels-and-kerbing", "img_3571.jpg", "gallery", "Fitter setting the kerb line"),
      P("drainage-channels-and-kerbing", "img_3575.jpg", "gallery", "Drainage covers ready for installation"),
      P("drainage-channels-and-kerbing", "img_5548.jpg", "gallery", "Concrete channel alongside a boundary wall"),
      P("drainage-channels-and-kerbing", "img_5549.jpg", "gallery", "Channel and kerb under construction"),
    ],
  },
];

/** Slugs of the illustrated placeholder projects from the first release. */
export const LEGACY_SAMPLE_SLUGS = [
  "area-47-family-driveway",
  "namiwawa-courtyard",
  "city-centre-office-parking",
  "zomba-guesthouse-walkway",
  "mzuzu-shopfront-forecourt",
  "salima-lakeside-patio",
];

/** Commercial projects added October 2026 (photos supplied by Mozaik Pavers). */
export const COMMERCIAL_2026_10: PortfolioProject[] = [
  {
    slug: "office-development-paving",
    name: "Office Development Paving",
    location: "Malawi",
    categories: ["commercial", "parking_areas"],
    description:
      "Interlocking paving for the grounds and parking around a multi-storey office development. The site was excavated and levelled with heavy plant, covered with fitting plastic and fitting dust, then laid by the Mozaik Pavers team in interlocking zig-zag blocks.",
    paverType: "Interlocking zig-zag pavers",
    featured: false,
    images: [
      P("office-development-paving", "photo-7.jpg", "after", "Interlocking zig-zag paving laid at an office development", 1200, 1600),
      P("office-development-paving", "photo-2.jpg", "gallery", "Mozaik Pavers team laying interlocking blocks beside the office building", 1200, 1600),
      P("office-development-paving", "photo-5.jpg", "gallery", "Fitting plastic and fitting dust spread before paving", 1200, 1600),
      P("office-development-paving", "photo-3.jpg", "gallery", "Excavation and levelling with a backhoe loader", 1200, 1600),
    ],
  },
  {
    slug: "two-storey-development-paving",
    name: "Two-Storey Development Paving",
    location: "Malawi",
    categories: ["commercial", "courtyards"],
    description:
      "Herringbone paving across the forecourt and grounds of a new two-storey development with stone-clad features, laid over fitting plastic and fitting dust, with planters and boundary pillars set into the layout.",
    paverType: "Rectangular pavers, herringbone pattern",
    featured: false,
    images: [
      P("two-storey-development-paving", "photo-10.jpg", "after", "Herringbone paving laid across a large forecourt", 1125, 1500),
      P("two-storey-development-paving", "photo-11.jpg", "gallery", "Paving progressing around planters and boundary pillars", 1200, 1600),
      P("two-storey-development-paving", "photo-9.jpg", "gallery", "Herringbone paving in front of the stone-clad building", 1200, 1600),
      P("two-storey-development-paving", "photo-8.jpg", "gallery", "Fitting dust ready for laying in front of the development", 1200, 1600),
    ],
  },
  {
    slug: "commercial-courtyard-renovation",
    name: "Commercial Courtyard Renovation",
    location: "Malawi",
    categories: ["commercial", "courtyards"],
    description:
      "Preparing an enclosed courtyard for new paving: the old brick paving and a disused pond are lifted and cleared before the ground is levelled for the new surface.",
    paverType: null,
    featured: false,
    images: [P("commercial-courtyard-renovation", "photo-6.jpg", "after", "Old brick paving being cleared from a courtyard by the Mozaik Pavers team", 1500, 1125)],
  },
];

/** Before & after transformation added October 2026 (photos supplied by Mozaik Pavers). */
export const TRANSFORMATIONS_2026_10: PortfolioProject[] = [
  {
    slug: "blue-bungalow-courtyard",
    name: "Blue Bungalow Courtyard",
    location: "Malawi",
    categories: ["residential", "courtyards", "driveways"],
    description:
      "From bare red soil around a newly built bungalow to a finished, paved compound: patterned interlocking pavers across the courtyard, a raised paved apron along the house for planters, kerb edging and a drainage channel to carry rainwater away.",
    paverType: "Patterned interlocking pavers",
    featured: false,
    images: [
      P("blue-bungalow-courtyard", "before.jpg", "before", "Bare red soil around a newly built bungalow before paving", 1500, 728),
      P("blue-bungalow-courtyard", "after.jpg", "after", "Patterned paving, raised apron with planters and drainage channel beside the finished bungalow", 1200, 1600),
    ],
  },
];

/** Second before & after transformation added October 2026 (photos supplied by Mozaik Pavers). */
export const TRANSFORMATIONS_2026_10_B: PortfolioProject[] = [
  {
    slug: "housing-estate-access-road",
    name: "Housing Estate Access Road",
    location: "Malawi",
    categories: ["residential", "driveways"],
    description:
      "The shared access road between the houses of a new housing estate, taken from trenched red soil to a paved surface. Interlocking zig-zag pavers are laid wall to wall between the houses and up to each entrance step.",
    paverType: "Interlocking zig-zag pavers",
    featured: false,
    images: [
      P("housing-estate-access-road", "before.jpg", "before", "Trenched red-soil road between newly built houses before paving", 1200, 1600),
      P("housing-estate-access-road", "after.jpg", "after", "Interlocking zig-zag paving being laid between the houses of a housing estate", 1200, 1600),
    ],
  },
];

/**
 * Seed batches. Each is inserted once (tracked by its audit marker), so a
 * project deleted in the admin is never recreated. Add new batches at the end.
 */
export const PORTFOLIO_BATCHES: { marker: string; projects: PortfolioProject[]; sortOffset: number }[] = [
  { marker: "seed.portfolio", projects: PORTFOLIO, sortOffset: 0 },
  { marker: "seed.portfolio:commercial-2026-10", projects: COMMERCIAL_2026_10, sortOffset: 20 },
  { marker: "seed.portfolio:transformations-2026-10", projects: TRANSFORMATIONS_2026_10, sortOffset: 40 },
  { marker: "seed.portfolio:transformations-2026-10-b", projects: TRANSFORMATIONS_2026_10_B, sortOffset: 41 },
];
