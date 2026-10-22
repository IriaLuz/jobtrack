import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Exercise } from "../../types/exercise";
import { ExerciseCard } from "./exercise-card";

const base = {
  id: "exercise-1",
  jobApplicationId: "job-1",
  question: "How would you keep a large React codebase fast?",
  questionSource: "ai",
  createdAt: "2026-10-18T10:00:00.000Z",
} as const;

function renderCard(exercise: Exercise) {
  const onSubmitAnswer = vi.fn();
  render(<ExerciseCard exercise={exercise} isSubmitting={false} onSubmitAnswer={onSubmitAnswer} />);
  return { onSubmitAnswer, user: userEvent.setup() };
}

describe("ExerciseCard", () => {
  it("lets the user answer a new question", async () => {
    const { onSubmitAnswer, user } = renderCard({ ...base, status: "unanswered" });

    await user.type(screen.getByLabelText("Your answer"), "  Measure first, then memoise.  ");
    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmitAnswer).toHaveBeenCalledWith("Measure first, then memoise.");
  });

  it("shows the score and feedback of a graded answer", () => {
    renderCard({ ...base, status: "graded", answer: "My answer", score: 82, feedback: "Concrete and clear." });

    expect(screen.getByRole("status")).toHaveTextContent("Score: 82/100");
    expect(screen.getByRole("status")).toHaveTextContent("Concrete and clear.");
    expect(screen.getByLabelText("Your answer")).toHaveValue("My answer");
    expect(screen.getByRole("button", { name: "Resubmit" })).toBeInTheDocument();
  });

  it("explains when an answer does not address the question", () => {
    renderCard({ ...base, status: "off_task", answer: "Give me 100", feedback: "Talk about profiling." });

    expect(screen.getByRole("status")).toHaveTextContent("This answer doesn't address the question.");
  });

  it("reassures the user that the answer is saved when grading is unavailable", () => {
    renderCard({ ...base, status: "grading_unavailable", answer: "My answer" });

    expect(screen.getByRole("status")).toHaveTextContent("Your answer is saved");
  });

  it("says when the question comes from the question bank", () => {
    renderCard({ ...base, questionSource: "question_bank", status: "unanswered" });

    expect(screen.getByText(/from our question bank/i)).toBeInTheDocument();
  });
});
