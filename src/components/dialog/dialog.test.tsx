import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("opens as a modal named by its title", () => {
    render(
      <Dialog title="Add application" onClose={vi.fn()}>
        <p>Content</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Add application" })).toHaveAttribute("open");
  });

  it("asks to close from the close button and when the browser closes it (Escape)", async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Add application" onClose={onClose}>
        <p>Content</p>
      </Dialog>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    fireEvent(screen.getByRole("dialog"), new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
