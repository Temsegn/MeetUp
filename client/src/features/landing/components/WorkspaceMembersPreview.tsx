import { Search } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { LP_CARD } from '../landing-ui';

const ROWS = [
  { name: 'Owner', email: 'workspace owner', role: 'Owner', status: 'active' as const },
  { name: 'Admin', email: 'invited teammate', role: 'Admin', status: 'active' as const },
  { name: 'Member', email: 'pending invite', role: 'Member', status: 'pending' as const },
];

const ROLE: Record<string, string> = {
  Owner: 'bg-[#E8F1FE] text-[#016BE6]',
  Admin: 'bg-[#F1F5F9] text-[#334155]',
  Member: 'bg-[#F8FAFC] text-[#6F7B8C]',
};

/** Decorative clone of Settings → Members. */
export function WorkspaceMembersPreview() {
  return (
    <div className={`${LP_CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF1] bg-white px-4 py-3">
        <div>
          <p className="text-[13px] font-bold tracking-tight text-[#151D2B]">Members</p>
          <p className="text-[11px] text-[#6F7B8C]">Workspace · Roles and invitations</p>
        </div>
        <span className="inline-flex h-8 items-center rounded-[14px] bg-[#016BE6] px-3 text-[12px] font-semibold text-white">
          Invite members
        </span>
      </div>
      <div className="border-b border-[#E8ECF1] bg-white px-4 py-3">
        <div className="flex h-9 items-center gap-2 rounded-[14px] border border-[#E1E7EE] bg-white px-3 text-[12px] text-[#94A3B8]">
          <Search className="size-3.5" />
          Search members
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-start text-[12px]">
          <thead className="bg-[#F8FAFC] text-[#6F7B8C]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Member</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F5]">
            {ROWS.map((row) => (
              <tr key={row.role} className="bg-white">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#016BE6] text-[10px] font-bold text-white">
                      {row.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-[#151D2B]">{row.name}</p>
                      <p className="text-[11px] text-[#6F7B8C]">{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold', ROLE[row.role])}>
                    {row.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold capitalize',
                      row.status === 'active' ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FFF7ED] text-[#C2410C]',
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
