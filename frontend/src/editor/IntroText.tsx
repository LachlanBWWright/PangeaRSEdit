export function IntroText() {
  return (
    <>
      <p className="text-2xl font-semibold pb-1">
        Pangea Software Level Editor
      </p>
      <p className="text-sm text-gray-300">
        A level editor for Pangea Software games. Built using{" "}
        <a
          className="text-sky-300 underline hover:text-sky-200 visited:text-violet-300"
          href="https://github.com/jorio/rsrcdump"
        >
          RSRCDump
        </a>{" "}
        by Jorio.{" "}
        <a
          className="text-sky-300 underline hover:text-sky-200 visited:text-violet-300"
          href="https://github.com/LachlanBWWright/PangeaRSEdit"
        >
          View this project on GitHub
        </a>
      </p>
    </>
  );
}
