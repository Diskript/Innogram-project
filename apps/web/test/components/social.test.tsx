import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import "@/test/mocks/contexts";
import { renderWithProviders } from "@/test/render-with-providers";
import { makeUser, USER_ID } from "@/test/factories";
import { UserRow } from "@/components/social/user-row";
import { FollowButton } from "@/components/social/follow-button";
import { MentionText } from "@/components/social/mention-text";
import { MentionInput } from "@/components/social/mention-input";
import { UserListPage } from "@/components/social/user-list-page";
import {
  getFollowStatus,
  getUserFollowers,
  searchUsers,
  toggleFollow,
} from "@/lib/social";

jest.mock("@/lib/social", () => ({
  getFollowStatus: jest.fn(),
  toggleFollow: jest.fn(),
  getUserFollowers: jest.fn(),
  getUserFollowing: jest.fn(),
  searchUsers: jest.fn(),
}));

const followUser = {
  ...makeUser(),
  bio: "hello",
  isPublic: true,
};

describe("social components", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("UserRow", () => {
    it("renders display name and username link", () => {
      renderWithProviders(<UserRow user={followUser} />);
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("@testuser")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Test User" })).toHaveAttribute(
        "href",
        "/profile/testuser",
      );
    });

    it("shows accept and reject actions for follow requests", async () => {
      const onAccept = jest.fn();
      const onReject = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(
        <UserRow
          user={followUser}
          showAcceptReject={true}
          onAccept={onAccept}
          onReject={onReject}
        />,
      );
      await user.click(
        screen.getByRole("button", { name: "Accept Test User" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Reject Test User" }),
      );
      expect(onAccept).toHaveBeenCalledWith(USER_ID);
      expect(onReject).toHaveBeenCalledWith(USER_ID);
    });

    it("renders a follow button when requested", async () => {
      jest
        .mocked(getFollowStatus)
        .mockResolvedValue({ status: "none" } as never);
      renderWithProviders(<UserRow user={followUser} showFollow={true} />);
      expect(
        await screen.findByRole("button", { name: /Follow/ }),
      ).toBeInTheDocument();
    });
  });

  describe("FollowButton", () => {
    it("shows Follow for status none and toggles on click", async () => {
      jest.mocked(getFollowStatus).mockResolvedValue({ status: "none" });
      jest
        .mocked(toggleFollow)
        .mockResolvedValue({ action: "followed" } as never);
      const user = userEvent.setup();
      renderWithProviders(<FollowButton userId={USER_ID} />);
      const button = await screen.findByRole("button", { name: /Follow/ });
      await user.click(button);
      await waitFor(() => {
        expect(toggleFollow).toHaveBeenCalledWith(USER_ID);
      });
    });

    it("shows Unfollow for status following", async () => {
      jest.mocked(getFollowStatus).mockResolvedValue({ status: "following" });
      renderWithProviders(<FollowButton userId={USER_ID} />);
      expect(
        await screen.findByRole("button", { name: /Unfollow/ }),
      ).toBeInTheDocument();
    });

    it("shows a disabled Requested state for pending", async () => {
      jest.mocked(getFollowStatus).mockResolvedValue({ status: "pending" });
      renderWithProviders(<FollowButton userId={USER_ID} />);
      expect(
        await screen.findByRole("button", { name: /Requested/ }),
      ).toBeDisabled();
    });

    it("renders nothing for status self", async () => {
      jest.mocked(getFollowStatus).mockResolvedValue({ status: "self" });
      const { container } = renderWithProviders(
        <FollowButton userId={USER_ID} />,
      );
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });

  describe("MentionText", () => {
    it("renders mentions as profile links and plain text otherwise", () => {
      renderWithProviders(<MentionText content="hey @bob check this" />);
      const mention = screen.getByText("@bob");
      expect(mention).toHaveAttribute("href", "/profile/bob");
      const paragraph = mention.closest("p");
      expect(paragraph?.textContent).toBe("hey @bob check this");
    });

    it("renders plain text without mentions", () => {
      renderWithProviders(<MentionText content="no mentions here" />);
      expect(screen.getByText("no mentions here")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("MentionInput", () => {
    it("renders a textarea bound to value", () => {
      renderWithProviders(
        <MentionInput
          value={"typed"}
          onChange={() => {}}
          placeholder="Write..."
        />,
      );
      expect(screen.getByDisplayValue("typed")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Write...")).toBeInTheDocument();
    });

    it("calls onChange with each keystroke", async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      renderWithProviders(<MentionInput value={""} onChange={onChange} />);
      await user.type(screen.getByRole("textbox"), "hi");
      expect(onChange).toHaveBeenCalledWith("h");
      expect(onChange).toHaveBeenCalledWith("i");
    });

    it("opens mention suggestions after typing @ and completes on click", async () => {
      function Harness() {
        const [value, setValue] = useState("");
        return <MentionInput value={value} onChange={setValue} />;
      }
      jest.mocked(searchUsers).mockResolvedValue({
        data: [
          makeUser({
            id: "u2",
            userName: "bob",
            displayName: "Bob Builder",
          }),
        ],
      } as never);
      const user = userEvent.setup();
      renderWithProviders(<Harness />);
      await user.type(screen.getByRole("textbox"), "hello @bo");
      const suggestion = await screen.findByText("Bob Builder");
      await user.click(suggestion);
      await waitFor(() => {
        expect(screen.getByRole("textbox")).toHaveValue("hello @bob ");
      });
    });
  });

  describe("UserListPage", () => {
    it("renders the heading with username link and rows", async () => {
      jest.mocked(getUserFollowers).mockResolvedValue({
        data: [followUser],
        total: 1,
        skip: 0,
        take: 20,
      });
      renderWithProviders(
        <UserListPage userId={USER_ID} username="testuser" mode="followers" />,
      );
      expect(await screen.findByText("Followers")).toBeInTheDocument();
      expect(await screen.findByText("Test User")).toBeInTheDocument();
      expect(screen.getAllByText("@testuser")).toHaveLength(2);
    });

    it("shows the empty state without followers", async () => {
      jest.mocked(getUserFollowers).mockResolvedValue({
        data: [],
        total: 0,
        skip: 0,
        take: 20,
      });
      renderWithProviders(<UserListPage userId={USER_ID} mode="followers" />);
      expect(await screen.findByText("No followers yet")).toBeInTheDocument();
    });
  });
});
