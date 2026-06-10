/**
 * Browser-side API client for the admin portal. Unlike lib/api.ts (server-side, public,
 * read-only), this runs in the browser: it attaches the JWT (from localStorage) as a Bearer
 * token and the tenant header on every request, and surfaces 401s so the UI can redirect to
 * login. Mutating/admin endpoints are RBAC-guarded server-side; the UI also hides actions
 * the user lacks permission for.
 */

const API_BASE = process.env.NEXT_PUBLIC_DXP_API_BASE ?? 'http://localhost:4000/api';
const TENANT = process.env.NEXT_PUBLIC_DXP_TENANT ?? 'vashundhara';

const TOKEN_KEY = 'dxp.admin.token';
const USER_KEY = 'dxp.admin.user';

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface ContentItem {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: Record<string, unknown>;
  locale?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | string;
  publishedAt?: string | null;
  seo?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  donorEmail?: string | null;
  donorName?: string | null;
  receiptNumber?: string | null;
  createdAt?: string;
}

export interface Subscription {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  status: string;
  donorEmail?: string | null;
  nextChargeAt?: string | null;
  createdAt?: string;
}

export interface BrandingPayload {
  tenant: { id: string; slug: string; name: string };
  branding: {
    shortName?: string;
    tagline?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    socialLinks?: Record<string, string>;
  };
  config: { features?: Record<string, boolean>; menus?: unknown; defaultLocale?: string };
}

export interface Domain {
  id: string;
  hostname: string;
  status: string;
  isPrimary?: boolean;
  verifyToken?: string;
  createdAt?: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export interface TaxRule {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  category?: string | null;
  ratePct: number;
  priority?: number;
  active?: boolean;
}

export interface CertificateTemplate {
  id: string;
  type: string;
  name: string;
  template: string;
  createdAt?: string;
}

export interface Receipt {
  id: string;
  number: string;
  donorName?: string | null;
  donorEmail?: string | null;
  amount?: number;
  currency?: string;
  issuedAt?: string;
}

export interface CurrencyConfig {
  baseCurrency: string;
  enabledCurrencies: string[];
}

export interface ManagedUser {
  id: string;
  email: string;
  name?: string | null;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED' | string;
  roles: string[];
  createdAt?: string;
}

export interface RoleInfo {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  price: number;
  currency: string;
  publishedAt?: string | null;
  _count?: { modules: number; enrollments: number };
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | string;
  order: number;
  content?: Record<string, unknown>;
  videoUrl?: string | null;
  durationSec: number;
  isPreview: boolean;
}

export interface CourseModuleNode {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface CourseTree extends Course {
  modules: CourseModuleNode[];
}

export interface LearnLesson extends Lesson {
  completed: boolean;
}

export interface LearnPayload {
  enrollment: { id: string; progressPct: number; status: string };
  course: Course & {
    modules: { id: string; title: string; order: number; lessons: LearnLesson[] }[];
  };
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: 'PHYSICAL' | 'DIGITAL' | string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | string;
  price: number;
  currency: string;
  category?: string | null;
  imageUrl?: string | null;
  stock?: number | null;
}

export interface OrderItem {
  id: string;
  titleSnapshot: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerEmail: string;
  customerName?: string | null;
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  createdAt?: string;
  items: OrderItem[];
}

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  mode: string;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  price: number;
  currency: string;
  status: string;
  _count?: { registrations: number };
}

export interface EventReg {
  id: string;
  email: string;
  name?: string | null;
  ticketCode: string;
  status: string;
  createdAt?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt?: string | null;
  slots?: number | null;
  active: boolean;
  _count?: { signups: number };
}

export interface VolunteerSignupRow {
  id: string;
  opportunityId: string;
  email: string;
  name?: string | null;
  status: string;
  hours: number;
  createdAt?: string;
}

export interface MembershipPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  benefits: string[];
  active: boolean;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  authorName?: string | null;
  pinned: boolean;
  createdAt?: string;
  _count?: { comments: number };
}

export interface CommunityComment {
  id: string;
  body: string;
  authorName?: string | null;
  createdAt?: string;
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[];
}

/** Thrown on non-2xx responses; carries the HTTP status so callers can detect 401. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- Token storage (client-only) ----
export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  set(token: string, user: AuthUser) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant': TENANT,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const adminApi = {
  apiBase: API_BASE,
  tenant: TENANT,

  // ---- Auth ----
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await request<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(res.accessToken, res.user);
    return res.user;
  },
  me: () => request<AuthUser>('/auth/me'),
  logout: () => tokenStore.clear(),
  async register(email: string, password: string, name?: string): Promise<AuthUser> {
    const res = await request<{ accessToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    tokenStore.set(res.accessToken, res.user);
    return res.user;
  },

  // ---- Branding ----
  getBranding: () => request<BrandingPayload>('/branding'),
  updateBranding: (body: Record<string, unknown>) =>
    request<unknown>('/branding', { method: 'PUT', body: JSON.stringify(body) }),

  // ---- Content (CMS) ----
  listContent: (type?: string) =>
    request<ContentItem[]>(`/content${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  createContent: (body: Record<string, unknown>) =>
    request<ContentItem>('/content', { method: 'POST', body: JSON.stringify(body) }),
  updateContent: (id: string, body: Record<string, unknown>) =>
    request<ContentItem>(`/content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  publishContent: (id: string) =>
    request<ContentItem>(`/content/${id}/publish`, { method: 'POST' }),
  unpublishContent: (id: string) =>
    request<ContentItem>(`/content/${id}/unpublish`, { method: 'POST' }),

  // ---- Donations ----
  listDonations: () => request<Donation[]>('/donations'),
  listSubscriptions: () => request<Subscription[]>('/donations/subscriptions'),
  pauseSubscription: (id: string) =>
    request<unknown>(`/donations/subscriptions/${id}/pause`, { method: 'POST' }),
  resumeSubscription: (id: string) =>
    request<unknown>(`/donations/subscriptions/${id}/resume`, { method: 'POST' }),
  cancelSubscription: (id: string) =>
    request<unknown>(`/donations/subscriptions/${id}/cancel`, { method: 'POST' }),

  // ---- Domains (tenant:admin) ----
  listDomains: () => request<Domain[]>('/domains'),
  addDomain: (hostname: string) =>
    request<{ domain: Domain; dnsRecord: DnsRecord }>('/domains', {
      method: 'POST',
      body: JSON.stringify({ hostname }),
    }),
  verifyDomain: (id: string, token?: string) =>
    request<unknown>(`/domains/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(token ? { token } : {}),
    }),
  setPrimaryDomain: (id: string) =>
    request<unknown>(`/domains/${id}/primary`, { method: 'POST' }),
  removeDomain: (id: string) => request<unknown>(`/domains/${id}`, { method: 'DELETE' }),

  // ---- Tax rules (tenant:admin) ----
  listTaxRules: () => request<TaxRule[]>('/tax/rules'),
  createTaxRule: (body: Record<string, unknown>) =>
    request<TaxRule>('/tax/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateTaxRule: (id: string, body: Record<string, unknown>) =>
    request<TaxRule>(`/tax/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTaxRule: (id: string) => request<unknown>(`/tax/rules/${id}`, { method: 'DELETE' }),

  // ---- Certificates (tenant:admin templates, donation:write issuance) ----
  listCertificateTemplates: () => request<CertificateTemplate[]>('/certificates/templates'),
  createCertificateTemplate: (body: Record<string, unknown>) =>
    request<CertificateTemplate>('/certificates/templates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCertificateTemplate: (id: string, body: Record<string, unknown>) =>
    request<CertificateTemplate>(`/certificates/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  ensureDefault80G: () =>
    request<CertificateTemplate>('/certificates/templates/ensure-80g', { method: 'POST' }),

  // ---- Receipts (donation:read / donation:write) ----
  listReceipts: () => request<Receipt[]>('/receipts'),
  generateReceipt: (donationId: string) =>
    request<Receipt>(`/receipts/generate/${donationId}`, { method: 'POST' }),

  // ---- Currencies (public read) ----
  getCurrencies: () => request<CurrencyConfig>('/currencies'),

  // ---- Users & roles (user:read / user:write) ----
  listUsers: () => request<ManagedUser[]>('/users'),
  listRoles: () => request<RoleInfo[]>('/users/roles'),
  createUser: (body: Record<string, unknown>) =>
    request<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: Record<string, unknown>) =>
    request<ManagedUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  resetUserPassword: (id: string, password: string) =>
    request<unknown>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // ---- LMS (course:read / course:write / course:publish) ----
  listCourses: () => request<Course[]>('/courses'),
  getCourseTree: (id: string) => request<CourseTree>(`/courses/${id}/tree`),
  createCourse: (body: Record<string, unknown>) =>
    request<Course>('/courses', { method: 'POST', body: JSON.stringify(body) }),
  updateCourse: (id: string, body: Record<string, unknown>) =>
    request<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  publishCourse: (id: string) => request<Course>(`/courses/${id}/publish`, { method: 'POST' }),
  unpublishCourse: (id: string) => request<Course>(`/courses/${id}/unpublish`, { method: 'POST' }),
  deleteCourse: (id: string) => request<unknown>(`/courses/${id}`, { method: 'DELETE' }),
  addModule: (courseId: string, body: Record<string, unknown>) =>
    request<unknown>(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(body) }),
  deleteModule: (id: string) => request<unknown>(`/modules/${id}`, { method: 'DELETE' }),
  addLesson: (moduleId: string, body: Record<string, unknown>) =>
    request<unknown>(`/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(body) }),
  updateLesson: (id: string, body: Record<string, unknown>) =>
    request<unknown>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLesson: (id: string) => request<unknown>(`/lessons/${id}`, { method: 'DELETE' }),

  // ---- Learner (any authenticated user) ----
  enrollCourse: (courseId: string) =>
    request<{ id: string; progressPct: number; status: string }>(`/courses/${courseId}/enroll`, {
      method: 'POST',
    }),
  myEnrollments: () =>
    request<
      { id: string; courseId: string; progressPct: number; status: string; course: { slug: string; title: string; coverUrl?: string | null } }[]
    >('/my/enrollments'),
  learn: (courseId: string) => request<LearnPayload>(`/my/courses/${courseId}`),
  completeLesson: (lessonId: string) =>
    request<{ progressPct: number; status: string }>(`/lessons/${lessonId}/complete`, {
      method: 'POST',
    }),

  // ---- Commerce: products (product:read/write) ----
  listProducts: () => request<Product[]>('/products/all'),
  createProduct: (body: Record<string, unknown>) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<unknown>(`/products/${id}`, { method: 'DELETE' }),

  // ---- Commerce: orders (order:read/write) ----
  listOrders: () => request<Order[]>('/orders'),
  fulfillOrder: (id: string) => request<Order>(`/orders/${id}/fulfill`, { method: 'POST' }),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
  refundOrder: (id: string) => request<Order>(`/orders/${id}/refund`, { method: 'POST' }),

  // ---- Commerce: checkout (public or authenticated) ----
  checkout: (body: Record<string, unknown>) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Events (event:read/write) ----
  listEventsAdmin: () => request<EventRow[]>('/events/all'),
  createEvent: (b: Record<string, unknown>) => request<EventRow>('/events', { method: 'POST', body: JSON.stringify(b) }),
  updateEvent: (id: string, b: Record<string, unknown>) => request<EventRow>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  publishEvent: (id: string) => request<EventRow>(`/events/${id}/publish`, { method: 'POST' }),
  unpublishEvent: (id: string) => request<EventRow>(`/events/${id}/unpublish`, { method: 'POST' }),
  deleteEvent: (id: string) => request<unknown>(`/events/${id}`, { method: 'DELETE' }),
  eventRegistrations: (id: string) => request<EventReg[]>(`/events/${id}/registrations`),

  // ---- Volunteers (volunteer:read/write) ----
  listOpportunities: () => request<Opportunity[]>('/volunteer-opportunities/all'),
  createOpportunity: (b: Record<string, unknown>) => request<Opportunity>('/volunteer-opportunities', { method: 'POST', body: JSON.stringify(b) }),
  updateOpportunity: (id: string, b: Record<string, unknown>) => request<Opportunity>(`/volunteer-opportunities/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteOpportunity: (id: string) => request<unknown>(`/volunteer-opportunities/${id}`, { method: 'DELETE' }),
  listSignups: (opportunityId?: string) =>
    request<VolunteerSignupRow[]>(`/volunteer-signups${opportunityId ? `?opportunityId=${opportunityId}` : ''}`),
  updateSignup: (id: string, b: Record<string, unknown>) => request<VolunteerSignupRow>(`/volunteer-signups/${id}`, { method: 'PUT', body: JSON.stringify(b) }),

  // ---- Membership (membership:read/write) ----
  listPlansAdmin: () => request<MembershipPlan[]>('/membership-plans/all'),
  createPlan: (b: Record<string, unknown>) => request<MembershipPlan>('/membership-plans', { method: 'POST', body: JSON.stringify(b) }),
  updatePlan: (id: string, b: Record<string, unknown>) => request<MembershipPlan>(`/membership-plans/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deletePlan: (id: string) => request<unknown>(`/membership-plans/${id}`, { method: 'DELETE' }),

  // ---- Community ----
  listPosts: () => request<CommunityPost[]>('/community/posts'),
  getPost: (id: string) => request<CommunityPostDetail>(`/community/posts/${id}`),
  createPost: (b: Record<string, unknown>) => request<CommunityPost>('/community/posts', { method: 'POST', body: JSON.stringify(b) }),
  addComment: (id: string, b: Record<string, unknown>) => request<unknown>(`/community/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(b) }),
  deletePost: (id: string) => request<unknown>(`/community/posts/${id}`, { method: 'DELETE' }),
  pinPost: (id: string, pinned: boolean) => request<unknown>(`/community/posts/${id}/${pinned ? 'pin' : 'unpin'}`, { method: 'POST' }),

  // ---- Membership (member self-service) ----
  subscribe: (planId: string) =>
    request<{ id: string; status: string }>(`/membership-plans/${planId}/subscribe`, { method: 'POST' }),
  myMemberships: () =>
    request<{ id: string; status: string; plan: { name: string } }[]>('/my/memberships'),
};

/** Convenience: does the stored user hold a given permission key? */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}
