const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const SESSION_STORAGE_KEY = "inventoryscout.session";

export type User = {
  id: number;
  username: string;
  email: string;
  company: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserSignupPayload = {
  username: string;
  email: string;
  password: string;
  company: string | null;
};

export type UserLoginPayload = {
  username: string;
  password: string;
};

export type Product = {
  id: number;
  user_id: number;
  name: string;
  url: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Competitor = {
  id: number;
  user_id: number;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
};

export type ProductAnalysis = {
  id: number;
  user_id: number;
  product_id: number;
  status: string;
  analysis_goal: string | null;
  summary: string;
  market_readiness: string;
  demand_outlook: string;
  competition_level: string;
  demand_score: number;
  competition_score: number;
  trend_score: number;
  opportunity_score: number;
  overall_score: number;
  confidence_score: number;
  confidence_level: string;
  data_freshness: string;
  sources_used: string[];
  sources_failed: string[];
  evidence: Array<Record<string, unknown>>;
  scoring_version: string;
  recommendation: string;
  strengths: string[];
  gaps: string[];
  risks: string[];
  next_steps: string[];
  created_at: string;
  updated_at: string;
};

export type CompetitorSnapshot = {
  id: number;
  name: string;
  url: string;
};

export type CompetitorAnalysis = {
  id: number;
  user_id: number;
  product_id: number;
  status: string;
  analysis_goal: string | null;
  summary: string;
  market_position: string;
  competition_score: number;
  positioning_score: number;
  pricing_pressure_score: number;
  trend_score: number;
  overall_score: number;
  confidence_score: number;
  confidence_level: string;
  data_freshness: string;
  sources_used: string[];
  sources_failed: string[];
  evidence: Array<Record<string, unknown>>;
  scoring_version: string;
  recommendation: string;
  competitor_ids: number[];
  competitor_snapshots: CompetitorSnapshot[];
  strengths: string[];
  opportunities: string[];
  risks: string[];
  created_at: string;
  updated_at: string;
};

export type CompetitorMonitoringRun = {
  id: number;
  user_id: number;
  competitor_id: number;
  status: string;
  summary: string;
  pricing_signal: string | null;
  alert_level: string;
  pricing_change_score: number;
  market_activity_score: number;
  risk_score: number;
  overall_score: number;
  confidence_score: number;
  confidence_level: string;
  data_freshness: string;
  sources_used: string[];
  sources_failed: string[];
  evidence: Array<Record<string, unknown>>;
  scoring_version: string;
  market_signals: string[];
  trend_signals: string[];
  risks: string[];
  recommendations: string[];
  created_at: string;
  updated_at: string;
};

type ApiErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
};

type StoredSession = {
  userId: number;
  accessToken: string;
  expiresAt: string;
};

type AuthResponse = {
  user: User;
  access_token: string;
  token_type: string;
  expires_at: string;
};

export class InventoryScoutApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryScoutApiError";
    this.status = status;
  }
}

export class InventoryScoutAuthError extends Error {
  constructor(message = "You need to log in to continue.") {
    super(message);
    this.name = "InventoryScoutAuthError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readStoredSession();
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    const message =
      payload?.detail ??
      payload?.message ??
      payload?.error ??
      `Request failed with status ${response.status}`;

    throw new InventoryScoutApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredSession(): StoredSession | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const session = JSON.parse(rawValue) as StoredSession;
    if (
      !session.accessToken ||
      !session.expiresAt ||
      Number.isNaN(new Date(session.expiresAt).getTime()) ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: StoredSession) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredSessionUserId() {
  return readStoredSession()?.userId ?? null;
}

export async function signupUser(payload: UserSignupPayload) {
  const response = await apiRequest<AuthResponse>("/users/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  writeStoredSession({
    userId: response.user.id,
    accessToken: response.access_token,
    expiresAt: response.expires_at,
  });
  return response.user;
}

export async function loginUser(payload: UserLoginPayload) {
  const response = await apiRequest<AuthResponse>("/users/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  writeStoredSession({
    userId: response.user.id,
    accessToken: response.access_token,
    expiresAt: response.expires_at,
  });
  return response.user;
}

export async function logoutCurrentUser() {
  try {
    await apiRequest<{ message: string }>("/users/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } finally {
    clearStoredSession();
  }
}

export async function getUserById(userId: number) {
  return apiRequest<User>(`/users/${userId}`);
}

export async function ensureAuthenticatedUser(): Promise<User> {
  const userId = getStoredSessionUserId();

  if (!userId) {
    throw new InventoryScoutAuthError();
  }

  try {
    return await getUserById(userId);
  } catch (error) {
    if (
      error instanceof InventoryScoutApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      clearStoredSession();
      throw new InventoryScoutAuthError();
    }

    throw error;
  }
}

export async function updateCurrentUser(
  userId: number,
  payload: Partial<Pick<User, "username" | "email" | "company" | "is_active">>,
) {
  return apiRequest<User>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listProducts(userId: number) {
  return apiRequest<Product[]>(`/users/${userId}/products/`);
}

export async function createProduct(
  userId: number,
  payload: Pick<Product, "name" | "url" | "category" | "description">,
) {
  return apiRequest<Product>(`/users/${userId}/products/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  userId: number,
  productId: number,
  payload: Partial<Pick<Product, "name" | "url" | "category" | "description">>,
) {
  return apiRequest<Product>(`/users/${userId}/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(userId: number, productId: number) {
  return apiRequest<void>(`/users/${userId}/products/${productId}`, {
    method: "DELETE",
  });
}

export async function listCompetitors(userId: number) {
  return apiRequest<Competitor[]>(`/users/${userId}/competitors/`);
}

export async function createCompetitor(
  userId: number,
  payload: Pick<Competitor, "name" | "url">,
) {
  return apiRequest<Competitor>(`/users/${userId}/competitors/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCompetitor(
  userId: number,
  competitorId: number,
  payload: Partial<Pick<Competitor, "name" | "url">>,
) {
  return apiRequest<Competitor>(`/users/${userId}/competitors/${competitorId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCompetitor(userId: number, competitorId: number) {
  return apiRequest<void>(`/users/${userId}/competitors/${competitorId}`, {
    method: "DELETE",
  });
}

export async function listCompetitorMonitoringRuns(
  userId: number,
  competitorId: number,
) {
  return apiRequest<CompetitorMonitoringRun[]>(
    `/users/${userId}/competitors/${competitorId}/monitoring-runs/`,
  );
}

export async function createCompetitorMonitoringRun(
  userId: number,
  competitorId: number,
  monitoringGoal: string | null,
) {
  return apiRequest<CompetitorMonitoringRun>(
    `/users/${userId}/competitors/${competitorId}/monitoring-runs/`,
    {
      method: "POST",
      body: JSON.stringify({
        monitoring_goal: monitoringGoal,
      }),
    },
  );
}

export async function listProductAnalyses(userId: number, productId: number) {
  return apiRequest<ProductAnalysis[]>(
    `/users/${userId}/products/${productId}/analyses/`,
  );
}

export async function runProductAnalysis(
  userId: number,
  productId: number,
  analysisGoal: string | null,
) {
  return apiRequest<ProductAnalysis>(
    `/users/${userId}/products/${productId}/analyses/`,
    {
      method: "POST",
      body: JSON.stringify({
        analysis_goal: analysisGoal,
      }),
    },
  );
}

export async function listCompetitorAnalyses(userId: number, productId: number) {
  return apiRequest<CompetitorAnalysis[]>(
    `/users/${userId}/products/${productId}/competitor-analyses/`,
  );
}

export async function runCompetitorAnalysis(
  userId: number,
  productId: number,
  competitorIds: number[],
  analysisGoal: string | null,
) {
  return apiRequest<CompetitorAnalysis>(
    `/users/${userId}/products/${productId}/competitor-analyses/`,
    {
      method: "POST",
      body: JSON.stringify({
        competitor_ids: competitorIds,
        analysis_goal: analysisGoal,
      }),
    },
  );
}
