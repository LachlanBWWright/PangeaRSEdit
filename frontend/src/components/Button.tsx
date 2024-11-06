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

export function DeleteButton({
  onClick,
  children,
  disabled,
}: {
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className="bg-red-400 hover:font-bold hover:bg-red-600 text-white rounded-xl p-2 text-lg"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ZoomButton({
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
          ? "bg-green-600 font-bold text-white rounded-xl p-2 text-lg"
          : "bg-green-400 hover:font-bold hover:bg-green-600 text-white rounded-xl p-2 text-lg"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
