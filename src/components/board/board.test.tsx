import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockJobs } from "../../mocks/jobs";
import { STATUSES } from "../../types/job";
import { Board } from "./board";

function renderBoard(onMoveJob = vi.fn()) {
  render(
    <Board statuses={STATUSES} jobs={mockJobs} onEditJob={vi.fn()} onPractiseJob={vi.fn()} onMoveJob={onMoveJob} />,
  );
  return { onMoveJob };
}

/** jsdom has no DataTransfer, so we pass a minimal stand-in to the drag events. */
function createDataTransfer() {
  const data = new Map<string, string>();
  return {
    get types() {
      return [...data.keys()];
    },
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? "",
    effectAllowed: "all",
  };
}

describe("Board", () => {
  it("shows one labelled column per status, in order", () => {
    renderBoard();

    const columnNames = screen.getAllByRole("region").map((column) => column.getAttribute("aria-label"));

    expect(columnNames).toEqual(["Saved", "Applied", "Interviewing", "Offered", "Rejected"]);
  });

  it("puts each application in the column for its status", () => {
    renderBoard();

    const interviewing = screen.getByRole("region", { name: "Interviewing" });
    const rejected = screen.getByRole("region", { name: "Rejected" });

    expect(within(interviewing).getByRole("article", { name: "Product Engineer at Bright Labs" })).toBeInTheDocument();
    expect(within(rejected).getByText("No applications")).toBeInTheDocument();
  });

  it("moves a card when it is dropped on another column", () => {
    const { onMoveJob } = renderBoard();
    const card = screen.getByRole("article", { name: "Frontend Developer at Acme Technologies" });
    const appliedColumn = screen.getByRole("region", { name: "Applied" });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(appliedColumn, { dataTransfer });
    fireEvent.drop(appliedColumn, { dataTransfer });

    expect(onMoveJob).toHaveBeenCalledWith(mockJobs[0]?.id, "applied");
  });

  it("ignores things dropped on a column that are not job cards", () => {
    const { onMoveJob } = renderBoard();
    const dataTransfer = createDataTransfer();
    dataTransfer.setData("text/plain", "some selected text");

    fireEvent.drop(screen.getByRole("region", { name: "Applied" }), { dataTransfer });

    expect(onMoveJob).not.toHaveBeenCalled();
  });
});
