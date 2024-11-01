export function Button({
  selected,
  children,
  onClick,
}: {
  selected?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className={
        selected
          ? "bg-blue-600 font-bold text-white rounded-xl p-2 text-lg"
          : "bg-blue-400 hover:font-bold hover:bg-blue-600 text-white rounded-xl p-2 text-lg"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
