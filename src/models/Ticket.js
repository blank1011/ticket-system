import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolve", "delete"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["not_priority", "medium", "high_priority", "critical"],
      default: "not_priority",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ticketSchema.index({ projectId: 1, createdAt: -1 });

if (mongoose.models.Ticket) {
  delete mongoose.models.Ticket;
}

export const Ticket = mongoose.model("Ticket", ticketSchema);
