import { StyleSheet } from "@react-pdf/renderer";

export const NAVY = "#1B3A6B";
export const LIGHT_GRAY = "#F8FAFC";
export const MID_GRAY = "#94A3B8";
export const TEXT = "#1E293B";
export const TEXT_LIGHT = "#64748B";

export const base = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT,
    backgroundColor: "#FFFFFF",
    padding: 40,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: `2px solid ${NAVY}`,
  },
  bizName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  bizDetail: {
    fontSize: 9,
    color: TEXT_LIGHT,
    marginBottom: 2,
  },
  docLabel: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  docMeta: {
    fontSize: 9,
    color: TEXT_LIGHT,
    textAlign: "right",
    marginTop: 3,
  },
  // Two-column info row
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  infoBox: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    padding: 12,
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MID_GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginBottom: 2,
  },
  infoSub: {
    fontSize: 9,
    color: TEXT_LIGHT,
    marginBottom: 1,
  },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottom: "1px solid #F1F5F9",
  },
  tableRowAlt: {
    backgroundColor: LIGHT_GRAY,
  },
  tableCell: {
    fontSize: 9,
    color: TEXT,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  // Totals
  totalsBox: {
    alignItems: "flex-end",
    marginTop: 12,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    minWidth: 200,
  },
  totalsLabel: {
    fontSize: 9,
    color: TEXT_LIGHT,
    textAlign: "right",
    flex: 1,
    paddingRight: 12,
  },
  totalsValue: {
    fontSize: 9,
    color: TEXT,
    textAlign: "right",
    minWidth: 60,
  },
  totalFinalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: NAVY,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    minWidth: 200,
  },
  totalFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "right",
    paddingRight: 12,
  },
  totalFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    minWidth: 60,
    textAlign: "right",
  },
  // Notes / footer
  notesBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    borderLeft: `3px solid ${NAVY}`,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MID_GRAY,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: TEXT_LIGHT,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #E2E8F0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: MID_GRAY,
  },
});
