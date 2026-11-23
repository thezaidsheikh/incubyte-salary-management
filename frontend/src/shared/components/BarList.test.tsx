import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BarList from "./BarList";

describe("BarList", () => {
  it("renders each row with count and labelled average", () => {
    render(
      <BarList
        rows={[
          { name: "Engineering", count: 100, averageUsd: 5000 },
          { name: "Design", count: 50, averageUsd: 4000 },
        ]}
        valueLabel="avg"
      />,
    );
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("100 · avg $5,000")).toBeInTheDocument();
    expect(screen.getByText("50 · avg $4,000")).toBeInTheDocument();
  });

  it("scales bars to the largest count", () => {
    const { container } = render(
      <BarList
        rows={[
          { name: "Engineering", count: 100, averageUsd: 5000 },
          { name: "Design", count: 50, averageUsd: 4000 },
        ]}
        valueLabel="avg"
      />,
    );
    const bars = container.querySelectorAll(".bg-indigo-600");
    expect(bars).toHaveLength(2);
    expect((bars[0] as HTMLElement).style.width).toBe("100%");
    expect((bars[1] as HTMLElement).style.width).toBe("50%");
  });

  it("renders an undefined average without crashing", () => {
    // React renders `undefined` as nothing, so the line ends after "$".
    render(<BarList rows={[{ name: "Support", count: 3 }]} valueLabel="avg" />);
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText(/3 · avg \$/)).toBeInTheDocument();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<BarList rows={[]} valueLabel="avg" />);
    expect(container.firstChild?.childNodes.length).toBe(0);
  });
});
