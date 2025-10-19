type Props = { value: number };

export default function ProgressBar({ value }: Props) {
  const v = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full h-2 rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden transition-colors duration-300">
      <div
        className="h-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 ease-in-out"
        style={{ width: `${v}%` }}
      ></div>
    </div>
  );
}
