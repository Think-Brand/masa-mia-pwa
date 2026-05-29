// Layout pass-through para /staff/* — login y cambiar-password se renderizan sin header.
// El layout real con header vive en /staff/(panel)/layout.tsx.
export default function StaffRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
