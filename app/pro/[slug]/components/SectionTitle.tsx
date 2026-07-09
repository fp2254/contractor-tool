type Props = {
  children: React.ReactNode;
};

export function SectionTitle({ children }: Props) {
  return (
    <h2 className="text-base font-bold text-slate-800 mb-4">{children}</h2>
  );
}
