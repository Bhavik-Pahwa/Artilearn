import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ResourceProvider } from "../providers/resourceProvider";
import type { ResourceDirectory } from "../types";
import { ResourcesPanel } from "./ResourcesPanel";

const emptyDirectory: ResourceDirectory = {
  entries: [],
  status: {
    providerId: "fresources",
    status: "ready",
    checkedOn: "2026-10-14",
    mode: "verified-entry-points",
  },
};

describe("ResourcesPanel states", () => {
  it("renders an honest empty state when no verified entries exist", async () => {
    const provider: ResourceProvider = {
      getDirectory: vi.fn().mockResolvedValue(emptyDirectory),
    };

    render(<ResourcesPanel provider={provider} />);

    expect(await screen.findByText("No verified entry points are available.")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows provider failure and retries the same provider", async () => {
    const getDirectory = vi
      .fn<ResourceProvider["getDirectory"]>()
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce(emptyDirectory);
    const provider: ResourceProvider = { getDirectory };

    render(<ResourcesPanel provider={provider} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Fresources is temporarily unavailable.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(getDirectory).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No verified entry points are available.")).toBeInTheDocument();
  });

  it("never renders unsafe outbound URLs", async () => {
    const provider: ResourceProvider = {
      getDirectory: vi.fn().mockResolvedValue({
        ...emptyDirectory,
        entries: [
          {
            id: "unsafe",
            providerId: "fresources",
            institution: "DTU",
            title: "Unsafe",
            canonicalUrl: "https://example.com/resource",
            kind: "institution-entry-point",
            verifiedOn: "2026-10-14",
          },
        ],
      }),
    };

    render(<ResourcesPanel provider={provider} />);

    expect(await screen.findByText("DTU")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open on Fresources/i })).not.toBeInTheDocument();
  });
});
