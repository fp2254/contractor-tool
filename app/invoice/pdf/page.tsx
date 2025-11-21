import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40 },
  logo: { width: 120, height: 120, marginBottom: 30, alignSelf: "center" },
  title: { fontSize: 28, marginBottom: 20, textAlign: "center" },
  text: { fontSize: 14, marginBottom: 10 },
  photo: { width: "100%", height: 400, marginVertical: 20 },
});

export default function InvoicePDF({ invoice }: any) {
  const blob = pdf(
    <Document>
      <Page size="A4" style={styles.page}>
        {invoice.logo && <Image src={invoice.logo} style={styles.logo} />}
        <Text style={styles.title}>INVOICE</Text>
        <Text style={styles.text}>Client: {invoice.client}</Text>
        <Text style={styles.text}>Total: ${invoice.total}</Text>
        {invoice.photos.map((p: any) => (
          <View key={p.uri}>
            <Text>{p.title}</Text>
            <Image src={p.uri} style={styles.photo} />
            <Text>{p.note}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 30 }}>Notes: {invoice.notes}</Text>
      </Page>
    </Document>
  ).toBlob();

  return <button onClick={() => blob.then(b => URL.createObjectURL(b))}>Download PDF</button>;
}
