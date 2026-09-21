type Props = {
  items?: string[];
};

export function MeetingAgendaCard({ items = [] }: Props) {
  return (
    <section className="flex h-full min-h-[180px] flex-col rounded-[22px] border border-[#E0E7EE] bg-white p-5">
      <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#121B29] sm:text-[18px]">
        Meeting Agenda
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-[14px] text-[#667383]">No agenda items for this meeting.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-center gap-3">
              <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#076BEE] text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <span className="text-[14px] tracking-[-0.01em] text-[#121B29] sm:text-[15px]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
