import { useEffect, useMemo, useState } from "react";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; role: string };
};

type Profile = { id: string; username: string; role: string };

type AdminUser = {
  id: string;
  username: string;
  role: string;
  isBanned: boolean;
  createdAt?: string;
};

type AdminRoom = { id: string; name: string; createdAt?: string };

type AdminMessage = {
  id: string;
  content: string;
  roomId?: string;
  createdAt?: string;
  user?: { id: string; username: string; role: string } | null;
};

type AuditLog = {
  id: string;
  actorId?: string | null;
  actorUsername?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type PagedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function App() {
  const apiBase = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL ?? "/api";
  }, []);

  const getRouteFromHash = () => (window.location.hash === "#/support" ? "support" : "admin");
  const [routeView, setRouteView] = useState<"admin" | "support">(getRouteFromHash);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminUsersTotalPages, setAdminUsersTotalPages] = useState(1);
  const [adminUserQuery, setAdminUserQuery] = useState("");
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState("all");
  const [adminUserBanFilter, setAdminUserBanFilter] = useState("all");
  const [adminUserPage, setAdminUserPage] = useState(1);
  const [adminUserPageSize, setAdminUserPageSize] = useState(20);
  const [adminUserSortBy, setAdminUserSortBy] = useState("createdAt");
  const [adminUserSortDir, setAdminUserSortDir] = useState<"asc" | "desc">("desc");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [adminRooms, setAdminRooms] = useState<AdminRoom[]>([]);
  const [adminRoomsTotal, setAdminRoomsTotal] = useState(0);
  const [adminRoomsTotalPages, setAdminRoomsTotalPages] = useState(1);
  const [adminRoomQuery, setAdminRoomQuery] = useState("");
  const [adminRoomPage, setAdminRoomPage] = useState(1);
  const [adminRoomPageSize, setAdminRoomPageSize] = useState(20);
  const [adminRoomSortBy, setAdminRoomSortBy] = useState("createdAt");
  const [adminRoomSortDir, setAdminRoomSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [adminMessagesTotal, setAdminMessagesTotal] = useState(0);
  const [adminMessagesTotalPages, setAdminMessagesTotalPages] = useState(1);
  const [adminMessageQuery, setAdminMessageQuery] = useState("");
  const [adminRoomFilter, setAdminRoomFilter] = useState("");
  const [adminMessageFrom, setAdminMessageFrom] = useState("");
  const [adminMessageTo, setAdminMessageTo] = useState("");
  const [adminMessagePage, setAdminMessagePage] = useState(1);
  const [adminMessagePageSize, setAdminMessagePageSize] = useState(20);
  const [adminMessageSortDir, setAdminMessageSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  useEffect(() => {
    const savedAccess = localStorage.getItem("rtchat_access_token") ?? "";
    const savedRefresh = localStorage.getItem("rtchat_refresh_token") ?? "";
    if (savedAccess) {
      setAccessToken(savedAccess);
    }
    if (savedRefresh) {
      setRefreshToken(savedRefresh);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRouteView(getRouteFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (accessToken && !profileLoaded) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, profileLoaded]);

  const request = async <T,>(path: string, options: RequestInit) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.message ?? response.statusText;
      throw new Error(message);
    }

    return (await response.json()) as T;
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setStatus("Connecting...");

    try {
      const data = await request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setProfile(data.user);
      setProfileLoaded(true);
      localStorage.setItem("rtchat_access_token", data.accessToken);
      localStorage.setItem("rtchat_refresh_token", data.refreshToken);
      setStatus("Logged in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Fetching profile...");
    try {
      const data = await request<Profile>("/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setProfile(data);
      setProfileLoaded(true);
      setStatus("Signed in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Session cleared");
      setAccessToken("");
      setRefreshToken("");
      setProfile(null);
      localStorage.removeItem("rtchat_access_token");
      localStorage.removeItem("rtchat_refresh_token");
    } finally {
      setProfileLoaded(true);
      setLoading(false);
    }
  };

  const adminRequest = async <T,>(path: string, options: RequestInit) => {
    if (!accessToken) {
      throw new Error("Access token missing");
    }

    return request<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers ?? {})
      }
    });
  };

  const buildQuery = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        return;
      }
      search.set(key, String(value));
    });
    return search.toString();
  };

  const loadAdminUsers = async (
    overrides?: Partial<{
      page: number;
      pageSize: number;
      q: string;
      role: string;
      status: string;
      sortBy: string;
      sortDir: string;
    }>
  ) => {
    setLoading(true);
    setError(null);
    setStatus("Loading users...");
    try {
      const page = overrides?.page ?? adminUserPage;
      const pageSize = overrides?.pageSize ?? adminUserPageSize;
      const q = overrides?.q ?? adminUserQuery;
      const role = overrides?.role ?? adminUserRoleFilter;
      const status = overrides?.status ?? adminUserBanFilter;
      const sortBy = overrides?.sortBy ?? adminUserSortBy;
      const sortDir = overrides?.sortDir ?? adminUserSortDir;
      const query = buildQuery({
        page,
        pageSize,
        q,
        role: role === "all" ? undefined : role,
        status: status === "all" ? undefined : status,
        sortBy,
        sortDir
      });
      const data = await adminRequest<PagedResponse<AdminUser>>(`/admin/users?${query}`, {
        method: "GET"
      });
      setAdminUsers(data.data);
      setAdminUsersTotal(data.total);
      setAdminUsersTotalPages(data.totalPages);
      setAdminUserPage(data.page);
      setAdminUserPageSize(pageSize);
      setStatus("Users loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const setUserRole = async (userId: string, role: string) => {
    setLoading(true);
    setError(null);
    setStatus("Updating role...");
    try {
      const data = await adminRequest<AdminUser>(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      if (data) {
        setAdminUsers((prev) => prev.map((user) => (user.id === data.id ? data : user)));
      }
      setStatus("Role updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    setLoading(true);
    setError(null);
    setStatus("Updating ban...");
    try {
      const data = await adminRequest<AdminUser>(`/admin/users/${userId}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ isBanned })
      });
      if (data) {
        setAdminUsers((prev) => prev.map((user) => (user.id === data.id ? data : user)));
      }
      setStatus("Ban updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    setStatus("Deleting user...");
    try {
      await adminRequest(`/admin/users/${userId}`, { method: "DELETE" });
      setAdminUsers((prev) => prev.filter((user) => user.id !== userId));
      setStatus("User deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminRooms = async (
    overrides?: Partial<{
      page: number;
      pageSize: number;
      q: string;
      sortBy: string;
      sortDir: string;
    }>
  ) => {
    setLoading(true);
    setError(null);
    setStatus("Loading rooms...");
    try {
      const page = overrides?.page ?? adminRoomPage;
      const pageSize = overrides?.pageSize ?? adminRoomPageSize;
      const q = overrides?.q ?? adminRoomQuery;
      const sortBy = overrides?.sortBy ?? adminRoomSortBy;
      const sortDir = overrides?.sortDir ?? adminRoomSortDir;
      const query = buildQuery({ page, pageSize, q, sortBy, sortDir });
      const data = await adminRequest<PagedResponse<AdminRoom>>(`/admin/rooms?${query}`, {
        method: "GET"
      });
      setAdminRooms(data.data);
      setAdminRoomsTotal(data.total);
      setAdminRoomsTotalPages(data.totalPages);
      setAdminRoomPage(data.page);
      setAdminRoomPageSize(pageSize);
      setStatus("Rooms loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const renameRoom = async (roomId: string, name: string) => {
    if (!name.trim()) {
      setError("Room name required");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Updating room...");
    try {
      const data = await adminRequest<AdminRoom>(`/admin/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() })
      });
      if (data) {
        setAdminRooms((prev) => prev.map((room) => (room.id === data.id ? data : room)));
      }
      setStatus("Room updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    setLoading(true);
    setError(null);
    setStatus("Deleting room...");
    try {
      await adminRequest(`/admin/rooms/${roomId}`, { method: "DELETE" });
      setAdminRooms((prev) => prev.filter((room) => room.id !== roomId));
      setStatus("Room deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminMessages = async (
    overrides?: Partial<{
      page: number;
      pageSize: number;
      q: string;
      roomId: string;
      from: string;
      to: string;
      sortDir: string;
    }>
  ) => {
    setLoading(true);
    setError(null);
    setStatus("Loading messages...");
    try {
      const page = overrides?.page ?? adminMessagePage;
      const pageSize = overrides?.pageSize ?? adminMessagePageSize;
      const q = overrides?.q ?? adminMessageQuery;
      const roomId = overrides?.roomId ?? adminRoomFilter;
      const from = overrides?.from ?? adminMessageFrom;
      const to = overrides?.to ?? adminMessageTo;
      const sortDir = overrides?.sortDir ?? adminMessageSortDir;
      const query = buildQuery({
        page,
        pageSize,
        q,
        roomId,
        from: from || undefined,
        to: to || undefined,
        sortDir
      });
      const data = await adminRequest<PagedResponse<AdminMessage>>(`/admin/messages?${query}`, {
        method: "GET"
      });
      setAdminMessages(data.data);
      setAdminMessagesTotal(data.total);
      setAdminMessagesTotalPages(data.totalPages);
      setAdminMessagePage(data.page);
      setAdminMessagePageSize(pageSize);
      setStatus("Messages loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!content.trim()) {
      setError("Message required");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Updating message...");
    try {
      const data = await adminRequest<AdminMessage>(`/admin/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: content.trim() })
      });
      if (data) {
        setAdminMessages((prev) => prev.map((msg) => (msg.id === data.id ? data : msg)));
      }
      setStatus("Message updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    setLoading(true);
    setError(null);
    setStatus("Deleting message...");
    try {
      await adminRequest(`/admin/messages/${messageId}`, { method: "DELETE" });
      setAdminMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setStatus("Message deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (
    overrides?: Partial<{
      page: number;
      pageSize: number;
      q: string;
      action: string;
      entityType: string;
      actor: string;
      from: string;
      to: string;
    }>
  ) => {
    setLoading(true);
    setError(null);
    setStatus("Loading audit logs...");
    try {
      const page = overrides?.page ?? auditPage;
      const pageSize = overrides?.pageSize ?? auditPageSize;
      const q = overrides?.q ?? auditQuery;
      const action = overrides?.action ?? auditAction;
      const entityType = overrides?.entityType ?? auditEntityType;
      const actor = overrides?.actor ?? auditActor;
      const from = overrides?.from ?? auditFrom;
      const to = overrides?.to ?? auditTo;
      const query = buildQuery({
        page,
        pageSize,
        q,
        action,
        entityType,
        actor,
        from: from || undefined,
        to: to || undefined
      });
      const data = await adminRequest<PagedResponse<AuditLog>>(`/admin/audit?${query}`, {
        method: "GET"
      });
      setAuditLogs(data.data);
      setAuditTotal(data.total);
      setAuditTotalPages(data.totalPages);
      setAuditPage(data.page);
      setAuditPageSize(pageSize);
      setStatus("Audit logs loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async (endpoint: string, params: Record<string, string | number | undefined>) => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }

    const query = buildQuery(params);
    const response = await fetch(`${apiBase}${endpoint}?${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.message ?? response.statusText;
      setError(message);
      return;
    }

    const blob = new Blob([await response.text()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = endpoint.replace("/admin/export/", "") + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const bulkUserRole = async (role: string) => {
    if (selectedUserIds.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Updating roles...");
    try {
      await adminRequest("/admin/users/bulk-role", {
        method: "POST",
        body: JSON.stringify({ ids: selectedUserIds, role })
      });
      setSelectedUserIds([]);
      await loadAdminUsers();
      setStatus("Roles updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkUserBan = async (isBanned: boolean) => {
    if (selectedUserIds.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Updating bans...");
    try {
      await adminRequest("/admin/users/bulk-ban", {
        method: "POST",
        body: JSON.stringify({ ids: selectedUserIds, isBanned })
      });
      setSelectedUserIds([]);
      await loadAdminUsers();
      setStatus("Bans updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkUserDelete = async () => {
    if (selectedUserIds.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Deleting users...");
    try {
      await adminRequest("/admin/users/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedUserIds })
      });
      setSelectedUserIds([]);
      await loadAdminUsers();
      setStatus("Users deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkRoomDelete = async () => {
    if (selectedRoomIds.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Deleting rooms...");
    try {
      await adminRequest("/admin/rooms/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedRoomIds })
      });
      setSelectedRoomIds([]);
      await loadAdminRooms();
      setStatus("Rooms deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const bulkMessageDelete = async () => {
    if (selectedMessageIds.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    setStatus("Deleting messages...");
    try {
      await adminRequest("/admin/messages/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: selectedMessageIds })
      });
      setSelectedMessageIds([]);
      await loadAdminMessages();
      setStatus("Messages deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    users: adminUsersTotal,
    rooms: adminRoomsTotal,
    messages: adminMessagesTotal
  };

  const resetAdminFilters = () => {
    setAdminUserQuery("");
    setAdminUserRoleFilter("all");
    setAdminUserBanFilter("all");
    setAdminRoomQuery("");
    setAdminMessageQuery("");
    setAdminRoomFilter("");
    setAdminMessageFrom("");
    setAdminMessageTo("");
    setAdminUserSortBy("createdAt");
    setAdminUserSortDir("desc");
    setAdminRoomSortBy("createdAt");
    setAdminRoomSortDir("desc");
    setAdminMessageSortDir("desc");
    setAdminUserPage(1);
    setAdminRoomPage(1);
    setAdminMessagePage(1);
    setSelectedUserIds([]);
    setSelectedRoomIds([]);
    setSelectedMessageIds([]);
  };

  const resetAuditFilters = () => {
    setAuditQuery("");
    setAuditAction("");
    setAuditEntityType("");
    setAuditActor("");
    setAuditFrom("");
    setAuditTo("");
    setAuditPage(1);
  };

  const userPageSelected =
    adminUsers.length > 0 && adminUsers.every((user) => selectedUserIds.includes(user.id));
  const roomPageSelected =
    adminRooms.length > 0 && adminRooms.every((room) => selectedRoomIds.includes(room.id));
  const messagePageSelected =
    adminMessages.length > 0 && adminMessages.every((message) => selectedMessageIds.includes(message.id));

  const isAdmin = profileLoaded && profile?.role === "admin";
  const isSupport = profileLoaded && profile?.role === "support";
  const isModerator = isAdmin || isSupport;
  const canExport = isAdmin;
  const canBulk = isAdmin;
  const canEditUsers = isAdmin;
  const canBanUsers = isAdmin || isSupport;
  const canEditRooms = isAdmin;
  const canDeleteMessages = isAdmin || isSupport;
  const canEditMessages = isAdmin;
  const isSupportRoute = routeView === "support";
  const routeAccessAllowed = isSupportRoute ? isModerator : isAdmin;

  const workspaceTitle = isSupportRoute ? "Support workspace" : "Admin workspace";
  const workspaceDescription = isSupportRoute
    ? "Support view with read-only data plus bans and message removal."
    : "Live control over users, rooms, and messages.";

  const adminPanel = routeAccessAllowed ? (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">{workspaceTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">{workspaceDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
            onClick={() => {
              loadAdminUsers();
              loadAdminRooms();
              loadAdminMessages();
            }}
          >
            Reload all
          </button>
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
            onClick={resetAdminFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{stats.users}</p>
        </div>
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Rooms</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{stats.rooms}</p>
        </div>
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Messages</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{stats.messages}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section
          className="admin-reveal rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft xl:col-span-7"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-100">Users</h3>
              <span className="text-xs text-slate-500">{adminUsersTotal} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                onClick={loadAdminUsers}
              >
                Load
              </button>
              {canExport ? (
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={() =>
                    exportCsv("/admin/export/users", {
                      q: adminUserQuery,
                      role: adminUserRoleFilter === "all" ? undefined : adminUserRoleFilter,
                      status: adminUserBanFilter === "all" ? undefined : adminUserBanFilter,
                      sortBy: adminUserSortBy,
                      sortDir: adminUserSortDir
                    })
                  }
                >
                  Export CSV
                </button>
              ) : null}
            </div>
          </div>

          {canBulk ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>Selected: {selectedUserIds.length}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                  onClick={() => bulkUserRole("admin")}
                >
                  Make admin
                </button>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                  onClick={() => bulkUserRole("support")}
                >
                  Make support
                </button>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                  onClick={() => bulkUserRole("user")}
                >
                  Make user
                </button>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                  onClick={() => bulkUserBan(true)}
                >
                  Ban
                </button>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                  onClick={() => bulkUserBan(false)}
                >
                  Unban
                </button>
                <button
                  className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                  onClick={bulkUserDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                placeholder="Search by username or id"
                value={adminUserQuery}
                onChange={(event) => setAdminUserQuery(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                  value={adminUserRoleFilter}
                  onChange={(event) => setAdminUserRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="support">Support</option>
                </select>
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                  value={adminUserBanFilter}
                  onChange={(event) => setAdminUserBanFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminUserSortBy}
                onChange={(event) => setAdminUserSortBy(event.target.value)}
              >
                <option value="createdAt">Newest</option>
                <option value="username">Username</option>
                <option value="role">Role</option>
              </select>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminUserSortDir}
                onChange={(event) => setAdminUserSortDir(event.target.value as "asc" | "desc")}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminUserPageSize}
                onChange={(event) => setAdminUserPageSize(Number(event.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  {canBulk ? (
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={userPageSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedUserIds((prev) =>
                              Array.from(new Set([...prev, ...adminUsers.map((user) => user.id)]))
                            );
                          } else {
                            setSelectedUserIds((prev) =>
                              prev.filter((id) => !adminUsers.some((user) => user.id === id))
                            );
                          }
                        }}
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-3 text-left">User</th>
                  <th className="px-3 py-3 text-left">Role</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={canBulk ? 6 : 5}>
                      No users loaded.
                    </td>
                  </tr>
                ) : (
                  adminUsers.map((user) => (
                    <tr key={user.id} className="border-t border-slate-800">
                      {canBulk ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedUserIds((prev) => Array.from(new Set([...prev, user.id])));
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                              }
                            }}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-100">{user.username}</div>
                        <div className="text-[11px] text-slate-500">{user.id}</div>
                      </td>
                      <td className="px-3 py-3 uppercase tracking-[0.2em] text-slate-400">
                        {user.role}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                            user.isBanned
                              ? "border-rose-500/40 text-rose-300"
                              : "border-emerald-400/40 text-emerald-300"
                          }`}
                        >
                          {user.isBanned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {canEditUsers ? (
                            <>
                              <button
                                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                                onClick={() => setUserRole(user.id, "admin")}
                              >
                                Make admin
                              </button>
                              <button
                                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                                onClick={() => setUserRole(user.id, "support")}
                              >
                                Make support
                              </button>
                              <button
                                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                                onClick={() => setUserRole(user.id, "user")}
                              >
                                Make user
                              </button>
                            </>
                          ) : null}
                          {canBanUsers && (isAdmin || user.role !== "admin") ? (
                            <button
                              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400"
                              onClick={() => toggleBan(user.id, !user.isBanned)}
                            >
                              {user.isBanned ? "Unban" : "Ban"}
                            </button>
                          ) : null}
                          {canEditUsers ? (
                            <button
                              className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                              onClick={() => deleteUser(user.id)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>{adminUsersTotal} users</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() => loadAdminUsers({ page: Math.max(1, adminUserPage - 1) })}
                disabled={adminUserPage === 1}
              >
                Prev
              </button>
              <span>
                {adminUserPage} / {adminUsersTotalPages}
              </span>
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() => loadAdminUsers({ page: Math.min(adminUsersTotalPages, adminUserPage + 1) })}
                disabled={adminUserPage === adminUsersTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section
          className="admin-reveal rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft xl:col-span-5"
          style={{ animationDelay: "0.12s" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-100">Rooms</h3>
              <span className="text-xs text-slate-500">{adminRoomsTotal} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                onClick={loadAdminRooms}
              >
                Load
              </button>
              {canExport ? (
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={() =>
                    exportCsv("/admin/export/rooms", {
                      q: adminRoomQuery,
                      sortBy: adminRoomSortBy,
                      sortDir: adminRoomSortDir
                    })
                  }
                >
                  Export CSV
                </button>
              ) : null}
            </div>
          </div>

          {canBulk ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>Selected: {selectedRoomIds.length}</span>
              <button
                className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                onClick={bulkRoomDelete}
              >
                Delete selected
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              placeholder="Search by name or id"
              value={adminRoomQuery}
              onChange={(event) => setAdminRoomQuery(event.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminRoomSortBy}
                onChange={(event) => setAdminRoomSortBy(event.target.value)}
              >
                <option value="createdAt">Newest</option>
                <option value="name">Name</option>
              </select>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminRoomSortDir}
                onChange={(event) => setAdminRoomSortDir(event.target.value as "asc" | "desc")}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={adminRoomPageSize}
                onChange={(event) => setAdminRoomPageSize(Number(event.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  {canBulk ? (
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={roomPageSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedRoomIds((prev) =>
                              Array.from(new Set([...prev, ...adminRooms.map((room) => room.id)]))
                            );
                          } else {
                            setSelectedRoomIds((prev) =>
                              prev.filter((id) => !adminRooms.some((room) => room.id === id))
                            );
                          }
                        }}
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-3 text-left">Room</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  {canEditRooms ? <th className="px-3 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {adminRooms.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={canEditRooms ? (canBulk ? 4 : 3) : (canBulk ? 3 : 2)}>
                      No rooms loaded.
                    </td>
                  </tr>
                ) : (
                  adminRooms.map((room) => (
                    <tr key={room.id} className="border-t border-slate-800">
                      {canBulk ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.includes(room.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedRoomIds((prev) => Array.from(new Set([...prev, room.id])));
                              } else {
                                setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id));
                              }
                            }}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-100">{room.name}</div>
                        <div className="text-[11px] text-slate-500">{room.id}</div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {room.createdAt ? new Date(room.createdAt).toLocaleString() : "-"}
                      </td>
                      {canEditRooms ? (
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <input
                              className="w-40 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-100"
                              placeholder="New name"
                              onBlur={(event) => {
                                if (event.target.value.trim()) {
                                  renameRoom(room.id, event.target.value);
                                  event.target.value = "";
                                }
                              }}
                            />
                            <button
                              className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                              onClick={() => deleteRoom(room.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>{adminRoomsTotal} rooms</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() => loadAdminRooms({ page: Math.max(1, adminRoomPage - 1) })}
                disabled={adminRoomPage === 1}
              >
                Prev
              </button>
              <span>
                {adminRoomPage} / {adminRoomsTotalPages}
              </span>
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() => loadAdminRooms({ page: Math.min(adminRoomsTotalPages, adminRoomPage + 1) })}
                disabled={adminRoomPage === adminRoomsTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section
          className="admin-reveal rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft xl:col-span-12"
          style={{ animationDelay: "0.18s" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-100">Messages</h3>
              <span className="text-xs text-slate-500">{adminMessagesTotal} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                onClick={loadAdminMessages}
              >
                Load
              </button>
              {canExport ? (
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={() =>
                    exportCsv("/admin/export/messages", {
                      q: adminMessageQuery,
                      roomId: adminRoomFilter,
                      from: adminMessageFrom || undefined,
                      to: adminMessageTo || undefined,
                      sortDir: adminMessageSortDir
                    })
                  }
                >
                  Export CSV
                </button>
              ) : null}
            </div>
          </div>

          {canBulk ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>Selected: {selectedMessageIds.length}</span>
              <button
                className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                onClick={bulkMessageDelete}
              >
                Delete selected
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              placeholder="Search content, user, room"
              value={adminMessageQuery}
              onChange={(event) => setAdminMessageQuery(event.target.value)}
            />
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              placeholder="Filter by roomId"
              value={adminRoomFilter}
              onChange={(event) => setAdminRoomFilter(event.target.value)}
            />
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              type="date"
              value={adminMessageFrom}
              onChange={(event) => setAdminMessageFrom(event.target.value)}
            />
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              type="date"
              value={adminMessageTo}
              onChange={(event) => setAdminMessageTo(event.target.value)}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select
              className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              value={adminMessageSortDir}
              onChange={(event) => setAdminMessageSortDir(event.target.value as "asc" | "desc")}
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
            <select
              className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
              value={adminMessagePageSize}
              onChange={(event) => setAdminMessagePageSize(Number(event.target.value))}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              className="rounded-full border border-slate-700 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
              onClick={() => loadAdminMessages({ page: 1 })}
            >
              Apply filters
            </button>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  {canBulk ? (
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={messagePageSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedMessageIds((prev) =>
                              Array.from(new Set([...prev, ...adminMessages.map((message) => message.id)]))
                            );
                          } else {
                            setSelectedMessageIds((prev) =>
                              prev.filter((id) => !adminMessages.some((message) => message.id === id))
                            );
                          }
                        }}
                      />
                    </th>
                  ) : null}
                  <th className="px-3 py-3 text-left">Message</th>
                  <th className="px-3 py-3 text-left">User</th>
                  <th className="px-3 py-3 text-left">Room</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminMessages.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={canBulk ? 6 : 5}>
                      No messages loaded.
                    </td>
                  </tr>
                ) : (
                  adminMessages.map((message) => (
                    <tr key={message.id} className="border-t border-slate-800">
                      {canBulk ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMessageIds.includes(message.id)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedMessageIds((prev) =>
                                  Array.from(new Set([...prev, message.id]))
                                );
                              } else {
                                setSelectedMessageIds((prev) => prev.filter((id) => id !== message.id));
                              }
                            }}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-3 text-slate-100">
                        <div className="max-w-[420px] break-words">{message.content}</div>
                        <div className="text-[11px] text-slate-500">{message.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        {message.user?.username ?? "system"}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {message.roomId ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-500">
                        {message.createdAt ? new Date(message.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {canEditMessages ? (
                            <input
                              className="w-48 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-100"
                              placeholder="Edit message"
                              onBlur={(event) => {
                                if (event.target.value.trim()) {
                                  updateMessage(message.id, event.target.value);
                                  event.target.value = "";
                                }
                              }}
                            />
                          ) : null}
                          {canDeleteMessages ? (
                            <button
                              className="rounded-full border border-rose-500/40 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400"
                              onClick={() => deleteMessage(message.id)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>{adminMessagesTotal} messages</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() => loadAdminMessages({ page: Math.max(1, adminMessagePage - 1) })}
                disabled={adminMessagePage === 1}
              >
                Prev
              </button>
              <span>
                {adminMessagePage} / {adminMessagesTotalPages}
              </span>
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                onClick={() =>
                  loadAdminMessages({ page: Math.min(adminMessagesTotalPages, adminMessagePage + 1) })
                }
                disabled={adminMessagePage === adminMessagesTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {isAdmin ? (
          <section
            className="admin-reveal rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft xl:col-span-12"
            style={{ animationDelay: "0.24s" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-100">Audit log</h3>
                <span className="text-xs text-slate-500">{auditTotal} total</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={loadAuditLogs}
                >
                  Load
                </button>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={resetAuditFilters}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                placeholder="Search action, entity, id"
                value={auditQuery}
                onChange={(event) => setAuditQuery(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                placeholder="Actor"
                value={auditActor}
                onChange={(event) => setAuditActor(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                placeholder="Action"
                value={auditAction}
                onChange={(event) => setAuditAction(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                placeholder="Entity type"
                value={auditEntityType}
                onChange={(event) => setAuditEntityType(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                type="date"
                value={auditFrom}
                onChange={(event) => setAuditFrom(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                type="date"
                value={auditTo}
                onChange={(event) => setAuditTo(event.target.value)}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <select
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100"
                value={auditPageSize}
                onChange={(event) => setAuditPageSize(Number(event.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button
                className="rounded-full border border-slate-700 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                onClick={() => loadAuditLogs({ page: 1 })}
              >
                Apply filters
              </button>
            </div>

            <div className="mt-4 overflow-auto rounded-2xl border border-slate-800">
              <table className="min-w-full text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left">Action</th>
                    <th className="px-3 py-3 text-left">Entity</th>
                    <th className="px-3 py-3 text-left">Actor</th>
                    <th className="px-3 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                        No audit entries loaded.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-800">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-100">{log.action}</div>
                          <div className="text-[11px] text-slate-500">{log.entityId ?? "-"}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-400">{log.entityType}</td>
                        <td className="px-3 py-3 text-slate-400">
                          {log.actorUsername ?? log.actorId ?? "system"}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>{auditTotal} entries</span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                  onClick={() => loadAuditLogs({ page: Math.max(1, auditPage - 1) })}
                  disabled={auditPage === 1}
                >
                  Prev
                </button>
                <span>
                  {auditPage} / {auditTotalPages}
                </span>
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 disabled:opacity-40"
                  onClick={() => loadAuditLogs({ page: Math.min(auditTotalPages, auditPage + 1) })}
                  disabled={auditPage === auditTotalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-shell text-slate-100">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">IO</p>
            <h1 className="font-display text-4xl text-slate-100 md:text-5xl">
              {isSupportRoute ? "Support console" : "Admin console"}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-400">
              {isSupportRoute
                ? "Support view for read-only data, bans, and message moderation."
                : "Dedicated admin console for users, rooms, and message moderation."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">
              API base: {apiBase}
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">
              Status: {status}
            </div>
            {isModerator ? (
              <div className="flex rounded-full border border-slate-800 bg-slate-900/80 p-1 text-[11px] uppercase tracking-[0.2em]">
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    isSupportRoute ? "text-slate-400" : "bg-emerald-400 text-slate-900"
                  } ${isAdmin ? "" : "cursor-not-allowed opacity-50"}`}
                  onClick={() => {
                    if (isAdmin) {
                      window.location.hash = "#/admin";
                    }
                  }}
                  disabled={!isAdmin}
                >
                  Admin
                </button>
                <button
                  className={`rounded-full px-3 py-1 transition ${
                    isSupportRoute ? "bg-cyan-400 text-slate-900" : "text-slate-400"
                  }`}
                  onClick={() => {
                    window.location.hash = "#/support";
                  }}
                >
                  Support
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-12">
          <section
            className="admin-reveal rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-8 shadow-soft xl:col-span-5"
            style={{ animationDelay: "0s" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">Sign in</h2>
            </div>

            {!profile ? (
              <div className="mt-6 space-y-4">
                <label className="block text-sm text-slate-400">
                  Username
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="admin username"
                  />
                </label>
                <label className="block text-sm text-slate-400">
                  Password
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="password"
                  />
                </label>

                {error ? (
                  <p className="rounded-2xl bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </p>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? "Working..." : "Sign in"}
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p>
                    Signed in as <span className="font-semibold text-slate-100">{profile.username}</span>.
                  </p>
                  <button
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                    onClick={() => {
                      setAccessToken("");
                      setRefreshToken("");
                      setProfile(null);
                      setProfileLoaded(false);
                      localStorage.removeItem("rtchat_access_token");
                      localStorage.removeItem("rtchat_refresh_token");
                      setStatus("Signed out");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

          </section>

          <section
            className="admin-reveal rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-8 shadow-soft xl:col-span-7"
            style={{ animationDelay: "0.08s" }}
          >
            <h2 className="text-xl font-semibold text-slate-100">Console access</h2>
            <p className="mt-2 text-sm text-slate-500">
              Roles <span className="text-emerald-300">admin</span> and <span className="text-emerald-300">support</span> can view data.
            </p>
            {profileLoaded && !isModerator ? (
              <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                You are signed in but not authorized.
              </div>
            ) : null}
            {profileLoaded && isModerator && !routeAccessAllowed ? (
              <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                You do not have access to this view.
              </div>
            ) : null}
            {isAdmin ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Admin access confirmed.
              </div>
            ) : null}
            {isSupport ? (
              <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                Support access confirmed.
              </div>
            ) : null}
            {routeAccessAllowed ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                  onClick={() => {
                    loadAdminUsers();
                    loadAdminRooms();
                    loadAdminMessages();
                  }}
                >
                  Load workspace data
                </button>
                {isAdmin ? (
                  <button
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                    onClick={loadAuditLogs}
                  >
                    Load audit log
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-10">{adminPanel}</div>
      </div>
    </div>
  );
}
