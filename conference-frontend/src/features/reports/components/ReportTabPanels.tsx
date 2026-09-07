import {
  engagementFromMeetings,
  typeColor,
  typeLabel,
  type ReportMeeting,
  type ReportRecording,
} from '../data/reports.data';
import { MeetingEngagementChart } from './MeetingEngagementChart';
import { MeetingsHeatmap } from './MeetingsHeatmap';
import { UserAvatar } from '../../../components/ui/UserAvatar';

export function MeetingsTab({ meetings }: { meetings: ReportMeeting[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#F1F4F8] px-3.5 py-2.5">
        <h3 className="text-[13px] font-semibold text-[#151D2B]">
          Meetings ({meetings.length})
        </h3>
      </div>
      {meetings.length === 0 ? (
        <p className="px-3.5 py-8 text-center text-[12px] text-[#8A94A6]">
          No meetings match the selected filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-[#F1F4F8] text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                <th className="px-3.5 py-2">Meeting</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">People</th>
                <th className="px-3.5 py-2">Join Rate</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b border-[#F8FAFC] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-3.5 py-2.5 text-[12px] font-semibold text-[#151D2B]">{m.title}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#475569]">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: typeColor(m.type) }}
                      />
                      {typeLabel(m.type)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[#6F7B8C]">{m.dateLabel}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#6F7B8C]">{m.duration}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#6F7B8C]">{m.participants}</td>
                  <td className="px-3.5 py-2.5 text-[11px] font-medium text-[#151D2B]">
                    {m.attendance}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ParticipantsTab({
  participants = [],
}: {
  participants?: {
    name: string;
    meetings: string;
    time: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
    pct: number;
  }[];
}) {
  return (
    <section className="rounded-xl border border-[#E8ECF1] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <h3 className="mb-3 text-[13px] font-semibold text-[#151D2B]">Top Participants</h3>
      {participants.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[#8A94A6]">No meetings in this range.</p>
      ) : (
        <ul className="space-y-3">
          {participants.map((p) => (
            <li
              key={p.name}
              className="flex items-center gap-3 rounded-lg border border-[#F1F4F8] px-3 py-2.5"
            >
              <UserAvatar
                name={p.name}
                avatarUrl={p.avatarUrl}
                avatarColor={p.avatarColor}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#151D2B]">{p.name}</p>
                <p className="text-[11px] text-[#8A94A6]">{p.meetings}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div className="h-full rounded-full bg-[#016BE6]" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
              <span className="text-[12px] font-semibold text-[#151D2B]">{p.time}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EngagementTab({
  meetings,
  heatmap,
  engagement,
}: {
  meetings: ReportMeeting[];
  heatmap?: number[][];
  engagement?: { attendance: number[]; camera: number[] };
}) {
  const fromMeetings = engagementFromMeetings(meetings);
  const attendance = engagement?.attendance ?? fromMeetings.attendance;
  const camera = engagement?.camera ?? fromMeetings.camera;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <MeetingEngagementChart attendance={attendance} camera={camera} />
      <MeetingsHeatmap data={heatmap} />
    </div>
  );
}

export function RecordingsTab({ recordings }: { recordings: ReportRecording[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E8ECF1] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#F1F4F8] px-3.5 py-2.5">
        <h3 className="text-[13px] font-semibold text-[#151D2B]">
          Recordings ({recordings.length})
        </h3>
      </div>
      {recordings.length === 0 ? (
        <p className="px-3.5 py-8 text-center text-[12px] text-[#8A94A6]">
          No recordings match the selected filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-[#F1F4F8] text-[10px] font-semibold uppercase tracking-wide text-[#8A94A6]">
                <th className="px-3.5 py-2">Recording</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3.5 py-2">Views</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.id} className="border-b border-[#F8FAFC] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-3.5 py-2.5 text-[12px] font-semibold text-[#151D2B]">{r.title}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#475569]">{typeLabel(r.type)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#6F7B8C]">{r.dateLabel}</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#6F7B8C]">{r.duration}</td>
                  <td className="px-3.5 py-2.5 text-[11px] font-medium text-[#151D2B]">{r.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
