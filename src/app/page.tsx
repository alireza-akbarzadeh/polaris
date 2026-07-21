"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export default function Home() {
  return (
    <div>
      <Projects />
    </div>
  );
}

function Projects() {
  const projects = useQuery(api.projects.getProjects);
  const createProject = useMutation(api.projects.createProject);

  const hadleTrhowError = () => {
    throw new Error("client error: something went wrong in the browser");
  }
  const handleApiError = async () => {
    await fetch("/api/demo/error", {
      method: "POST",
    });
  }
  const handleInngestError = async () => {
    await fetch("/api/demo/inngest-error", {
      method: "POST",
    });
  }
  return (
    <div>
      <Button
        onClick={() => {
          createProject({
            name: "Project 1",
          });
        }}
      >
        Create Project
      </Button>
      <Button onClick={handleApiError}>API Error</Button>
      <Button onClick={handleInngestError}>Inngest Error</Button>
      <Button variant="destructive" onClick={hadleTrhowError}>client Error</Button>
      {projects?.map((project) => (
        <div key={project._id}>
          {project.name}
          {project.importStatus} {project.ownerId}
        </div>
      ))}
    </div>
  );
}
