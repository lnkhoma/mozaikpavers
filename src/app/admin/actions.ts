"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { authenticate, endSession, requestIp, requireAdmin, requireRole, startSession } from "@/lib/auth/session";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { PricingConfig } from "@/lib/pricing/types";
import { CACHE_TAGS } from "@/lib/public-data";
import { LIMITS, rateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { updateLead, updateSiteVisit } from "@/lib/services/leads";
import { updatePricing } from "@/lib/services/pricing";
import {
  addProjectImage,
  createProject,
  deleteProject,
  removeProjectImage,
  setProjectFlags,
  updateProject,
} from "@/lib/services/projects";
import { saveImage, UploadError } from "@/lib/storage";
import {
  fieldErrors,
  leadUpdateSchema,
  loginSchema,
  pricingUpdateSchema,
  projectSchema,
  siteVisitUpdateSchema,
} from "@/lib/validation/schemas";

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidateProjects = () => revalidateTag(CACHE_TAGS.projects, { expire: 0 });

/* ------------------------------- Auth ------------------------------- */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ip = await requestIp();
  const keys = [`login:ip:${ip}`, `login:email:${parsed.data.email}`];
  const limited = keys.map((k) => rateLimit(k, LIMITS.login.limit, LIMITS.login.windowMs)).find((r) => !r.ok);
  if (limited) {
    logger.warn("admin.login_rate_limited", { ip });
    return { message: `Too many attempts. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minutes.` };
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    logger.warn("admin.login_failed", { ip });
    return { message: "Incorrect email or password." };
  }
  keys.forEach(resetRateLimit);
  await startSession(user);
  logger.info("admin.login", { userId: user.id, ip });

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

/* ------------------------------- Leads ------------------------------ */

export async function updateLeadAction(leadId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!UUID.test(leadId)) return { message: "Lead not found." };
  const parsed = leadUpdateSchema.safeParse({ status: formData.get("status"), adminNotes: formData.get("adminNotes") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    await updateLead(leadId, parsed.data, { actorUserId: user.id, ipAddress: await requestIp() });
  } catch (error) {
    logger.error("admin.lead_update_failed", { error, leadId });
    return { message: "Could not save the lead." };
  }
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead updated." };
}

export async function updateSiteVisitAction(visitId: string, leadId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!UUID.test(visitId)) return { message: "Visit not found." };
  const parsed = siteVisitUpdateSchema.safeParse({ status: formData.get("status"), scheduledFor: formData.get("scheduledFor") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const scheduledFor = parsed.data.scheduledFor ? new Date(`${parsed.data.scheduledFor}:00+02:00`) : null;
  try {
    await updateSiteVisit(visitId, { status: parsed.data.status, scheduledFor }, { actorUserId: user.id, ipAddress: await requestIp() });
  } catch (error) {
    logger.error("admin.site_visit_update_failed", { error, visitId });
    return { message: "Could not save the site visit." };
  }
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin");
  return { ok: true, message: "Site visit updated." };
}

/* ------------------------------ Projects ---------------------------- */

function projectInput(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    location: formData.get("location") ?? "",
    categories: formData.getAll("categories").filter((c): c is ProjectCategory => PROJECT_CATEGORIES.includes(c as ProjectCategory)),
    description: formData.get("description") ?? "",
    squareMetres: formData.get("squareMetres") ?? "",
    paverType: formData.get("paverType") ?? "",
    completionDate: formData.get("completionDate") ?? "",
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
}

export async function saveProjectAction(projectId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = projectInput(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  const input = { ...parsed.data, slug: parsed.data.slug || undefined };
  const ctx = { actorUserId: user.id, ipAddress: await requestIp() };

  let id = projectId;
  try {
    if (projectId) {
      if (!UUID.test(projectId)) return { message: "Project not found." };
      await updateProject(projectId, input, ctx);
    } else {
      id = (await createProject(input, ctx)).id;
    }
  } catch (error) {
    logger.error("admin.project_save_failed", { error });
    return { message: "Could not save the project." };
  }
  invalidateProjects();
  revalidatePath("/admin/projects");
  if (!projectId) redirect(`/admin/projects/${id}?created=1`);
  return { ok: true, message: "Project saved." };
}

export async function toggleProjectFlagAction(projectId: string, flag: "featured" | "published", value: boolean) {
  const user = await requireAdmin();
  if (!UUID.test(projectId)) return;
  await setProjectFlags(projectId, { [flag]: value }, { actorUserId: user.id, ipAddress: await requestIp() });
  invalidateProjects();
  revalidatePath("/admin/projects");
}

export async function deleteProjectAction(projectId: string) {
  const user = await requireAdmin();
  if (!UUID.test(projectId)) return;
  await deleteProject(projectId, { actorUserId: user.id, ipAddress: await requestIp() });
  invalidateProjects();
  revalidatePath("/admin/projects");
  redirect("/admin/projects?deleted=1");
}

export async function uploadProjectImageAction(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!UUID.test(projectId)) return { message: "Project not found." };
  const kind = formData.get("kind");
  if (kind !== "before" && kind !== "after" && kind !== "gallery") return { message: "Choose an image type." };
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { message: "Choose an image to upload." };
  if (kind !== "gallery" && files.length > 1) return { message: "Upload a single before or after image." };
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);

  try {
    for (const file of files.slice(0, 10)) {
      const stored = await saveImage(file);
      await addProjectImage(projectId, { kind, url: stored.url, storageKey: stored.key, alt, width: stored.width, height: stored.height }, { actorUserId: user.id, ipAddress: await requestIp() });
    }
  } catch (error) {
    if (error instanceof UploadError) return { message: error.message };
    logger.error("admin.image_upload_failed", { error });
    return { message: "Upload failed. Please try again." };
  }
  invalidateProjects();
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true, message: files.length > 1 ? `${files.length} images uploaded.` : "Image uploaded." };
}

export async function removeProjectImageAction(imageId: string) {
  const user = await requireAdmin();
  if (!UUID.test(imageId)) return;
  const projectId = await removeProjectImage(imageId, { actorUserId: user.id, ipAddress: await requestIp() });
  invalidateProjects();
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

/* ------------------------------- Pricing ---------------------------- */

export async function updatePricingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("admin");
  const raw = Object.fromEntries(formData.entries());
  const parsed = pricingUpdateSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please fix the highlighted values." };
  const { changeNote, ...values } = parsed.data;
  try {
    const version = await updatePricing(values as PricingConfig, { actorUserId: user.id, changeNote, ipAddress: await requestIp() });
    revalidateTag(CACHE_TAGS.pricing, { expire: 0 });
    revalidatePath("/admin/pricing");
    return { ok: true, message: `Pricing saved as version ${version}. New quotations use these rates immediately.` };
  } catch (error) {
    logger.error("admin.pricing_update_failed", { error });
    return { message: "Could not save pricing." };
  }
}
