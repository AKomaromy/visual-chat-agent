import { Chat } from "@/app/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Mirror</h1>
        <p className="text-sm text-neutral-400">
          Task 2 fixture — chat.agent() streams a fixture visual response manifest.
        </p>
      </div>
      <Chat />
    </main>
  );
}
