import { Search } from "@/components/search";

export default function AddressPage({
  params,
}: {
  params: { address: string };
}) {
  const { address } = params;

  return (
    <main className="container pb-8">
      <header className="flex flex-col items-center py-16 gap-3">
        <h1 className="text-6xl">⬛️ 🔎</h1>
        <h2 className="text-2xl font-bold">mrgn account search</h2>
      </header>
      <div className="flex flex-col items-center">
        <Search address={address} />
      </div>
    </main>
  );
}
