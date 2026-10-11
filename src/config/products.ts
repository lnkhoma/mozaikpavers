/**
 * Products shown on /products, each with an original Mozaik Pavers
 * photograph (public/products, metadata stripped).
 *
 * Only uses visible in the photos are described. Add sizes, colours,
 * thicknesses or strength ratings here once confirmed by Mozaik Pavers.
 */
export interface Product {
  slug: string;
  name: string;
  tagline: string;
  /** focus: CSS object-position used when the photo is cropped. */
  image: { src: string; alt: string; width: number; height: number; focus?: string };
  description: string;
  howItsUsed: string;
  bestFor: string[];
  /** Portfolio project that shows this product installed. */
  projectSlug?: string;
}

export const PRODUCTS: Product[] = [
  {
    slug: "rectangular-paving-blocks",
    name: "Rectangular Paving Blocks",
    tagline: "Our most versatile paver for homes and businesses",
    image: {
      src: "/products/rectangular-paving-blocks-driveway.jpg",
      alt: "Rectangular paving blocks laid in a herringbone pattern in front of a modern house",
      width: 900,
      height: 1200,
    },
    description:
      "Solid concrete paving blocks with a clean rectangular shape. Their simple form can be laid in several patterns, so the same block suits a formal driveway or a relaxed garden courtyard.",
    howItsUsed:
      "Laid over a levelled, compacted base on fitting plastic and fitting dust. Set in a herringbone pattern, the blocks lock against each other in two directions, which helps driveways resist turning wheels. In running-bond rows they give a neat finish to paths and patios.",
    bestFor: ["Driveways", "Courtyards & patios", "Walkways", "Compounds"],
    projectSlug: "double-storey-residence-forecourt",
  },
  {
    slug: "interlocking-paving-blocks",
    name: "Interlocking Zig-Zag Paving Blocks",
    tagline: "Shaped edges that key into each other",
    image: {
      src: "/products/interlocking-paving-blocks.jpg",
      alt: "Interlocking zig-zag paving blocks stacked beside a laid area",
      width: 480,
      height: 640,
    },
    description:
      "Concrete blocks with wavy, zig-zag sides that interlock with their neighbours on every edge. Once compacted, the shaped joints keep blocks from sliding apart and spread loads across the surface.",
    howItsUsed:
      "Laid edge-to-edge in continuous rows across large, open areas, then compacted so the interlocking sides grip one another. A practical choice where vehicles turn, park or drive over the paving every day.",
    bestFor: ["Large open grounds", "Parking areas", "Forecourts", "High-traffic areas"],
    projectSlug: "interlocking-paving-grounds",
  },
  {
    slug: "stepping-stones",
    name: "Stepping Stones / Slabs",
    tagline: "Large slabs for garden paths",
    image: {
      src: "/products/stepping-stones.jpg",
      alt: "Concrete stepping stone slabs laid in gravel along a curved garden path",
      width: 900,
      height: 1200,
    },
    description:
      "Large precast concrete slabs with a textured surface, laid one after another to create a stepping-stone path. They give a clean, modern look and a firm, comfortable surface to walk on.",
    howItsUsed:
      "Spaced evenly along the line of the path and bedded firmly, with gravel between the slabs and an edging on each side to hold everything in place. They follow straight lines or gentle curves through a garden or compound.",
    bestFor: ["Garden paths", "Walkways across lawns", "Compound landscaping", "Curved or straight routes"],
  },
  {
    slug: "cross-bridge-covers",
    name: "Cross Bridge Covers",
    tagline: "Slotted concrete covers for surface water",
    image: {
      src: "/products/drainage-channel-covers.jpg",
      alt: "Slotted concrete cross bridge covers ready for installation",
      width: 480,
      height: 640,
    },
    description:
      "Precast concrete covers with long slots that let rainwater pass straight through into the channel below while keeping the surface level and walkable.",
    howItsUsed:
      "Placed in a row over a concrete drainage channel, usually along the edge of a driveway, at a gate or next to a building. During heavy rain, water runs off the paving, through the slots and away from the property instead of pooling.",
    bestFor: ["Driveway edges", "Gateways", "Along buildings", "Rainy-season drainage"],
    projectSlug: "drainage-channels-and-kerbing",
  },
  {
    slug: "concrete-kerbs",
    name: "Concrete Kerbs & Edge Restraints",
    tagline: "A firm, straight edge that holds paving in place",
    image: {
      src: "/products/concrete-kerbs.jpg",
      alt: "Mozaik Pavers fitter setting concrete kerbs between paving and lawn",
      width: 480,
      height: 640,
    },
    description:
      "Precast concrete kerb units that frame the edge of a paved area. A strong edge is essential: without it, the outer pavers can creep outwards and the surface starts to open up.",
    howItsUsed:
      "Set in line and bedded in mortar along the boundary of the paving, for example where a driveway meets a lawn, a flower bed or a deck. They give a crisp border and keep every block in position.",
    bestFor: ["Lawn & garden edges", "Driveway borders", "Planting beds", "Path edges"],
    projectSlug: "modern-home-driveway",
  },
  {
    slug: "precast-drain-system",
    name: "Precast Drain System (Lego Drain)",
    tagline: "Plug-and-play drainage, ready to fit",
    image: {
      src: "/products/precast-drain-system.jpg",
      alt: "Precast U-shaped concrete Lego drain sections ready for installation",
      width: 900,
      height: 1200,
    },
    description:
      "Lego drains are precast concrete drain sections designed as a plug-and-play system: we dig and fit them immediately. Their smooth, factory-finished surface completely cuts the need — and the cost — of plastering the drain.",
    howItsUsed:
      "The sections are set end to end in a dug trench to form a continuous drain. Depending on preference, customers can leave the drain open or have it covered.",
    bestFor: ["Stormwater drainage", "Driveway and compound edges", "Along buildings", "Fast installation"],
  },
];
