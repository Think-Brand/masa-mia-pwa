import AjustesEditor from "./AjustesEditor";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return (
    <main className="px-4 pt-4">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Ajustes
      </h1>
      <p className="text-xs text-canela mt-1">
        Apaga, prende, edita. Sin tocar código.
      </p>
      <AjustesEditor />
    </main>
  );
}
