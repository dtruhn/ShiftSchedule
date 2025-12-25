import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type AuthUser,
} from "../../api/client";
import { cx } from "../../lib/classNames";

type AdminUsersPanelProps = {
  isAdmin: boolean;
};

export default function AdminUsersPanel({
  isAdmin,
}: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    listUsers()
      .then((data) => setUsers(data))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await createUser({
        username: username.trim().toLowerCase(),
        password,
      });
      setUsers((prev) => [...prev, created]);
      setUsername("");
      setPassword("");
    } catch {
      setError("Could not create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResetSaving(true);
    try {
      await updateUser(resetTarget, { password: resetPassword });
      setResetTarget("");
      setResetPassword("");
    } catch {
      setError("Could not reset password.");
    } finally {
      setResetSaving(false);
    }
  };

  const handleDelete = async (user: AuthUser) => {
    const confirmDelete = window.confirm(
      `Delete user "${user.username}"? This also removes their saved schedule.`,
    );
    if (!confirmDelete) return;
    setError(null);
    setDeletingUser(user.username);
    try {
      await deleteUser(user.username);
      setUsers((prev) => prev.filter((item) => item.username !== user.username));
    } catch {
      setError("Could not delete user.");
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              User Management
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Create accounts and reset passwords.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="mt-6 grid gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={cx(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm",
              "focus:border-sky-300 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            )}
            required
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cx(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm",
              "focus:border-sky-300 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            )}
            required
          />
          <button
            type="submit"
            disabled={saving}
            className={cx(
              "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white",
              "hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            {saving ? "Creating..." : "Create User"}
          </button>
        </form>

        <form onSubmit={handleReset} className="mt-6 grid gap-4 md:grid-cols-3">
          <select
            value={resetTarget}
            onChange={(event) => setResetTarget(event.target.value)}
            className={cx(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm",
              "focus:border-sky-300 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            )}
            required
          >
            <option value="" disabled>
              Select user
            </option>
            {sortedUsers.map((user) => (
              <option key={user.username} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
          <input
            type="password"
            placeholder="New password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            className={cx(
              "rounded-xl border border-slate-200 px-3 py-2 text-sm",
              "focus:border-sky-300 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            )}
            required
          />
          <button
            type="submit"
            disabled={resetSaving}
            className={cx(
              "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white",
              "hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            {resetSaving ? "Updating..." : "Set Password"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[2fr_1fr_1fr] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <div>Username</div>
            <div className="text-right">Status</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                Loading users...
              </div>
            ) : (
              sortedUsers.map((user) => (
                <div
                  key={user.username}
                  className="grid grid-cols-[2fr_1fr_1fr] items-center px-4 py-3 text-sm dark:text-slate-200 dark:bg-slate-900/70"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {user.username}
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {user.active ? "Active" : "Disabled"}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingUser === user.username}
                      className={cx(
                        "rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600",
                        "hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60",
                        "dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30",
                      )}
                    >
                      {deletingUser === user.username ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
