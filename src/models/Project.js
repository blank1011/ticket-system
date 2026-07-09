import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

projectSchema.index({ name: 1 }, { unique: true });

export const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
