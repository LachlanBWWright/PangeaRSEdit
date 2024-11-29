type Props = {
  className?: string;
  acceptType: string;
  disabled?: boolean;
  handleOnChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export function FileUpload({
  className,
  handleOnChange,
  acceptType,
  disabled,
}: Props) {
  return (
    <input
      className={
        "file:border-0 bg-black rounded-xl border-2 border-white  file:bg-blue-500 file:hover:bg-blue-600 file:disabled:bg-blue-300 file:enabled:hover:cursor-pointer  text-white file:text-white  " +
        className
      }
      type="file"
      accept={acceptType}
      onChange={handleOnChange}
      disabled={disabled}
    />
  );
}
