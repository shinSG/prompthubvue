import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiTestModal } from "../../../src/renderer/components/prompt/AiTestModal";
import { ToastProvider } from "../../../src/renderer/components/ui/Toast";
import { useSettingsStore } from "../../../src/renderer/stores/settings.store";
import type { Prompt } from "@prompthub/shared/types";
import { renderWithI18n } from "../../helpers/i18n";

const mocks = vi.hoisted(() => ({
  chatCompletion: vi.fn(),
  getPromptVersions: vi.fn(),
}));

vi.mock("../../../src/renderer/services/ai", () => ({
  chatCompletion: mocks.chatCompletion,
  buildMessagesFromPrompt: (systemPrompt: string, userPrompt: string) => [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  multiModelCompare: vi.fn(),
  generateImage: vi.fn(),
}));

vi.mock("../../../src/renderer/services/database", () => ({
  getPromptVersions: mocks.getPromptVersions,
}));

const prompt: Prompt = {
  id: "prompt-1",
  title: "Screenshot Analyzer",
  systemPrompt: "You inspect product screenshots.",
  userPrompt: "Describe {{feature}} in the attached image.",
  variables: [],
  tags: [],
  isFavorite: false,
  isPinned: false,
  version: 1,
  currentVersion: 1,
  usageCount: 0,
  createdAt: new Date("2026-05-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-05-01T00:00:00.000Z").toISOString(),
};

describe("AiTestModal workbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPromptVersions.mockResolvedValue([]);
    mocks.chatCompletion.mockResolvedValue({ content: "default response" });
    useSettingsStore.setState({
      aiModels: [
        {
          id: "chat-model-1",
          type: "chat",
          name: "Stable Judge",
          provider: "openai",
          apiProtocol: "openai",
          apiKey: "test-key",
          apiUrl: "https://example.test/v1",
          model: "gpt-test",
          chatParams: { stream: false },
        },
      ],
      scenarioModelDefaults: { promptTest: "chat-model-1" },
    } as never);
  });

  it("renders the unified test drawer with variables and compare mode for text prompts", async () => {
    await renderWithI18n(
      <ToastProvider>
        <AiTestModal
          isOpen
          onClose={vi.fn()}
          prompt={prompt}
          initialMode="compare"
        />
      </ToastProvider>,
      { language: "en" },
    );

    expect(screen.getByText("Screenshot Analyzer")).toBeInTheDocument();
    expect(screen.queryByText("Reference Images")).not.toBeInTheDocument();
    expect(screen.queryByText("Add Images")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Multi-Model Compare" })).toHaveClass("bg-primary");
    expect(screen.getByText("{{feature}}")).toBeInTheDocument();
  });

  it("shows reference image controls only for image prompts", async () => {
    await renderWithI18n(
      <ToastProvider>
        <AiTestModal
          isOpen
          onClose={vi.fn()}
          prompt={{
            ...prompt,
            id: "image-prompt-1",
            promptType: "image",
            images: ["reference.png"],
          }}
        />
      </ToastProvider>,
      { language: "en" },
    );

    expect(screen.getByText("Reference Images")).toBeInTheDocument();
    expect(screen.getByText("Add Images")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("compares multiple prompt versions against the same selected model without saving responses", async () => {
    const user = userEvent.setup();
    const onSaveResponse = vi.fn();
    const onUsageIncrement = vi.fn();

    mocks.getPromptVersions.mockResolvedValue([
      {
        id: "version-1",
        promptId: prompt.id,
        version: 1,
        systemPrompt: "You inspect product screenshots.",
        userPrompt: "Describe {{feature}} from version one.",
        variables: [],
        createdAt: new Date("2026-04-30T00:00:00.000Z").toISOString(),
      },
    ]);
    mocks.chatCompletion
      .mockResolvedValueOnce({ content: "current version response" })
      .mockResolvedValueOnce({ content: "historical version response" });
    useSettingsStore.setState({
      aiModels: [
        {
          id: "chat-model-1",
          type: "chat",
          name: "Stable Judge",
          provider: "openai",
          apiProtocol: "openai",
          apiKey: "test-key",
          apiUrl: "https://example.test/v1",
          model: "gpt-test",
          chatParams: { stream: true, enableThinking: true },
        },
      ],
      scenarioModelDefaults: { promptTest: "chat-model-1" },
    } as never);

    await renderWithI18n(
      <ToastProvider>
        <AiTestModal
          isOpen
          onClose={vi.fn()}
          prompt={{ ...prompt, version: 2, currentVersion: 2 }}
          onSaveResponse={onSaveResponse}
          onUsageIncrement={onUsageIncrement}
        />
      </ToastProvider>,
      { language: "en" },
    );

    await user.type(screen.getByPlaceholderText("Enter value"), "pricing panel");
    await user.click(screen.getByRole("button", { name: "Version Result Compare" }));

    await screen.findByRole("button", { name: "v2" });
    await screen.findByRole("button", { name: "v1" });
    await user.click(screen.getByRole("button", { name: "Compare 2 Versions" }));

    await waitFor(() => {
      expect(mocks.chatCompletion).toHaveBeenCalledTimes(2);
    });

    const firstCall = mocks.chatCompletion.mock.calls[0];
    const secondCall = mocks.chatCompletion.mock.calls[1];
    expect(firstCall[0]).toMatchObject({ id: "chat-model-1", model: "gpt-test" });
    expect(secondCall[0]).toMatchObject({ id: "chat-model-1", model: "gpt-test" });
    expect(firstCall[2]).toMatchObject({ stream: true, enableThinking: true });
    expect(secondCall[2]).toMatchObject({ stream: true, enableThinking: true });
    expect(firstCall[2].streamCallbacks).toEqual(expect.any(Object));
    expect(secondCall[2].streamCallbacks).toEqual(expect.any(Object));
    expect(firstCall[1]).toEqual([
      { role: "system", content: "You inspect product screenshots." },
      { role: "user", content: "Describe pricing panel in the attached image." },
    ]);
    expect(secondCall[1]).toEqual([
      { role: "system", content: "You inspect product screenshots." },
      { role: "user", content: "Describe pricing panel from version one." },
    ]);

    expect(await screen.findByText("current version response")).toBeInTheDocument();
    expect(await screen.findByText("historical version response")).toBeInTheDocument();
    expect(onUsageIncrement).toHaveBeenCalledTimes(1);
    expect(onUsageIncrement).toHaveBeenCalledWith(prompt.id);
    expect(onSaveResponse).not.toHaveBeenCalled();
  });
});
