import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { Project } from "@/models/Project";
import { Ticket } from "@/models/Ticket";

const STATUS_VALUES = ["open", "in_progress", "resolve", "delete"];
const PRIORITY_VALUES = ["not_priority", "medium", "high_priority", "critical", "done"];

function normalizeStatus(rawStatus) {
  const formatted = String(rawStatus || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (formatted === "closed" || formatted === "resolved") {
    return "resolve";
  }

  if (formatted === "inprogress") {
    return "in_progress";
  }

  return formatted;
}

function normalizePriority(rawPriority) {
  const formatted = String(rawPriority || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (formatted === "low" || formatted === "none") {
    return "not_priority";
  }

  if (formatted === "high") {
    return "high_priority";
  }

  return formatted;
}

function applyResolvedPriority(status, priority) {
  if (status === "resolve" || status === "delete") {
    return "done";
  }

  return priority;
}

export async function GET(request) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return NextResponse.json({ tickets: [] });
  }

  await connectToDatabase();

  const tickets = await Ticket.find(
    { projectId },
    { title: 1, description: 1, status: 1, priority: 1, createdAt: 1 }
  )
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ tickets });
}

export async function POST(request) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const projectId = String(body?.projectId || "").trim();
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const status = normalizeStatus(String(body?.status || "open").trim());
    const rawPriority = normalizePriority(String(body?.priority || "not_priority").trim());
    const priority = applyResolvedPriority(status, rawPriority);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid project is required." }, { status: 400 });
    }

    if (!title || title.length > 80) {
      return NextResponse.json(
        { error: "Title is required and must be 80 characters or fewer." },
        { status: 400 }
      );
    }

    if (description.length > 280) {
      return NextResponse.json(
        { error: "Description must be 280 characters or fewer." },
        { status: 400 }
      );
    }

    if (!STATUS_VALUES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    if (!PRIORITY_VALUES.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    await connectToDatabase();

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const ticket = await Ticket.create({
      projectId,
      title,
      description,
      status,
      priority,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: "Invalid ticket data." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create ticket." }, { status: 500 });
  }
}
