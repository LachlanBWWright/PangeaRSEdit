type Props = {
  className?: string;
  acceptType: string;
  handleOnChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export function FileUpload({ className, handleOnChange, acceptType }: Props) {
  return (
    <input
      className={
        "file:border-0 bg-black rounded-xl border-2 border-white file:bg-blue-500 file:hover:bg-blue-600 file:hover:cursor-pointer  text-white file:text-white  " +
        className
      }
      type={acceptType}
      accept=".ter.rsrc"
      onChange={handleOnChange}
    />
  );
}
