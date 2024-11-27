export function Button({
  selected,
  children,
  onClick,
  disabled,
}: {
  selected?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={
        disabled
          ? "font-semibold bg-blue-400 text-white rounded-xl p-2 text-lg"
          : selected
          ? "font-semibold bg-blue-600 text-white rounded-xl p-2 text-lg"
          : "font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-2 text-lg"
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
      className={
        disabled
          ? "font-semibold bg-red-400 text-white rounded-xl p-2 text-lg"
          : "font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl p-2 text-lg"
      }
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
          ? "font-semibold bg-green-600 text-white rounded-xl p-2 text-lg"
          : "font-semibold bg-green-400 hover:bg-green-600 text-white rounded-xl p-2 text-lg"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
