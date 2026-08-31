import { createFileRoute } from "@tanstack/react-router";
import { RimeApp } from "@/components/rime-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RimeApp />;
}
