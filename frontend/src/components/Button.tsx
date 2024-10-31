export function Button({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="w-full h-full bg-blue-500 hover:bg-blue-700 text-white rounded-xl p-2 text-lg"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
