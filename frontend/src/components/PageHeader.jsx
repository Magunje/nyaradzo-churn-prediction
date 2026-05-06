export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 font-display text-[2rem] font-bold leading-tight text-slate-900 md:text-[2.2rem]">
          {title}
        </h1>
        {description ? <p className="mt-2 text-[14px] leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
