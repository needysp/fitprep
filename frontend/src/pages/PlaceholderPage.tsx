export function PlaceholderPage({
  title,
  description,
  slice,
}: {
  title: string
  description: string
  slice: number
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-soft">
        Coming in Slice {slice}.
      </div>
    </div>
  )
}
