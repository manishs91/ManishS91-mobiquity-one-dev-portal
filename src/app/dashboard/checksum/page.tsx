import { PageHeader } from "@/components/dashboard/PageHeader";
import { CHECKSUM_RULES } from "@/lib/checksum";
import { ChecksumTool } from "./ChecksumTool";

export const metadata = { title: "Checksum tool" };

export default function ChecksumPage() {
  return (
    <>
      <PageHeader
        title="Checksum tool"
        intro="Paste a request or webhook body to see the exact string that gets hashed and the checksum Mobiquity One expects. Everything runs in your browser; nothing is sent to the server."
      />
      <ChecksumTool rules={CHECKSUM_RULES.map(({ id, label, field, inputs }) => ({ id, label, field, inputs }))} />
    </>
  );
}
