import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page prose">
      <h1>404</h1>
      <p>Trang không tồn tại / Page not found.</p>
      <Link href="/">pipicachu →</Link>
    </section>
  );
}
