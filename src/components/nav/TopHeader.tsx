import Link from "next/link";
import Image from "next/image";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.svg" alt="" width={28} height={28} className="rounded-md" />
        <span className="font-bold text-anthracite">Takwria TN</span>
      </Link>
    </header>
  );
}
