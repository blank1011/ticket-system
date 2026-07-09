import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { Project } from "@/models/Project";
import { Ticket } from "@/models/Ticket";

export async function DELETE(request, { params }) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  await connectToDatabase();

  const project = await Project.findByIdAndDelete(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await Ticket.deleteMany({ projectId: id });

  return NextResponse.json({ ok: true });
}
