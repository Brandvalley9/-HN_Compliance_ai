import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { 
  getAllUserProfiles, 
  updateUserRoleInFirestore, 
  FirestoreUserProfile 
} from '../../lib/userService';
import { 
  ShieldCheck, 
  UserCog, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  UserCheck, 
  Search 
} from 'lucide-react';

export const UserRoleAdmin: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<FirestoreUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Direct manual update state
  const [manualUid, setManualUid] = useState('');
  const [manualRole, setManualRole] = useState<UserRole>('campaigner');
  const [searchQuery, setSearchQuery] = useState('');

  // Guard: Only reviewers can access this interface
  const isReviewer = user?.role === 'reviewer';

  const loadUsers = async () => {
    if (!isReviewer) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const list = await getAllUserProfiles();
      setUsersList(list);
    } catch (err: unknown) {
      console.error('Failed to load user directory:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to query user profiles from Firestore.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReviewer) {
      loadUsers();
    }
  }, [isReviewer]);

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    if (!targetUid) {
      setStatusMessage({ type: 'error', text: 'Target UID is required.' });
      return;
    }
    setUpdatingUid(targetUid);
    setStatusMessage(null);
    try {
      await updateUserRoleInFirestore(targetUid, newRole);
      setStatusMessage({
        type: 'success',
        text: `Successfully updated user ${targetUid} to '${newRole}' in Firestore.`
      });
      // Refresh user list
      await loadUsers();
    } catch (err: unknown) {
      console.error('Failed to update role in Firestore:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Firestore security rules rejected this update.'
      });
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid User UID.' });
      return;
    }
    await handleRoleChange(manualUid.trim(), manualRole);
  };

  if (!isReviewer) {
    return (
      <div id="user-role-admin-unauthorized" className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-rose-900">Unauthorized Access</h3>
          <p className="text-sm mt-1">
            User Role Administration is strictly restricted to reviewers. Role changes cannot be performed client-side or by non-reviewer accounts.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.uid.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div id="user-role-admin-panel" className="space-y-6">
      {/* Header & Security Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                User Role Administration
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Reviewer Gated
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Server-side role management enforced by Firestore security rules. Writes to the <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">role</code> field are permitted only for verified reviewers.
              </p>
            </div>
          </div>

          <button
            id="refresh-users-btn"
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Directory
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            id="role-admin-status-msg"
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Direct Assignment Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Direct Role Modification by UID
        </h3>
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label htmlFor="manual-uid-input" className="block text-xs font-medium text-slate-700 mb-1">
              Target User UID
            </label>
            <input
              id="manual-uid-input"
              type="text"
              placeholder="e.g. 5xXjK9v1AbCde..."
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="manual-role-select" className="block text-xs font-medium text-slate-700 mb-1">
              New Assigned Role
            </label>
            <select
              id="manual-role-select"
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="campaigner">Campaigner (Brand/Advertiser)</option>
              <option value="creator">Creator (Influencer/Submitter)</option>
              <option value="reviewer">Reviewer (Compliance Officer)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              id="submit-manual-role-btn"
              type="submit"
              disabled={updatingUid !== null || !manualUid.trim()}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {updatingUid === manualUid.trim() ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              Update
            </button>
          </div>
        </form>
      </div>

      {/* Directory of Registered Users */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Firestore User Profiles</h3>
            <p className="text-xs text-slate-500">Live profiles read from /users collection in Firestore</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="search-users-input"
              type="text"
              placeholder="Filter by name, email, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            Loading user directory from Firestore...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {usersList.length === 0
              ? 'No user profile documents found in Firestore /users. Users will appear here after signing up.'
              : 'No users matched your search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4 font-mono">UID</th>
                  <th className="py-2.5 px-4">Current Role</th>
                  <th className="py-2.5 px-4 text-right">Assign New Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isCurrentTarget = updatingUid === u.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{u.displayName || 'Unnamed User'}</div>
                        <div className="text-[11px] text-slate-500">{u.email || 'No email provided'}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {u.uid}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'reviewer'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : u.role === 'creator'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {(['campaigner', 'creator', 'reviewer'] as UserRole[]).map((r) => {
                            const isCurrent = u.role === r;
                            return (
                              <button
                                key={r}
                                id={`assign-role-${u.uid}-${r}-btn`}
                                type="button"
                                disabled={isCurrent || isCurrentTarget}
                                onClick={() => handleRoleChange(u.uid, r)}
                                className={`px-2 py-1 text-[11px] font-medium rounded-md border transition-all ${
                                  isCurrent
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
                                }`}
                                title={isCurrent ? `User is already a ${r}` : `Change role to ${r}`}
                              >
                                {isCurrentTarget && !isCurrent ? (
                                  <RefreshCw className="w-3 h-3 animate-spin inline" />
                                ) : (
                                  r.charAt(0).toUpperCase() + r.slice(1)
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
