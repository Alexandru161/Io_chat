import { useEffect, useMemo, useState } from "react";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; role: string };
};

type Profile = { id: string; username: string; role: string };
type Room = { id: string; name: string };
type Message = {
  id: string;
  content: string;
  roomId?: string;
  user?: { id: string; username: string; role: string } | null;
};

export default function App() {
  const apiBase = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL ?? "/api";
  }, []);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");

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

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    setStatus("Connecting...");

    try {
      const data = await request<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setProfile(data.user);
      setProfileLoaded(true);
      localStorage.setItem("rtchat_access_token", data.accessToken);
      localStorage.setItem("rtchat_refresh_token", data.refreshToken);
      setStatus(mode === "login" ? "Logged in" : "Registered");
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

  const fetchRooms = async () => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Loading rooms...");
    try {
      const data = await request<Room[]>("/rooms", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setRooms(data);
      setStatus("Rooms loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async () => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }
    if (!roomName.trim()) {
      setError("Room name required");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Creating room...");
    try {
      const data = await request<Room>("/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name: roomName.trim() })
      });
      setRooms((prev) => [data, ...prev]);
      setRoomName("");
      setStatus("Room created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (room: Room) => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }

    setActiveRoom(room);
    setLoading(true);
    setError(null);
    setStatus("Loading messages...");
    try {
      const data = await request<Message[]>(`/messages?roomId=${room.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      setMessages(data);
      setStatus(`Room: ${room.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!accessToken) {
      setError("Access token missing");
      return;
    }
    if (!activeRoom) {
      setError("Select a room first");
      return;
    }
    if (!messageText.trim()) {
      setError("Message is empty");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus("Sending message...");
    try {
      const data = await request<Message>("/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ roomId: activeRoom.id, content: messageText.trim() })
      });
      setMessages((prev) => [...prev, data]);
      setMessageText("");
      setStatus("Message sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profileLoaded && profile?.role === "admin";
  return (
    <div className="min-h-screen bg-shell text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">IO</p>
            <h1 className="font-display text-4xl leading-tight text-slate-100 md:text-5xl">
              IO real-time chat.
            </h1>
            <p className="max-w-xl text-lg text-slate-400">
              IO is wired to the NestJS auth stack, Redis, and Socket.io. Use the panel on the
              right to create a user and verify tokens before wiring rooms and messages.
            </p>
            {isAdmin ? (
              <button
                className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-400"
                onClick={() => {
                  window.location.href = "/admin";
                }}
              >
                Open admin panel
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-soft">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Status
              </h2>
              <p className="mt-3 text-2xl font-semibold text-slate-100">{status}</p>
              <p className="mt-2 text-sm text-slate-400">API base: {apiBase}</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-soft">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Profile
              </h2>
              {profile ? (
                <div className="mt-3 space-y-1 text-sm text-slate-300">
                  <p className="text-lg font-semibold text-slate-100">{profile.username}</p>
                  <p className="text-xs text-slate-500">Signed in</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No profile loaded yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">IO auth console</h2>
            {!profile ? (
              <div className="flex rounded-full border border-slate-700 bg-slate-900 p-1 text-xs">
                <button
                  className={`rounded-full px-4 py-1 transition ${
                    mode === "login" ? "bg-emerald-400 text-slate-900" : "text-slate-400"
                  }`}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
                <button
                  className={`rounded-full px-4 py-1 transition ${
                    mode === "register" ? "bg-emerald-400 text-slate-900" : "text-slate-400"
                  }`}
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </div>
            ) : null}
          </div>

          {!profile ? (
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-400">
                Username
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="min 3 chars"
                />
              </label>
              <label className="block text-sm text-slate-400">
                Password
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="min 6 chars"
                />
              </label>

              {error ? (
                <p className="rounded-2xl bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
                  {error}
                </p>
              ) : null}

              <button
                className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300"
                onClick={handleAuth}
                disabled={loading}
              >
                {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p>
                  You are signed in as{" "}
                  <span className="font-semibold text-slate-100">{profile.username}</span>.
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
      </div>

      <div className="mx-auto mt-4 grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[0.35fr_0.65fr]">
        <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Rooms</h3>
            <button
              className="text-xs uppercase tracking-[0.3em] text-emerald-300"
              onClick={fetchRooms}
            >
              Load
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
              New room
              <input
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="General"
              />
            </label>
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300"
              onClick={createRoom}
              disabled={loading}
            >
              Create room
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {rooms.length === 0 ? (
              <p className="text-sm text-slate-500">No rooms yet. Load or create one.</p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    activeRoom?.id === room.id
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-800 text-slate-300 hover:border-emerald-400"
                  }`}
                  onClick={() => loadMessages(room)}
                >
                  <span className="truncate">{room.name}</span>
                  <span className="text-xs text-slate-500">open</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Active room</p>
              <h3 className="text-lg font-semibold text-slate-100">
                {activeRoom ? activeRoom.name : "Select a room"}
              </h3>
            </div>
            {activeRoom ? (
              <button
                className="text-xs uppercase tracking-[0.3em] text-emerald-300"
                onClick={() => loadMessages(activeRoom)}
              >
                Refresh
              </button>
            ) : null}
          </div>

          <div className="mt-4 h-64 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3"
                >
                  <p className="text-sm text-slate-100">{message.content}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {message.user?.username ?? "system"}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
              New message
              <input
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-sm focus:border-emerald-400 focus:outline-none"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={activeRoom ? `Message #${activeRoom.name}` : "Select a room"}
              />
            </label>
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300"
              onClick={sendMessage}
              disabled={loading}
            >
              Send message
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
