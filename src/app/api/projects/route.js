import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { Project } from "@/models/Project";

export async function GET(request) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const projects = await Project.find({}, { name: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ projects });
}

export async function POST(request) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();

    if (!name || name.length > 40) {
      return NextResponse.json(
        { error: "Project name is required and must be 40 characters or fewer." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Project.findOne({ name }).lean();
    if (existing) {
      return NextResponse.json({ error: "Project already exists." }, { status: 409 });
    }

    const created = await Project.create({ name });

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: "Invalid project data." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
