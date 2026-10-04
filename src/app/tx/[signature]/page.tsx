import { Analyzer } from "@/frontend/analyzer";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ signature: string }>;
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { signature } = await params,
    { cluster } = await searchParams;
  return (
    <section className="page result-page">
      <Analyzer
        initial={signature}
        initialNetwork={cluster === "devnet" ? "devnet" : "mainnet"}
      />
    </section>
  );
}
