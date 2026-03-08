"use client";

import { useState } from "react";
import EditorLayout from "@/components/editor/editor-layout";
import NewProjectScreen from "@/components/new-project/new-project-screen";

export default function Home() {
  const [projectCreated, setProjectCreated] = useState(false);

  if (projectCreated) {
    return <EditorLayout />;
  }

  return (
    <NewProjectScreen onProjectCreated={() => setProjectCreated(true)} />
  );
}
