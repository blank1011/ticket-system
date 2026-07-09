import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
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

function shouldAutoDone(status) {
  return status === "resolve" || status === "delete";
}

export async function PATCH(request, { params }) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const update = {};

    if (typeof body?.status === "string") {
      const status = normalizeStatus(body.status.trim());
      if (!STATUS_VALUES.includes(status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      update.status = status;
    }

    if (typeof body?.priority === "string") {
      const priority = normalizePriority(body.priority.trim());
      if (!PRIORITY_VALUES.includes(priority)) {
        return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
      }
      update.priority = priority;
    }

    if (update.status && shouldAutoDone(update.status)) {
      update.priority = "done";
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await connectToDatabase();

    const ticket = await Ticket.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to update ticket." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  await connectToDatabase();

  const ticket = await Ticket.findByIdAndDelete(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
