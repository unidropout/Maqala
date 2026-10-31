import Link from "next/link";
import { ru } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-serif text-7xl font-bold text-gold">404</p>
      <h1 className="mt-4 font-serif text-2xl font-bold">{ru.notFound.title}</h1>
      <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-white">
        {ru.notFound.back}
      </Link>
    </div>
  );
}
