import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
};

export function SectionCard({ title, action, children, className, headerClassName }: Props) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[#E8ECF1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div
        className={cn(
          'mb-3 flex shrink-0 items-center justify-between gap-2',
          headerClassName,
        )}
      >
        <h3 className="text-[13px] font-semibold text-[#151D2B]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
