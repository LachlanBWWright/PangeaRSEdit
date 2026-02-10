export function IntroText() {
  return (
    <>
      <p className="text-2xl font-semibold pb-1">Pangea Level Editor</p>
      <p className="text-sm text-gray-300">
        A work in progress level editor for Otto Matic, with preliminary support
        for other Pangea Software games. Built using{" "}
        <a
          className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
          href="https://github.com/jorio/rsrcdump"
        >
          RSRCDump
        </a>{" "}
        by Jorio.{" "}
        <a
          className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
          href="https://github.com/LachlanBWWright/PangeaRSEdit"
        >
          View this project on GitHub
        </a>
      </p>
    </>
  );
}
