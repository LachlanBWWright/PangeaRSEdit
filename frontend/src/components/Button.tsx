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
  children,
  onClick,
  disabled,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={
        disabled
          ? "font-semibold bg-green-400 text-white rounded-xl p-2 text-lg"
          : "font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl p-2 text-lg"
      }
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function SmallButton({
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
          ? "font-medium bg-blue-400 text-white rounded-md px-2 py-1 text-sm"
          : selected
          ? "font-medium bg-blue-600 text-white rounded-md px-2 py-1 text-sm"
          : "font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1 text-sm"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
