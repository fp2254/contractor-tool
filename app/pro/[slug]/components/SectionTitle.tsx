const C = {
  navy: "#0f1f3d",
  lightGray: "#e8ecf2",
};

type Props = {
  children: React.ReactNode;
  condensedFont: string;
};

export function SectionTitle({ children, condensedFont }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span
        className={condensedFont}
        style={{
          fontWeight: 800,
          fontSize: 19,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: C.navy,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 2, background: C.lightGray }} />
    </div>
  );
}
