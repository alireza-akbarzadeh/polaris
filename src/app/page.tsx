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
      {projects?.map((project) => (
        <div key={project._id}>
          {project.name}
          {project.importStatus} {project.ownerId}
        </div>
      ))}
    </div>
  );
}
