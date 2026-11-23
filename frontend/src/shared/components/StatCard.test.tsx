import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders label, value and sub-line", () => {
    render(<StatCard label="Headcount" value="10,000" sub="Active employees" />);
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
    expect(screen.getByText("Active employees")).toBeInTheDocument();
  });

  it("omits the sub-line when no sub is given", () => {
    const { container } = render(<StatCard label="Headcount" value="10,000" />);
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
    // Only the label and value divs exist — no third (sub) line.
    expect(container.querySelectorAll("div").length).toBe(3);
  });
});
