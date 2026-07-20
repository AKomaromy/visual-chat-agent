import { Chat } from "@/app/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Mirror</h1>
        <p className="text-sm text-neutral-400">See what changed. See why it matters to you.</p>
      </div>
      <Chat />
    </main>
  );
}
